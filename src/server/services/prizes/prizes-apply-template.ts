import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm"

import { PrizeGoalTypeEnum } from "@/constants/prize"
import { PRIZE_TEMPLATES, resolvePrizeAssetUrl } from "@/constants/prize-templates"
import type { db } from "@/server/db"
import { campaigns, events, prizes } from "@/server/db/schema"

export type PrizesApplyTemplateResult = {
  campaignId: string
  appliedPrizeTemplateSlug: string | null
  createdPrizeIds: string[]
  deletedPrizeIds: string[]
  /** Template prizes an event still references; deactivated instead of deleted. */
  // This will be applicable if EventGoalTypeEnum.PRIZE_QUALIFICATION is enabled back
  retiredPrizeIds: string[]
  /** Pre-existing custom prizes hidden because a template is now applied */
  deactivatedCustomPrizeIds: string[]
  unchanged: boolean
}

export const prizesApplyTemplate = async ({
  database,
  input,
}: {
  database: typeof db
  input: {
    campaignId: string
    /** `null` = "Create my own": clears any applied template and creates nothing. */
    prizeTemplateSlug: string | null
  }
}): Promise<PrizesApplyTemplateResult> => {
  const { campaignId, prizeTemplateSlug } = input

  const [campaign] = await database.select().from(campaigns).where(eq(campaigns.id, campaignId)).for("update").limit(1)

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const currentSlug = campaign.prizeTemplateSlug ?? null

  if (currentSlug === prizeTemplateSlug) {
    return {
      campaignId,
      appliedPrizeTemplateSlug: currentSlug,
      createdPrizeIds: [],
      deletedPrizeIds: [],
      retiredPrizeIds: [],
      deactivatedCustomPrizeIds: [],
      unchanged: true,
    }
  }

  const template = prizeTemplateSlug ? PRIZE_TEMPLATES.find(entry => entry.slug === prizeTemplateSlug) : null

  if (prizeTemplateSlug && !template) throw new Error(`Unknown prize template "${prizeTemplateSlug}"`)

  const templateItems = [...(template?.items ?? [])].sort((a, b) => a.position - b.position)

  const existingTemplatePrizes = await database
    .select({ id: prizes.id })
    .from(prizes)
    .where(and(eq(prizes.campaignId, campaignId), isNotNull(prizes.prizeTemplateSlug)))

  const outgoingIds = existingTemplatePrizes.map(prize => prize.id)
  const deletedPrizeIds: string[] = []
  const retiredPrizeIds: string[] = []

  if (outgoingIds.length > 0) {
    await database
      .update(prizes)
      .set({ nextPrizeId: null })
      .where(and(eq(prizes.campaignId, campaignId), inArray(prizes.nextPrizeId, outgoingIds)))

    await database
      .update(prizes)
      .set({ previousPrizeId: null })
      .where(and(eq(prizes.campaignId, campaignId), inArray(prizes.previousPrizeId, outgoingIds)))

    const referencingEvents = await database
      .select({ prizeId: events.prizeId })
      .from(events)
      .where(inArray(events.prizeId, outgoingIds))

    const referencedIds = new Set(referencingEvents.map(row => row.prizeId).filter((id): id is string => !!id))

    const deletableIds = outgoingIds.filter(id => !referencedIds.has(id))
    const retirableIds = outgoingIds.filter(id => referencedIds.has(id))

    if (retirableIds.length > 0) {
      await database.update(prizes).set({ active: false }).where(inArray(prizes.id, retirableIds))
      retiredPrizeIds.push(...retirableIds)
    }

    if (deletableIds.length > 0) {
      await database.delete(prizes).where(inArray(prizes.id, deletableIds))
      deletedPrizeIds.push(...deletableIds)
    }
  }

  if (!template) {
    await database
      .update(campaigns)
      .set({ prizeTemplateSlug: null, homeRunPrizesTemplate: false })
      .where(eq(campaigns.id, campaignId))

    return {
      campaignId,
      appliedPrizeTemplateSlug: null,
      createdPrizeIds: [],
      deletedPrizeIds,
      retiredPrizeIds,
      deactivatedCustomPrizeIds: [],
      unchanged: false,
    }
  }

  const deactivatedCustomPrizes = await database
    .update(prizes)
    .set({ active: false })
    .where(and(eq(prizes.campaignId, campaignId), isNull(prizes.prizeTemplateSlug), eq(prizes.active, true)))
    .returning({ id: prizes.id })

  const deactivatedCustomPrizeIds = deactivatedCustomPrizes.map(prize => prize.id)

  const rows = templateItems.map(item => ({
    id: crypto.randomUUID(),
    campaignId,
    organizationId: campaign.organizationId,
    prizeTemplateSlug: template.slug,
    name: item.name,
    description: item.description,
    imageUrl: resolvePrizeAssetUrl(item.imagePath),
    goalType: item.goalType,
    casesGoal: item.casesGoal,
    active: true,
  }))

  await database.insert(prizes).values(rows)

  const chain = rows.filter((_, index) => templateItems[index]?.goalType === PrizeGoalTypeEnum.CASE_PAYMENT)

  for (let index = 0; index < chain.length; index += 1) {
    const previousId = index > 0 ? chain[index - 1]!.id : null
    const nextId = index < chain.length - 1 ? chain[index + 1]!.id : null

    if (previousId || nextId) {
      await database
        .update(prizes)
        .set({ previousPrizeId: previousId, nextPrizeId: nextId })
        .where(eq(prizes.id, chain[index]!.id))
    }
  }

  await database
    .update(campaigns)
    .set({ prizeTemplateSlug: template.slug, homeRunPrizesTemplate: true })
    .where(eq(campaigns.id, campaignId))

  return {
    campaignId,
    appliedPrizeTemplateSlug: template.slug,
    createdPrizeIds: rows.map(row => row.id),
    deletedPrizeIds,
    retiredPrizeIds,
    deactivatedCustomPrizeIds,
    unchanged: false,
  }
}
