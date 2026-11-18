import { and, asc, countDistinct, desc, eq, inArray, isNull, sql } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { OrderByDirectionEnum, PAGINATION_LIMIT_DEFAULT, PAGINATION_PAGE_DEFAULT } from "@/constants/database"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import { type UsersStatusEnum } from "@/constants/users"
import { type db } from "@/server/db"
import {
  type CampaignUserSelect,
  type CasesTransaction,
  type OrganizationUser,
  type ParticipantParentUserSelect,
  type PaymentLog,
  type User,
  campaignsUsers,
  casesTransactions,
  organizationsUsers,
  participantParentUsers,
  paymentLogs,
  users,
} from "@/server/db/schema"
import { getOrderByClause, getPagination, getPaginationOffset } from "@/utils/database"

import {
  buildCampaignsUsersWhereClause,
  organizationsUsersJoinCondition,
  parentUsersAlias as parentUsers,
} from "./campaigns-users-filter-clause"

export type CampaignsUsersListPaginatedByCampaignIdInput = {
  campaignId: string
  organizationId: string
  page?: number
  limit?: number
  search?: string
  grade?: string
  teacherName?: string
  permissionSlipSigned?: boolean
  eligible?: boolean
  parentUserStatus?: UsersStatusEnum
  orderBy?: string
  orderDirection?: OrderByDirectionEnum
}

type AggregatedUserData = {
  userId: string
  parentUserId: string | null
  campaignUser: CampaignUserSelect
  organizationUser: OrganizationUser | null
  paymentLogs: Map<string, PaymentLog>
  casesTransactions: Map<string, CasesTransaction>
}

export type CampaignUserWithComputedFields = CampaignUserSelect & {
  user?: User & {
    parentUser?: User | null
  }
  parentMappings?: Array<ParticipantParentUserSelect & { parentUser: User }>
  eligible: boolean
  casesCheckedOutQuantity: number
  lastCaseTransactionAt: Date | null
  totalPaidCents: number
  totalOwedCents: number
  balanceOwedCents: number
}

export const campaignsUsersListPaginatedByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: CampaignsUsersListPaginatedByCampaignIdInput
}) => {
  const {
    campaignId,
    organizationId,
    page = PAGINATION_PAGE_DEFAULT,
    limit = PAGINATION_LIMIT_DEFAULT,
    search = "",
    grade,
    teacherName,
    permissionSlipSigned,
    eligible,
    parentUserStatus,
    orderBy = "fullName",
    orderDirection = OrderByDirectionEnum.ASC,
  } = input

  const offset = getPaginationOffset(page, limit)

  const paymentLogsJoinCondition = and(
    eq(paymentLogs.userId, campaignsUsers.userId),
    eq(paymentLogs.campaignId, campaignId),
    eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED)
  )

  const casesTransactionsJoinCondition = and(
    eq(casesTransactions.userId, campaignsUsers.userId),
    eq(casesTransactions.campaignId, campaignId),
    eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
  )

  const organizationsUsersJoinConditionClause = organizationsUsersJoinCondition(organizationId)

  const whereClause = buildCampaignsUsersWhereClause({
    campaignId,
    organizationId,
    search,
    grade,
    teacherName,
    permissionSlipSigned,
    eligible,
    parentUserStatus,
  })

  const aggregateOrderColumns = {
    paymentLogs_amountCents: sql<number>`COALESCE(SUM(${paymentLogs.amountCents}), 0)`,
    casesTransactions_quantity: sql<number>`COALESCE(SUM(${casesTransactions.quantity}), 0)`,
    casesTransactions_totalPriceCents: sql<number>`COALESCE(SUM(${casesTransactions.totalPriceCents}), 0)`,
  }

  const totalOwedSubquery = sql`COALESCE((
    SELECT SUM(${casesTransactions.totalPriceCents}) FROM ${casesTransactions}
    WHERE ${casesTransactionsJoinCondition}
  ), 0)`

  const totalPaidSubquery = sql`COALESCE((
    SELECT SUM(${paymentLogs.amountCents}) FROM ${paymentLogs}
    WHERE ${paymentLogsJoinCondition} AND ${isNull(paymentLogs.deletedAt)}
  ), 0)`

  const isAggregateOrder = orderBy in aggregateOrderColumns

  const shouldIncludePaymentLogs = !isAggregateOrder || orderBy === "paymentLogs_amountCents"

  const tableNameMap = {
    user: "users",
    organizationsUsers: "organizationsUsers",
    casesTransactions: "casesTransactions",
    paymentLogs: "paymentLogs",
    default: "campaignsUsers",
  }
  const tableName = tableNameMap[orderBy?.split("_")[0] as keyof typeof tableNameMap] ?? tableNameMap.default

  const orderByClause = getOrderByClause({
    tableName,
    orderBy: orderBy.split("_").pop(),
    orderDirection,
    naturalSorting: orderBy === "user_grade",
  })

  const buildCountQuery = () => {
    const query = database
      .select({ count: countDistinct(campaignsUsers.userId) })
      .from(campaignsUsers)
      .innerJoin(users, eq(campaignsUsers.userId, users.id))
      .leftJoin(parentUsers, eq(users.parentUserId, parentUsers.id))
      .innerJoin(organizationsUsers, organizationsUsersJoinConditionClause)

    if (shouldIncludePaymentLogs) {
      query.leftJoin(paymentLogs, paymentLogsJoinCondition)
    }

    return query.leftJoin(casesTransactions, casesTransactionsJoinCondition).where(whereClause)
  }

  const buildAggregateQuery = () => {
    const aggregateQuery = database
      .select({
        campaignUser: campaignsUsers,
        userId: users.id,
        parentUserId: users.parentUserId,
      })
      .from(campaignsUsers)
      .innerJoin(users, eq(campaignsUsers.userId, users.id))
      .leftJoin(parentUsers, eq(users.parentUserId, parentUsers.id))
      .innerJoin(organizationsUsers, organizationsUsersJoinConditionClause)

    if (shouldIncludePaymentLogs) {
      aggregateQuery.leftJoin(paymentLogs, paymentLogsJoinCondition)
    }

    return aggregateQuery
      .leftJoin(casesTransactions, casesTransactionsJoinCondition)
      .where(whereClause)
      .groupBy(campaignsUsers.id, users.id, users.parentUserId)
      .orderBy(
        orderDirection === OrderByDirectionEnum.ASC
          ? asc(aggregateOrderColumns[orderBy as keyof typeof aggregateOrderColumns])
          : desc(aggregateOrderColumns[orderBy as keyof typeof aggregateOrderColumns])
      )
      .limit(limit)
      .offset(offset)
  }

  const parentUserStatusOrderClause =
    orderBy === "user_parentUser_status"
      ? [
          orderDirection === OrderByDirectionEnum.ASC
            ? asc(sql`${parentUsers.status}::text`)
            : desc(sql`${parentUsers.status}::text`),
        ]
      : null

  // Mirrors balanceOwedCents below: checkout total price minus completed, non-deleted payments, floored at 0.
  // Uses subqueries because joining both tables in one query would multiply the rows being summed.
  const balanceOwedOrderClause =
    orderBy === "balanceOwed"
      ? [
          orderDirection === OrderByDirectionEnum.ASC
            ? asc(sql`GREATEST(${totalOwedSubquery} - ${totalPaidSubquery}, 0)`)
            : desc(sql`GREATEST(${totalOwedSubquery} - ${totalPaidSubquery}, 0)`),
        ]
      : null

  const buildNonAggregateQuery = () => {
    return database
      .select({
        campaignUser: campaignsUsers,
        userId: users.id,
        parentUserId: users.parentUserId,
      })
      .from(campaignsUsers)
      .innerJoin(users, eq(campaignsUsers.userId, users.id))
      .leftJoin(parentUsers, eq(users.parentUserId, parentUsers.id))
      .innerJoin(organizationsUsers, organizationsUsersJoinConditionClause)
      .where(whereClause)
      .orderBy(...(parentUserStatusOrderClause ?? balanceOwedOrderClause ?? orderByClause))
      .limit(limit)
      .offset(offset)
  }

  const [[countResult], paginatedUsers] = await Promise.all([
    buildCountQuery(),

    isAggregateOrder ? buildAggregateQuery() : buildNonAggregateQuery(),
  ])

  const campaignUsersIds = paginatedUsers.map(cu => cu.userId)
  const parentUserIds = paginatedUsers.map(cu => cu.parentUserId).filter(Boolean) as string[]

  // Batch-query participant_parent_mapping for all paginated participants
  const participantMappingsRaw = campaignUsersIds.length
    ? await database
        .select()
        .from(participantParentUsers)
        .where(inArray(participantParentUsers.participantUserId, campaignUsersIds))
    : []

  const mappingParentUserIds = [...new Set(participantMappingsRaw.map(m => m.parentUserId).filter(Boolean))] as string[]

  const [usersData, parentUsersData, mappingParentUsersData, joinedDataRows] = await Promise.all([
    database.select().from(users).where(inArray(users.id, campaignUsersIds)),
    parentUserIds.length ? database.select().from(users).where(inArray(users.id, parentUserIds)) : Promise.resolve([]),
    mappingParentUserIds.length
      ? database.select().from(users).where(inArray(users.id, mappingParentUserIds))
      : Promise.resolve([]),
    database
      .select({
        userId: users.id,
        parentUserId: users.parentUserId,
        campaignUser: campaignsUsers,
        organizationUser: organizationsUsers,
        paymentLog: paymentLogs,
        casesTransaction: casesTransactions,
      })
      .from(campaignsUsers)
      .innerJoin(users, eq(campaignsUsers.userId, users.id))
      .innerJoin(organizationsUsers, organizationsUsersJoinConditionClause)
      .leftJoin(paymentLogs, paymentLogsJoinCondition)
      .leftJoin(casesTransactions, casesTransactionsJoinCondition)
      .where(and(inArray(campaignsUsers.userId, campaignUsersIds), eq(campaignsUsers.organizationId, organizationId))),
  ])

  const usersById = new Map(usersData.map(u => [u.id, u]))
  const parentUsersById = new Map(parentUsersData.map(u => [u.id, u]))
  const mappingParentUsersById = new Map(mappingParentUsersData.map(u => [u.id, u]))

  // Group mappings by participantUserId, attaching parent user data
  const mappingsByParticipantId = participantMappingsRaw.reduce<
    Map<string, Array<ParticipantParentUserSelect & { parentUser: User }>>
  >((acc, mapping) => {
    const parentUser = mappingParentUsersById.get(mapping.parentUserId)
    if (!parentUser) return acc
    if (!acc.has(mapping.participantUserId)) acc.set(mapping.participantUserId, [])
    acc.get(mapping.participantUserId)!.push({ ...mapping, parentUser })
    return acc
  }, new Map())

  const aggregatedByUserId = joinedDataRows.reduce<Map<string, AggregatedUserData>>((acc, row) => {
    const userId = row.userId

    if (!acc.has(userId)) {
      acc.set(userId, {
        userId: row.userId,
        parentUserId: row.parentUserId,
        campaignUser: row.campaignUser,
        organizationUser: row.organizationUser ?? null,
        paymentLogs: new Map(),
        casesTransactions: new Map(),
      })
    }

    const entry = acc.get(userId)!

    if (row.organizationUser?.id && !entry.organizationUser) {
      entry.organizationUser = row.organizationUser
    }

    if (row.paymentLog?.id) {
      entry.paymentLogs.set(row.paymentLog.id, row.paymentLog)
    }

    if (row.casesTransaction?.id) {
      entry.casesTransactions.set(row.casesTransaction.id, row.casesTransaction)
    }

    return acc
  }, new Map())

  const campaignUsers = paginatedUsers.map(({ userId, parentUserId }): CampaignUserWithComputedFields => {
    const aggregatedData = aggregatedByUserId.get(userId)
    const user = usersById.get(userId)
    const legacyParentUser = parentUserId ? parentUsersById.get(parentUserId) : null
    const parentMappings = mappingsByParticipantId.get(userId) ?? []
    const parentUser = legacyParentUser ?? parentMappings[0]?.parentUser ?? null

    const paymentLogsArray = Array.from(aggregatedData?.paymentLogs.values() ?? [])
    const casesTransactionsArray = Array.from(aggregatedData?.casesTransactions.values() ?? [])

    const eligible = aggregatedData?.organizationUser?.eligible ?? false

    const casesCheckedOutQuantity = casesTransactionsArray.reduce(
      (acc, transaction) => acc + (transaction.quantity ?? 0),
      0
    )

    const lastCaseTransactionAt =
      casesTransactionsArray.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0]
        ?.createdAt ?? null

    const totalPaidCents = paymentLogsArray
      .filter(log => log.deletedAt === null)
      .reduce((acc, log) => acc + (log.amountCents ?? 0), 0)

    const totalOwedCents = casesTransactionsArray.reduce(
      (acc, transaction) => acc + (transaction.totalPriceCents ?? 0),
      0
    )

    const balanceOwedCents = Math.max(totalOwedCents - totalPaidCents, 0)

    return {
      ...aggregatedData?.campaignUser,
      user: user
        ? {
            ...user,
            parentUser: parentUser ?? null,
          }
        : undefined,
      parentMappings,
      eligible,
      casesCheckedOutQuantity,
      lastCaseTransactionAt,
      totalPaidCents,
      totalOwedCents,
      balanceOwedCents,
    } as CampaignUserWithComputedFields
  })

  return {
    data: campaignUsers,
    pagination: getPagination({ page, limit, total: countResult?.count ?? 0 }),
  }
}
