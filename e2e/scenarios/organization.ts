import { type Page } from "@playwright/test"

import { addMember } from "../helpers/member"
import { createOrganization } from "../helpers/org"

type OrgContext = {
  orgId: string
  orgName: string
  orgUrl: string
}

type MemberSpec = {
  email: string
  role: "Organization Admin" | "Organization Staff"
}

type OrgWithMembersContext = OrgContext & {
  members: MemberSpec[]
}

async function givenOrganizationCreated(page: Page, name?: string): Promise<OrgContext> {
  const { id, name: orgName } = await createOrganization(page, name ?? `E2E Org ${Date.now()}`)
  return {
    orgId: id,
    orgName,
    orgUrl: `/dashboard/organizations/${id}`,
  }
}

async function givenOrganizationWithMembers(
  page: Page,
  members: MemberSpec[],
  orgName?: string
): Promise<OrgWithMembersContext> {
  const orgContext = await givenOrganizationCreated(page, orgName)

  await page.getByRole("tab", { name: /members/i }).click()

  for (const member of members) {
    await addMember(page, { email: member.email, role: member.role })
  }

  return { ...orgContext, members }
}

export { givenOrganizationCreated, givenOrganizationWithMembers }
export type { OrgContext, OrgWithMembersContext, MemberSpec }
