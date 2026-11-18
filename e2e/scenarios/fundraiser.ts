import { type Page, expect } from "@playwright/test"

import { createFundraiser } from "../helpers/fundraiser"
import { addParticipant, navigateToFundraiserParticipants } from "../helpers/participant"
import { type OrgContext, givenOrganizationCreated } from "./organization"

type FundraiserContext = OrgContext & {
  fundraiserId: string
  fundraiserName: string
  fundraiserUrl: string
}

type ParticipantSpec = {
  firstName: string
  lastName: string
  grade: string
  teacherName: string
  parentEmail?: string
}

type FundraiserWithParticipantsContext = FundraiserContext & {
  participants: ParticipantSpec[]
}

async function givenFundraiserCreated(
  page: Page,
  options: {
    orgContext?: OrgContext
    orgName?: string
    sponsorEmail: string
    fundraiserName?: string
  }
): Promise<FundraiserContext> {
  const orgContext = options.orgContext ?? (await givenOrganizationCreated(page, options.orgName))

  if (!options.orgContext) {
    await page.getByRole("tab", { name: /fundraisers/i }).click()
  } else {
    await page.goto(orgContext.orgUrl)
    await page.getByRole("tab", { name: /fundraisers/i }).click()
  }

  const { id, name } = await createFundraiser(page, {
    sponsorEmail: options.sponsorEmail,
    name: options.fundraiserName,
  })

  return {
    ...orgContext,
    fundraiserId: id,
    fundraiserName: name,
    fundraiserUrl: `${orgContext.orgUrl}/campaigns/${id}`,
  }
}

async function givenFundraiserWithParticipants(
  page: Page,
  options: {
    fundraiserContext?: FundraiserContext
    orgName?: string
    sponsorEmail: string
    participants: ParticipantSpec[]
  }
): Promise<FundraiserWithParticipantsContext> {
  const fundraiserContext =
    options.fundraiserContext ??
    (await givenFundraiserCreated(page, {
      orgName: options.orgName,
      sponsorEmail: options.sponsorEmail,
    }))

  if (options.fundraiserContext) {
    await page.goto(fundraiserContext.fundraiserUrl)
  }

  await navigateToFundraiserParticipants(page)

  for (const participant of options.participants) {
    await addParticipant(page, participant)
    await expect(page.getByRole("row").filter({ hasText: participant.firstName })).toBeVisible({ timeout: 10000 })
  }

  return { ...fundraiserContext, participants: options.participants }
}

export { givenFundraiserCreated, givenFundraiserWithParticipants }
export type { FundraiserContext, FundraiserWithParticipantsContext, ParticipantSpec }
