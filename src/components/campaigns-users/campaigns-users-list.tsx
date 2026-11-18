"use client"

import type { ColumnDef, Table as TableInstance } from "@tanstack/react-table"
import {
  ChevronDown,
  // DollarSign,
  Ellipsis,
  FileDown,
  FileSpreadsheet,
  FileText,
  Mail,
  MailPlus,
  PackagePlus,
  PenLine,
  PenOff,
  QrCode,
  Receipt,
  TriangleAlert,
  UserPlus,
} from "lucide-react"
import posthog from "posthog-js"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type ReactNode } from "react"
import { toast } from "sonner"

import { CampaignQRCodeModal } from "@/components/campaigns/campaign-qr-code-modal"
import { DataTable, DataTableCell, DataTableColumnHeader } from "@/components/data-table"
import { DocumentsSendEmail } from "@/components/documents/documents-send-email"
import { OrganizationsParticipantsCreate } from "@/components/organizations-users/organizations-participants"
import { CasesCheckoutForm } from "@/components/tracking/cases-checkout-form"
import { CasesGroupCheckoutForm } from "@/components/tracking/cases-group-checkout-form"
import { LogCashPaymentForm } from "@/components/tracking/log-cash-payment-form"
import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { WithTooltip } from "@/components/ui/tooltip"
import { APP_NAME } from "@/constants/app"
import { COLOR_MAP } from "@/constants/colors"
import { PAGINATION_LIMIT_MAX } from "@/constants/database"
import { DocumentsTypeEnum } from "@/constants/documents"
import { GRADE_LABEL, IS_LABEL_CHANGE_ENABLED, TEACHER_LABEL } from "@/constants/participant-labels"
import { CampaignsUsersPermissionsEnum } from "@/constants/permissions"
import { USER_STATUS_DETAILS, UsersStatusEnum } from "@/constants/users"
import { useDataTablePaginationQueryState, useDataTableQueryStates, useLoggedInUser } from "@/hooks"
import type { CampaignUserWithComputedFields } from "@/server/services/campaigns-users"
import { usePermissionsStore } from "@/stores/permissions-store"
import { TRPC_QUERY_ID_CHUNK_SIZE, api } from "@/trpc/react"
import { chunkArray } from "@/utils/array"
import { cn } from "@/utils/cn"
import { toastError } from "@/utils/errors"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { formatCentsToCurrency, getMoneyProgressAndValueClassName } from "@/utils/money"
import { firstLetterUpperCase, naturalSort } from "@/utils/string"
import { getUserDisplayName, maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

import { CampaignsUsersActions } from "./campaigns-users-actions"
import { CampaignsUsersSelectionBar } from "./campaigns-users-selection-bar"
import { CampaignsUsersSignPermissionSlip } from "./campaigns-users-sign-permission-slip"

interface CampaignsUsersListProps {
  campaignId: string
  organizationId: string
  campaignIsActive: boolean
  campaignHasDigitalPayment: boolean
}

async function fetchByUserIdsInChunks<T>(
  userIds: string[],
  fetcher: (userIds: string[]) => Promise<T[]>
): Promise<T[]> {
  const results = await Promise.all(chunkArray(userIds, TRPC_QUERY_ID_CHUNK_SIZE).map(chunk => fetcher(chunk)))
  return results.flat()
}

export function CampaignsUsersList({
  campaignId,
  organizationId,
  campaignIsActive,
  campaignHasDigitalPayment,
}: CampaignsUsersListProps) {
  const { queryPagination } = useDataTablePaginationQueryState({
    limit: PAGINATION_LIMIT_MAX,
  })
  const { querySearch, queryFilters, querySort } = useDataTableQueryStates({
    id: "campaigns-users-list-",
    defaultOrderBy: "user_fullName",
  })
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const { mutateAsync: createAccessLog } = api.participantNamesAccess.logAccessEvent.useMutation()
  const hasLoggedAccess = useRef(false)

  const utils = api.useUtils()
  const { user, loggedInRole: role, loggedInUserId } = useLoggedInUser()
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [casesGroupCheckoutUserIds, setCasesGroupCheckoutUserIds] = useState<string[]>([])
  const [deleteCampaignsUsersIds, setDeleteCampaignsUsersIds] = useState<string[]>([])
  const [sendEmailPermissionSlip, setSendEmailPermissionSlip] = useState<CampaignUserWithComputedFields | null>(null)
  const [sendInviteEmailParents, setSendInviteEmailParents] = useState<
    { id: string; email: string | null | undefined }[] | null
  >(null)
  const tableInstanceRef = useRef<TableInstance<CampaignUserWithComputedFields> | null>(null)
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<FileReportType | null>(null)
  const campaignsUsersFilters = {
    campaignId,
    organizationId,
    search: querySearch ?? "",
    grade: queryFilters?.["user.grade"]?.[0] as string,
    teacherName: queryFilters?.["user.teacherName"]?.[0] as string,
    permissionSlipSigned: queryFilters?.permissionSlipSigned?.length
      ? !!queryFilters?.permissionSlipSigned[0]
      : undefined,
    eligible: queryFilters?.eligible?.length ? !!queryFilters?.eligible[0] : undefined,
    parentUserStatus: (() => {
      const value = queryFilters?.["user.parentUser.status"]?.[0]
      return value && Object.values(UsersStatusEnum).includes(value as UsersStatusEnum)
        ? (value as UsersStatusEnum)
        : undefined
    })(),
  }

  const { data: campaignsUsersData, isLoading: isCampaignsUsersLoading } =
    api.campaignsUsers.listPaginatedByCampaignId.useQuery({
      ...campaignsUsersFilters,
      ...queryPagination,
      ...querySort,
    })
  const { data: documents, isLoading: isDocumentsLoading } = api.documents.listByCampaignId.useQuery({ campaignId })
  const { data: grades = [], isLoading: isGradesLoading } = api.campaignsUsers.listGradesByCampaignId.useQuery({
    campaignId,
  })
  const { data: teacherNames = [], isLoading: isTeacherNamesLoading } =
    api.campaignsUsers.listTeacherNamesByCampaignId.useQuery({ campaignId })
  const { data: allUserIds = [], isLoading: isAllUserIdsLoading } =
    api.campaignsUsers.listUserIdsByCampaignId.useQuery(campaignsUsersFilters)

  const isLoading =
    isCampaignsUsersLoading || isDocumentsLoading || isGradesLoading || isTeacherNamesLoading || isAllUserIdsLoading

  // Capture campaign participant stats once per campaign load
  const hasCapturedStats = useRef(false)
  const fileTypeMap: Record<FileReportType, "CSV" | "EXCEL"> = {
    [FileReportType.CSV]: "CSV",
    [FileReportType.EXCEL]: "EXCEL",
  }
  useEffect(() => {
    if (!participantAccessData?.isGranted) return
    if (hasLoggedAccess.current) return

    hasLoggedAccess.current = true

    createAccessLog({
      campaignId,
      eventType: "VIEW_PARTICIPANT_NAMES",
    })
  }, [participantAccessData?.isGranted, campaignId])

  useEffect(() => {
    if (hasCapturedStats.current) return
    if (isCampaignsUsersLoading || isDocumentsLoading) return
    if (!campaignsUsersData?.data) return
    const participants = campaignsUsersData.data
    const totalParticipants = participants.length

    const statusPriority: Record<string, number> = {
      [UsersStatusEnum.ACTIVE]: 0,
      [UsersStatusEnum.PENDING]: 1,
      [UsersStatusEnum.INACTIVE]: 2,
      [UsersStatusEnum.DELETED]: 3,
    }

    let activeStudents = 0

    for (const cu of participants) {
      const statuses: string[] = []
      if (cu.user?.parentUser?.status) statuses.push(cu.user.parentUser.status)
      for (const mapping of cu.parentMappings ?? []) {
        if (mapping.parentUser?.status) statuses.push(mapping.parentUser.status)
      }

      if (statuses.length === 0) continue

      const bestStatus = statuses.reduce((best, current) =>
        (statusPriority[current] ?? 99) < (statusPriority[best] ?? 99) ? current : best
      )
      if (bestStatus === UsersStatusEnum.ACTIVE) activeStudents++
    }

    const activeUserIds = new Set(participants.map(cu => cu.userId))
    const permissionSlipDoc = documents?.find(
      document => (document.type as DocumentsTypeEnum) === DocumentsTypeEnum.PERMISSION_SLIP
    )
    const permissionSlipsSignedDigitally =
      permissionSlipDoc?.documentsUsers?.reduce((count, du) => {
        if (!activeUserIds.has(du.userId)) return count
        const meta = du.metadata as { signedDigitally?: string } | null
        return meta?.signedDigitally === "true" ? count + 1 : count
      }, 0) ?? 0
    const permissionSlipsSignedDigitallyPercentage =
      totalParticipants > 0 ? Math.round((permissionSlipsSignedDigitally / totalParticipants) * 100) : 0

    posthog.capture("campaign_participant_details", {
      organization_id: organizationId,
      campaign_id: campaignId,
      active_participant_ratio: `${activeStudents} / ${totalParticipants}`,
      permissionslips_signed_digitally_ratio: `${permissionSlipsSignedDigitally} of ${totalParticipants} (${permissionSlipsSignedDigitallyPercentage}%)`,
    })

    hasCapturedStats.current = true
  }, [isCampaignsUsersLoading, isDocumentsLoading, campaignsUsersData, documents, campaignId, organizationId])

  const permissionSlip = useMemo(() => {
    return documents?.find(document => (document.type as DocumentsTypeEnum) === DocumentsTypeEnum.PERMISSION_SLIP)
  }, [documents])

  const permissionSlipUserIds = useMemo(() => {
    return permissionSlip?.documentsUsers
      ?.filter(documentUser => documentUser.sentEmailAt)
      ?.map(documentUser => documentUser.userId)
  }, [permissionSlip])

  const { mutate: markEligible } = api.organizationsUsers.upsertMany.useMutation({
    onSuccess: () => {
      toast.success("Participants marked as eligible successfully")
      setSelectedUserIds(new Set())
      void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
    },
    onError: () => {
      toast.error("Failed to mark participants as eligible")
    },
  })

  const { mutate: signManyPermissionSlips } = api.campaignsUsers.signManyPermissionSlip.useMutation({
    onSuccess: () => {
      toast.success("Participants permission marked as signed successfully")
      setSelectedUserIds(new Set())
      void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
    },
    onError: () => {
      toast.error("Failed to mark participants permissions as signed")
    },
  })

  const { mutate: deleteManyCampaignsUsers } = api.campaignsUsers.deleteMany.useMutation({
    onSuccess: () => {
      toast.success("Participants deleted successfully")
      setSelectedUserIds(new Set())
      void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
      void utils.campaignsUsers.listUserIdsByCampaignId.invalidate()
    },
    onError: () => {
      toast.error("Failed to delete participants")
    },
  })

  const { mutateAsync: downloadReport, isPending: isDownloadingReport } =
    api.campaignsUsers.downloadReportByCampaignId.useMutation()

  const { mutateAsync: resendInvitationMany, isPending: isSendingInviteEmails } =
    api.users.resendInvitationMany.useMutation()

  const handleCheckboxChange = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const newSelectedUserIds = new Set(prev)

      if (newSelectedUserIds.has(userId)) {
        newSelectedUserIds.delete(userId)
      } else {
        newSelectedUserIds.add(userId)
      }

      return newSelectedUserIds
    })
  }, [])

  const handleSelectAll = useCallback(
    async (allRows: boolean) => {
      let userIds = []

      if (allRows) {
        userIds = allUserIds.map(user => user.userId)
      } else {
        userIds = campaignsUsersData?.data?.map(user => user.userId) ?? []
      }

      setSelectedUserIds(new Set(userIds))
    },
    [campaignsUsersData?.data, allUserIds]
  )

  const handleUnselectAll = () => setSelectedUserIds(new Set())

  const handleUnselectVisible = () => {
    setSelectedUserIds(prev => {
      const newSelectedUserIds = new Set(prev)

      campaignsUsersData?.data?.forEach(user => {
        newSelectedUserIds.delete(user.userId)
      })

      return newSelectedUserIds
    })
  }

  const handleGroupCheckout = async () => {
    const userIds = Array.from(selectedUserIds)
    const maskPii = shouldMaskParticipantPii(role)

    const campaignUsers = await fetchByUserIdsInChunks(userIds, ids =>
      utils.campaignsUsers.listByUserIds.fetch({ userIds: ids })
    )

    const usersWithUnsignedPermission = campaignUsers
      .filter(campaignUser => campaignUser.permissionSlipSignedAt === null)
      .map(user => user.user)

    if (usersWithUnsignedPermission.length > 0) {
      toastError({
        error: new Error("To group checkout, all participants must have signed the permission slip."),
        toastOptions: {
          description: (
            <div>
              <br />
              <p>Participants who have not:</p>
              <ul className="list-disc list-inside">
                {usersWithUnsignedPermission.map(user => (
                  <li key={user.id}>{getUserDisplayName(user && maskPii ? maskParticipantUserPii(user) : user)}</li>
                ))}
              </ul>
            </div>
          ),
        },
      })
      return
    }

    const organizationUsers = await fetchByUserIdsInChunks(userIds, ids =>
      utils.organizationsUsers.getAllByUserIds.fetch({ userIds: ids })
    )

    const ineligibleUsers = organizationUsers
      .filter(organizationUser => !organizationUser.eligible)
      .map(organizationUser => organizationUser.user)

    if (ineligibleUsers.length > 0) {
      toastError({
        error: new Error("To group checkout, all participants must be eligible."),
        toastOptions: {
          description: (
            <div>
              <br />
              <p>Participants who are not:</p>
              <ul className="list-disc list-inside">
                {ineligibleUsers.map(user => (
                  <li key={user.id}>{getUserDisplayName(user && maskPii ? maskParticipantUserPii(user) : user)}</li>
                ))}
              </ul>
            </div>
          ),
        },
      })
      return
    }

    setCasesGroupCheckoutUserIds(userIds)
  }

  const handleMarkEligible = () => {
    markEligible({
      organizationId,
      users:
        Array.from(selectedUserIds).map(userId => ({
          userId,
          eligible: true,
          eligibleUpdatedAt: new Date(),
          eligibleUpdatedByUserId: loggedInUserId,
        })) ?? [],
    })
  }

  const handleSignPermissionSlip = () => {
    const ids = allUserIds.filter(user => selectedUserIds.has(user.userId)).map(user => user.id)

    signManyPermissionSlips({ ids, campaignId })
    void utils.documents.listByCampaignId.invalidate()
  }

  const handleDelete = () => {
    const ids = allUserIds.filter(user => selectedUserIds.has(user.userId)).map(user => user.id)

    setDeleteCampaignsUsersIds(ids)
  }

  const handleSendInviteEmail = async () => {
    const userIds = Array.from(selectedUserIds)

    const [campaignUsers, parentMappings] = await Promise.all([
      fetchByUserIdsInChunks(userIds, ids => utils.campaignsUsers.listByUserIds.fetch({ userIds: ids })),
      fetchByUserIdsInChunks(userIds, ids =>
        utils.participantParentMapping.listByParticipantIds.fetch({ participantUserIds: ids })
      ),
    ])

    const parentMap = new Map<string, { id: string; email: string | null | undefined }>()
    const candidates = [
      ...campaignUsers.map(campaignUser => campaignUser.user?.parentUser),
      ...parentMappings.map(mapping => mapping.parentUser),
    ]
    for (const parent of candidates) {
      if (!parent?.id || !parent.email) continue
      const status = parent.status as UsersStatusEnum
      if (status !== UsersStatusEnum.ACTIVE && status !== UsersStatusEnum.PENDING) continue
      parentMap.set(parent.id, parent)
    }

    const uniqueParents = Array.from(parentMap.values())

    if (uniqueParents.length === 0) {
      toast.error("No active or pending parents found for the selected participants")
      return
    }

    setSendInviteEmailParents(uniqueParents)
  }

  const handleConfirmSendInviteEmail = async () => {
    if (!sendInviteEmailParents) return

    try {
      const { sentCount, failedCount, failed } = await resendInvitationMany({
        userIds: sendInviteEmailParents.map(parent => parent.id),
      })

      if (sentCount > 0) {
        toast.success(`Invitation email sent to ${sentCount} parent${sentCount === 1 ? "" : "s"}`)
      }

      if (failedCount > 0) {
        toastError({
          error: new Error(`Failed to send invitation email to ${failedCount} parent${failedCount === 1 ? "" : "s"}`),
          toastOptions: {
            description: (
              <div>
                <br />
                <ul className="list-disc list-inside">
                  {failed.map(({ email, reason }) => (
                    <li key={email}>
                      {email} — {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          },
        })
      }
    } catch {
      toast.error("Failed to send invitation emails")
    } finally {
      setSendInviteEmailParents(null)
    }
  }

  const handleGroupDelete = async () => {
    const userIds = Array.from(selectedUserIds)
    const maskPii = shouldMaskParticipantPii(role)

    const campaignUsers = await fetchByUserIdsInChunks(userIds, ids =>
      utils.campaignsUsers.listByUserIds.fetch({ userIds: ids })
    )

    const usersWithCasesTransactions = campaignUsers
      .filter(campaignUser => campaignUser.user?.casesTransactions?.length > 0)
      .map(campaignUser => campaignUser.user)

    if (usersWithCasesTransactions.length > 0) {
      toastError({
        error: new Error(
          "Cannot delete participants who have cases checked out. Please delete cases checked out before deleting participant."
        ),
        toastOptions: {
          description: (
            <div>
              <br />
              <p>The following participants have cases transactions and cannot be deleted:</p>
              <ul className="list-disc list-inside">
                {usersWithCasesTransactions.map(user => (
                  <li key={user.id}>{getUserDisplayName(user && maskPii ? maskParticipantUserPii(user) : user)}</li>
                ))}
              </ul>
            </div>
          ),
        },
      })
      return
    }

    const usersWithPayments = campaignUsers
      .filter(campaignUser => campaignUser.user?.paymentLogs?.length > 0)
      .map(campaignUser => campaignUser.user)

    if (usersWithPayments.length > 0) {
      toastError({
        error: new Error(
          "Cannot delete participants who have logged payments. Please delete payment transactions, as appropriate, before deleting participant. NOTE: Digital payments cannot be deleted."
        ),
        toastOptions: {
          description: (
            <div>
              <br />
              <p>The following participants have payments and cannot be deleted:</p>
              <ul className="list-disc list-inside">
                {usersWithPayments.map(user => (
                  <li key={user.id}>{getUserDisplayName(user && maskPii ? maskParticipantUserPii(user) : user)}</li>
                ))}
              </ul>
            </div>
          ),
        },
      })
      return
    }

    void deleteManyCampaignsUsers({ ids: deleteCampaignsUsersIds })
    setDeleteCampaignsUsersIds([])
  }

  const [createUser, setCreateUser] = useState<boolean>(false)
  const [selectedUser, setSelectedUser] = useState<CampaignUserWithComputedFields | null>(null)
  const [casesCheckoutUser, setCasesCheckoutUser] = useState<CampaignUserWithComputedFields | null>(null)
  const [transactionsUser, setTransactionsUser] = useState<CampaignUserWithComputedFields | null>(null)
  const [permissionSlipUser, setPermissionSlipUser] = useState<CampaignUserWithComputedFields | null>(null)
  const [showQrConfirm, setShowQrConfirm] = useState(false)
  const [showCampaignQrCodeModal, setShowCampaignQrCodeModal] = useState(false)

  const emailQrCodes = async () => {
    const email = user?.primaryEmailAddress?.emailAddress
    if (!email || typeof email !== "string") {
      toast.error("No email address found for your account. Add an email to receive QR codes.")
      return
    }

    const organization = await utils.organizations.getById.fetch({ id: organizationId })
    const fromName = organization?.name ?? APP_NAME

    const response = await fetch("/api/email/send/qrcode", {
      method: "POST",
      body: JSON.stringify({
        campaignId,
        email,
        fromName,
      }),
    })
    const json = (await response.json()) as { error?: string }
    if (response.ok) {
      toast.success("QR codes sent PDF sent for processing successfully. Check your email for the attached PDF.")
    } else {
      toast.error(json.error ?? "Failed to send QR codes")
    }
  }

  const onClickOfDownload = async (type: FileReportType) => {
    if (participantAccessData?.isGranted) {
      setSelectedReportType(type)
      setShowDownloadConfirm(true)
      return
    }
    await downloadCampaignsUsersReport(type)
  }

  const downloadCampaignsUsersReport = async (type: FileReportType) => {
    const campaign = await utils.campaigns.getById.fetch({ id: campaignId })
    const fileName = `participants-report-${campaign?.name ?? ""}`

    const data = await downloadReport({ campaignId })

    await downloadFileReport({ type, fileName, data, sheetName: "Participants Report" })
  }

  const allRowsCount = useMemo(() => {
    return campaignsUsersData?.pagination?.total ?? 0
  }, [campaignsUsersData])

  const allRowsSelected = useMemo(() => {
    return allRowsCount > 0 && allRowsCount === selectedUserIds.size
  }, [allRowsCount, selectedUserIds])

  const visibleRowsCount = useMemo(() => {
    return campaignsUsersData?.data?.length ?? 0
  }, [campaignsUsersData])

  const visibleRowsSelected = useMemo(() => {
    const visibleUserIds = campaignsUsersData?.data?.map(user => user.userId) ?? []
    return visibleRowsCount > 0 && visibleUserIds.every(userId => selectedUserIds.has(userId))
  }, [visibleRowsCount, selectedUserIds, campaignsUsersData])

  const columns = useMemo<ColumnDef<CampaignUserWithComputedFields>[]>(
    () => [
      {
        id: "checkbox",
        header: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="-ml-0 data-[state=open]:bg-accent pr-0">
                <input
                  type="checkbox"
                  checked={allRowsSelected || visibleRowsSelected}
                  className="cursor-pointer"
                  readOnly
                />
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <>
                <DropdownMenuItem onClick={() => (allRowsSelected ? handleUnselectAll() : handleSelectAll(true))}>
                  <input type="checkbox" checked={allRowsSelected} onChange={() => void {}} />
                  {allRowsSelected ? "Unselect All" : "Select All"} ({allRowsCount} Row{allRowsCount > 1 ? "s" : ""})
                </DropdownMenuItem>

                {allRowsCount > PAGINATION_LIMIT_MAX && (
                  <DropdownMenuItem
                    onClick={() => (visibleRowsSelected ? handleUnselectVisible() : handleSelectAll(false))}
                  >
                    <input type="checkbox" checked={visibleRowsSelected} onChange={() => void {}} />
                    {visibleRowsSelected ? "Unselect Page" : "Select Page"} ({visibleRowsCount} Row
                    {visibleRowsCount > 1 ? "s" : ""})
                  </DropdownMenuItem>
                )}
              </>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        cell: ({ row }) => {
          return (
            <input
              type="checkbox"
              checked={selectedUserIds.has(row.original.userId)}
              onChange={() => {
                handleCheckboxChange(row.original.userId)
              }}
              disabled={!campaignIsActive}
              className="ml-3 pr-0 accent-primary"
            />
          )
        },
        size: 65,
      },
      {
        accessorKey: "user.fullName",
        header: props => <DataTableColumnHeader {...props} title="Name" />,
        cell: props => {
          const u = props.row.original.user
          const displayUser =
            u && shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false)
              ? maskParticipantUserPii(u)
              : u
          return <div className="truncate first-letter:uppercase">{getUserDisplayName(displayUser)}</div>
        },
        size: 140,
      },
      {
        accessorKey: "user.parentUser.status",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Parent"
            facetedFilter={{
              type: "single",
              accessorKey: "user.parentUser.status",
              options: Object.values(UsersStatusEnum).map(status => ({
                label: firstLetterUpperCase(status),
                value: status,
              })),
            }}
          />
        ),
        cell: ({ row }) => {
          // Collect statuses from all parent users (legacy + all mappings)
          const statuses: string[] = []
          if (row.original.user?.parentUser?.status) {
            statuses.push(row.original.user.parentUser.status)
          }
          for (const mapping of row.original.parentMappings ?? []) {
            if (mapping.parentUser?.status) statuses.push(mapping.parentUser.status)
          }

          if (statuses.length === 0) return "-"

          // Priority: ACTIVE > PENDING > INACTIVE > DELETED
          const priority: Record<string, number> = {
            [UsersStatusEnum.ACTIVE]: 0,
            [UsersStatusEnum.PENDING]: 1,
            [UsersStatusEnum.INACTIVE]: 2,
            [UsersStatusEnum.DELETED]: 3,
          }
          const bestStatus = statuses.reduce((best, current) =>
            (priority[current] ?? 99) < (priority[best] ?? 99) ? current : best
          )

          const { icon: Icon, label, color } = USER_STATUS_DETAILS[bestStatus as UsersStatusEnum]
          const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

          return (
            <div className={`flex items-center gap-1 ${colorClasses.text}`}>
              <Icon size={16} />
              {label}
            </div>
          )
        },
      },
      {
        accessorKey: "user.pin",
        header: props => <DataTableColumnHeader {...props} title="PIN" />,
      },
      {
        accessorKey: "user.grade",
        ...(IS_LABEL_CHANGE_ENABLED ? { size: 100 } : {}),
        header: props => (
          <DataTableColumnHeader
            {...props}
            title={GRADE_LABEL}
            facetedFilter={{
              type: "single",
              accessorKey: "user.grade",
              options: grades
                .sort((a, b) => naturalSort(a, b, "asc"))
                .map(grade => ({
                  label: grade,
                  value: grade,
                })),
            }}
          />
        ),
      },
      {
        accessorKey: "user.teacherName",
        ...(IS_LABEL_CHANGE_ENABLED ? { size: 120 } : {}),
        header: props => (
          <DataTableColumnHeader
            {...props}
            title={TEACHER_LABEL}
            facetedFilter={{
              type: "single",
              accessorKey: "user.teacherName",
              options: teacherNames.map(teacherName => ({
                label: teacherName,
                value: teacherName,
              })),
            }}
          />
        ),
      },
      {
        enableSorting: false,
        accessorKey: "permissionSlipSignedAt",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Permission Signed"
            facetedFilter={{
              type: "single",
              accessorKey: "permissionSlipSigned",
              options: [
                {
                  label: "Yes",
                  value: true,
                },
                {
                  label: "No",
                  value: false,
                },
              ],
            }}
          />
        ),
        cell: props => {
          const isPermissionSlipSent = permissionSlipUserIds?.includes(props.row.original.userId)
          const isPermissionSlipSigned = !!props.row.original.permissionSlipSignedAt

          const showSendEmailButton = permissionSlip?.id && !isPermissionSlipSigned

          // Determine if there's at least one active/pending parent to send to
          const parentStatuses: string[] = []
          if (props.row.original.user?.parentUser?.status) {
            parentStatuses.push(props.row.original.user.parentUser.status)
          }
          for (const mapping of props.row.original.parentMappings ?? []) {
            if (mapping.parentUser?.status) parentStatuses.push(mapping.parentUser.status)
          }
          const hasActiveOrPendingParent = parentStatuses.some(
            s => s === UsersStatusEnum.ACTIVE || s === UsersStatusEnum.PENDING
          )

          return (
            <div className="flex justify-start items-center gap-2">
              <DataTableCell
                {...props}
                type="boolean"
                value={isPermissionSlipSigned}
                valueTrueText="Signed"
                valueFalseText={isPermissionSlipSent ? "Sent" : "Not Sent"}
              />

              {showSendEmailButton && (
                <WithTooltip
                  content={
                    !hasActiveOrPendingParent
                      ? "Cannot send - no active parent"
                      : isPermissionSlipSent
                        ? "Resend via email"
                        : "Send via email"
                  }
                  side="top"
                  trigger={
                    <Button
                      variant="ghost"
                      className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
                      size="icon"
                      disabled={!hasActiveOrPendingParent}
                      onClick={() => setSendEmailPermissionSlip(props.row.original)}
                    >
                      <Mail />
                    </Button>
                  }
                />
              )}
            </div>
          )
        },
        size: 145,
      },
      {
        enableSorting: false,
        id: "organizationsUsers_eligible",
        accessorFn: row => row.eligible ?? false,
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Eligible"
            facetedFilter={{
              type: "single",
              accessorKey: "eligible",
              options: [
                {
                  label: "Yes",
                  value: true,
                },
                {
                  label: "No",
                  value: false,
                },
              ],
            }}
          />
        ),
        cell: props => {
          return <DataTableCell {...props} value={props.row.original.eligible ?? false} type="boolean" />
        },
      },
      {
        id: "casesTransactions_quantity",
        accessorFn: row => row.casesCheckedOutQuantity ?? 0,
        header: props => <DataTableColumnHeader {...props} title="Cases Checked Out" />,
        cell: props => {
          const quantity = props.row.original.casesCheckedOutQuantity ?? 0
          const lastCaseTransactionAt = props.row.original.lastCaseTransactionAt ?? null
          const requestedCaseTransactionAt = props.row.original.requestedCaseTransactionAt ?? null

          const requestCaseAfterLastTransaction =
            requestedCaseTransactionAt && lastCaseTransactionAt && requestedCaseTransactionAt > lastCaseTransactionAt

          if (quantity === 0 && !!props.row.original.permissionSlipSignedAt) {
            return (
              <WithTooltip
                content="No cases checked out yet"
                side="top"
                trigger={
                  <div className="flex items-center gap-2 text-red-500">
                    0 <TriangleAlert />
                  </div>
                }
              />
            )
          }

          if (requestCaseAfterLastTransaction) {
            return (
              <WithTooltip
                content="Case checkout requested"
                side="top"
                trigger={
                  <div className="flex items-center gap-2 text-red-500">
                    {quantity} <TriangleAlert />
                  </div>
                }
              />
            )
          }

          return <div>{quantity}</div>
        },
        size: 120,
      },
      {
        id: "paymentLogs_amountCents",
        accessorFn: row => row.totalPaidCents ?? 0,
        header: props => <DataTableColumnHeader {...props} title="Paid" />,
        cell: props => {
          const totalPaidCents = props.row.original.totalPaidCents ?? 0
          const totalOwedCents = props.row.original.totalOwedCents ?? 0

          const progress = totalOwedCents > 0 ? (totalPaidCents / totalOwedCents) * 100 : 0

          const { progressClassName, valueClassName } = getMoneyProgressAndValueClassName(
            totalPaidCents,
            totalOwedCents
          )

          return (
            <DataTableCell
              {...props}
              type="progress"
              progress={progress}
              progressClassName={progressClassName}
              value={
                <div className={cn("flex items-center gap-1", valueClassName)}>
                  {formatCentsToCurrency(totalPaidCents)}
                </div>
              }
            />
          )
        },
      },
      {
        id: "balanceOwed",
        accessorFn: row => row.balanceOwedCents ?? 0,
        header: props => <DataTableColumnHeader {...props} title="Owed" />,
        cell: props => {
          const totalPaidCents = props.row.original.totalPaidCents ?? 0
          const totalOwedCents = props.row.original.totalOwedCents ?? 0
          const balanceOwedCents = props.row.original.balanceOwedCents ?? 0

          const { valueClassName } = getMoneyProgressAndValueClassName(totalPaidCents, totalOwedCents)

          return <div className={valueClassName}>{formatCentsToCurrency(balanceOwedCents)}</div>
        },
      },
      {
        id: "actions",
        header: props => <DataTableColumnHeader {...props} title="Actions" className="flex justify-end" />,
        cell: ({ row }) => {
          const permissionSlipSignedAt = !!row.original.permissionSlipSignedAt

          let checkoutCasesTooltip: ReactNode = "Check Out Chocolate"

          if (!permissionSlipSignedAt) {
            checkoutCasesTooltip = (
              <div>
                Cannot check out chocolate because
                <br /> permission slip is not signed
              </div>
            )
          }

          if (!campaignIsActive) {
            checkoutCasesTooltip = (
              <div>
                Cannot check out chocolate because
                <br /> campaign is not active
              </div>
            )
          }

          return (
            <div className="flex justify-end gap-1">
              <WithTooltip
                content={permissionSlipSignedAt ? "Unsign Permission Slip" : "Sign Permission Slip"}
                side="top"
                trigger={
                  <Button
                    variant="ghost"
                    className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
                    size="icon"
                    onClick={() => {
                      setPermissionSlipUser(row.original)
                    }}
                  >
                    {permissionSlipSignedAt ? <PenOff /> : <PenLine />}
                  </Button>
                }
              />

              <WithTooltip
                content={checkoutCasesTooltip}
                side="top"
                trigger={
                  <Button
                    variant="ghost"
                    className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
                    size="icon"
                    disabled={!campaignIsActive || !permissionSlipSignedAt}
                    onClick={() => {
                      setCasesCheckoutUser(row.original)
                    }}
                  >
                    <PackagePlus />
                  </Button>
                }
              />
              <WithTooltip
                content="Log Cash Payment"
                side="top"
                trigger={
                  <Button
                    variant="ghost"
                    className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
                    size="icon"
                    onClick={() => {
                      setTransactionsUser(row.original)
                    }}
                  >
                    <Receipt />
                  </Button>
                }
              />
              {(() => {
                // Determine if there is at least one active/pending parent
                const parentStatuses: string[] = []
                if (row.original.user?.parentUser?.status) {
                  parentStatuses.push(row.original.user.parentUser.status)
                }
                for (const mapping of row.original.parentMappings ?? []) {
                  if (mapping.parentUser?.status) parentStatuses.push(mapping.parentUser.status)
                }
                const hasActiveOrPendingParent = parentStatuses.some(
                  s => s === UsersStatusEnum.ACTIVE || s === UsersStatusEnum.PENDING
                )
                const hasAnyParent = !!row.original.user?.parentUserId || (row.original.parentMappings?.length ?? 0) > 0

                const tooltip = !hasAnyParent
                  ? "Cannot send message - no parent"
                  : !hasActiveOrPendingParent
                    ? "Cannot send message - no active parent"
                    : "Send Message"

                return (
                  <WithTooltip
                    content={tooltip}
                    side="top"
                    trigger={
                      <Button
                        variant="ghost"
                        className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
                        size="icon"
                        disabled={!hasActiveOrPendingParent}
                        onClick={() => {
                          if (!hasActiveOrPendingParent) return

                          const currentUrl = new URL(window.location.href)
                          currentUrl.hash = "#messaging"
                          currentUrl.searchParams.set("userId", row.original.user?.id ?? "")
                          window.location.href = currentUrl.toString()
                        }}
                      >
                        <MailPlus />
                      </Button>
                    }
                  />
                )
              })()}
              <WithTooltip
                content="View Details"
                side="top"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
                    onClick={() => {
                      setSelectedUser(row.original)
                    }}
                  >
                    <Ellipsis />
                  </Button>
                }
              />
            </div>
          )
        },
      },
    ],
    [
      allRowsCount,
      allRowsSelected,
      visibleRowsCount,
      visibleRowsSelected,
      selectedUserIds,
      role,
      campaignIsActive,
      organizationId,
      handleCheckboxChange,
      handleSelectAll,
      permissionSlip,
      permissionSlipUserIds,
      grades,
      teacherNames,
    ]
  )

  if (!role) return null
  const { canCreate } = getResourcePermissions(role, CampaignsUsersPermissionsEnum)

  return (
    <>
      <DataTable
        id="campaigns-users-list-"
        data={campaignsUsersData?.data ?? []}
        pagination={campaignsUsersData?.pagination}
        initialPageSize={queryPagination.limit}
        columnPinning={{
          left: ["checkbox", "user_fullName"],
          right: ["actions"],
        }}
        onRowClick={row => {
          if (!window.getSelection()?.toString()) {
            setSelectedUser(row)
          }
        }}
        emptyState={{
          title: "Add Participants",
          description:
            "Your participant list helps power the fundraiser. Add everyone who will be selling so your team can manage inventory, payments, permission, and more.",
          icon: UserPlus,
          proTip: "Adding participants early helps keep everything organized from the start.",
          searchTitle: "No Participants",
        }}
        newButton={
          canCreate
            ? {
                text: "Add Participant",
                onClick: () => setCreateUser(true),
                disabled: !campaignIsActive,
              }
            : undefined
        }
        additionalButtons={[
          {
            text: "QR Codes",
            variant: "secondary",
            onClick: () => void 0,
            icon: QrCode,
            buttons: [
              // ...(campaignHasDigitalPayment
              //   ? [
              //       {
              //         text: "Generate Payment QR Codes",
              //         onClick: () => void setShowQrConfirm(true),
              //         icon: DollarSign,
              //       } as const,
              //     ]
              //   : []),
              {
                text: "Sign Up QR Code",
                onClick: () => void setShowCampaignQrCodeModal(true),
                icon: UserPlus,
                disabled: false,
              },
            ],
          },
          {
            text: isDownloadingReport ? "Downloading Report..." : "Download Report",
            variant: "secondary",
            onClick: () => void 0,
            icon: FileDown,
            disabled: isDownloadingReport || campaignsUsersData?.data?.length === 0,
            buttons: [
              {
                text: "Excel File",
                onClick: () => void onClickOfDownload(FileReportType.EXCEL),
                icon: FileSpreadsheet,
              },
              {
                text: "CSV File",
                onClick: () => void onClickOfDownload(FileReportType.CSV),
                icon: FileText,
              },
            ],
          },
        ]}
        columns={columns}
        loading={isLoading}
        multiColumnFilter={{
          columns: [
            { accessorKey: "user.fullName", name: "Name" },
            { accessorKey: "user.email", name: "Email" },
            ...(campaignHasDigitalPayment ? [{ accessorKey: "user.pin", name: "PIN" }] : []),
          ],
        }}
        onTableCreated={table => {
          tableInstanceRef.current = table
        }}
        autoResetPageIndex={false}
      />

      {createUser && (
        <OrganizationsParticipantsCreate
          organizationId={organizationId}
          campaignId={campaignId}
          open={createUser}
          onOpenChange={() => setCreateUser(false)}
        />
      )}

      {selectedUser && (
        <CampaignsUsersActions
          campaignUser={selectedUser}
          campaignId={campaignId}
          organizationId={organizationId}
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
          campaignIsActive={campaignIsActive}
          campaignHasDigitalPayment={campaignHasDigitalPayment}
          setSelectedUser={setSelectedUser}
        />
      )}

      {casesCheckoutUser?.user && (
        <CasesCheckoutForm
          open={!!casesCheckoutUser}
          onOpenChange={() => setCasesCheckoutUser(null)}
          campaignId={campaignId}
          organizationId={organizationId}
          user={casesCheckoutUser.user}
        />
      )}

      {transactionsUser?.user && (
        <LogCashPaymentForm
          open={!!transactionsUser}
          onOpenChange={() => setTransactionsUser(null)}
          campaignId={campaignId}
          organizationId={organizationId}
          user={transactionsUser.user}
        />
      )}

      {casesGroupCheckoutUserIds.length > 0 && (
        <CasesGroupCheckoutForm
          open={casesGroupCheckoutUserIds.length > 0}
          onOpenChange={() => setCasesGroupCheckoutUserIds([])}
          campaignId={campaignId}
          onSubmit={() => {
            setSelectedUserIds(new Set())
            void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
          }}
          organizationId={organizationId}
          userIds={casesGroupCheckoutUserIds}
        />
      )}

      {campaignIsActive && (
        <CampaignsUsersSelectionBar
          selectedCount={selectedUserIds.size}
          onClearSelection={() => setSelectedUserIds(new Set())}
          onGroupCheckout={handleGroupCheckout}
          onSignPermissionSlip={handleSignPermissionSlip}
          onMarkEligible={handleMarkEligible}
          onSendInviteEmail={() => void handleSendInviteEmail()}
          onDelete={handleDelete}
        />
      )}

      {permissionSlipUser?.user && (
        <CampaignsUsersSignPermissionSlip
          campaignUser={permissionSlipUser}
          open={!!permissionSlipUser}
          onOpenChange={() => setPermissionSlipUser(null)}
        />
      )}

      {sendEmailPermissionSlip && permissionSlip && (
        <DocumentsSendEmail
          document={permissionSlip}
          campaignUser={sendEmailPermissionSlip}
          open={!!sendEmailPermissionSlip}
          onOpenChange={() => setSendEmailPermissionSlip(null)}
        />
      )}

      <AlertDialogConfirm
        open={showQrConfirm}
        onOpenChange={setShowQrConfirm}
        title="Email QR Codes PDF to yourself?"
        description="Please confirm you want to generate the QR Codes PDF and send it to yourself by email"
        confirmText="Send"
        onConfirm={() => {
          void emailQrCodes()
          setShowQrConfirm(false)
        }}
      />

      <AlertDialogConfirm
        open={deleteCampaignsUsersIds.length > 0}
        onOpenChange={() => setDeleteCampaignsUsersIds([])}
        title="Delete Participants"
        description="Please confirm you want to delete the selected participants"
        confirmText="Delete"
        onConfirm={() => handleGroupDelete()}
      />

      <AlertDialogConfirm
        open={!!sendInviteEmailParents}
        onOpenChange={open => {
          if (!open) setSendInviteEmailParents(null)
        }}
        title="Resend Invite Email"
        description={`Please confirm to resend invitation link to ${sendInviteEmailParents?.length ?? 0} parent${
          sendInviteEmailParents?.length === 1 ? "" : "s"
        } of the selected participant${selectedUserIds?.size === 1 ? "" : "s"}`}
        confirmText="Send"
        isPending={isSendingInviteEmails}
        onConfirm={() => void handleConfirmSendInviteEmail()}
      />

      {participantAccessData?.isGranted && (
        <AlertDialogConfirm
          open={showDownloadConfirm}
          onOpenChange={open => {
            setShowDownloadConfirm(open)
            if (!open) {
              setSelectedReportType(null)
            }
          }}
          title="Download Participants Report"
          description="This report may include participant names. Once downloaded, the report will exist outside WFCentral and cannot be automatically re-redacted when temporary access expires. Download and use this report only as needed to support, administer, troubleshoot, or help manage this fundraiser. Do not use or share Participant Information for any other purpose."
          confirmText="I Acknowledge"
          onConfirm={async () => {
            if (!selectedReportType) return
            await createAccessLog({
              campaignId,
              eventType: "DOWNLOAD_REPORT",
              reportName: "Participants Report",
              fileType: fileTypeMap[selectedReportType] ?? null,
            })
            await downloadCampaignsUsersReport(selectedReportType)
            setShowDownloadConfirm(false)
            setSelectedReportType(null)
          }}
        />
      )}

      <CampaignQRCodeModal
        open={showCampaignQrCodeModal}
        onOpenChange={setShowCampaignQrCodeModal}
        organizationId={organizationId}
        campaignId={campaignId}
      />
    </>
  )
}
