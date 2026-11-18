type Role =
  | "WFC_ADMIN"
  | "SALES_MANAGER"
  | "SALES_REPRESENTATIVE"
  | "ORGANIZATION_ADMIN"
  | "ORGANIZATION_STAFF"
  | "PARENT"
  | "PARTICIPANT"

const ALL_TESTABLE_ROLES: Role[] = [
  "WFC_ADMIN",
  "SALES_MANAGER",
  "SALES_REPRESENTATIVE",
  "ORGANIZATION_ADMIN",
  "ORGANIZATION_STAFF",
  "PARENT",
  "PARTICIPANT",
]

type CtaCheck = {
  label: RegExp
  visibleFor: Role[]
}

type DenyBehavior = "redirect" | "api-error" | "hidden-content"

type ScreenDefinition = {
  id: string
  path: string
  pathPattern?: RegExp
  heading: string | RegExp
  sidebarLabel?: string
  sidebarRoles: Role[] | "all"
  accessRoles: Role[] | "all"
  denyBehavior?: DenyBehavior
  ctas: CtaCheck[]
  requiresOrgContext?: boolean
  requiresFundraiserContext?: boolean
  isExternal?: boolean
}

const SCREENS: ScreenDefinition[] = [
  {
    id: "dashboard",
    path: "/dashboard",
    heading: /dashboard/i,
    sidebarLabel: "Dashboard",
    sidebarRoles: "all",
    accessRoles: "all",
    ctas: [],
  },
  {
    id: "organizations-list",
    path: "/dashboard/organizations",
    heading: /organizations/i,
    sidebarLabel: "Organizations",
    sidebarRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    accessRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    denyBehavior: "redirect",
    ctas: [
      {
        label: /add organization/i,
        visibleFor: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE"],
      },
    ],
  },
  {
    id: "organization-detail",
    path: "/dashboard/organizations/:id",
    pathPattern: /\/dashboard\/organizations\/[a-f0-9-]+$/,
    heading: /.+/,
    sidebarRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    accessRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    denyBehavior: "redirect",
    requiresOrgContext: true,
    ctas: [
      {
        label: /organization settings/i,
        visibleFor: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
      },
    ],
  },
  {
    id: "organization-members",
    path: "/dashboard/organizations/:id#members",
    pathPattern: /\/dashboard\/organizations\/[a-f0-9-]+/,
    heading: /.+/,
    sidebarRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    accessRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    denyBehavior: "redirect",
    requiresOrgContext: true,
    ctas: [
      {
        label: /add member/i,
        visibleFor: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
      },
    ],
  },
  {
    id: "organization-fundraisers",
    path: "/dashboard/organizations/:id#fundraisers",
    pathPattern: /\/dashboard\/organizations\/[a-f0-9-]+/,
    heading: /.+/,
    sidebarRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    accessRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    denyBehavior: "redirect",
    requiresOrgContext: true,
    ctas: [
      {
        label: /add fundraiser/i,
        visibleFor: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE"],
      },
    ],
  },
  {
    id: "fundraiser-participants",
    path: "/dashboard/organizations/:orgId/campaigns/:campaignId#participants",
    pathPattern: /\/dashboard\/organizations\/[a-f0-9-]+\/campaigns\/[a-f0-9-]+/,
    heading: /.+/,
    sidebarRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    accessRoles: ["WFC_ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
    denyBehavior: "redirect",
    requiresOrgContext: true,
    requiresFundraiserContext: true,
    ctas: [
      {
        label: /add participant/i,
        visibleFor: ["WFC_ADMIN", "SALES_REPRESENTATIVE", "ORGANIZATION_ADMIN", "ORGANIZATION_STAFF"],
      },
    ],
  },
  {
    id: "users",
    path: "/dashboard/users",
    heading: /members/i,
    sidebarLabel: "Members",
    sidebarRoles: ["WFC_ADMIN"],
    accessRoles: ["WFC_ADMIN"],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "permissions",
    path: "/dashboard/permissions",
    heading: /permissions/i,
    sidebarLabel: "Permissions",
    sidebarRoles: ["WFC_ADMIN"],
    accessRoles: ["WFC_ADMIN"],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "email-templates",
    path: "/dashboard/email-templates",
    heading: /email templates/i,
    sidebarLabel: "Email Templates",
    sidebarRoles: ["WFC_ADMIN"],
    accessRoles: ["WFC_ADMIN"],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "chat",
    path: "/dashboard/chat",
    heading: /messages/i,
    sidebarLabel: "Messages",
    sidebarRoles: [
      "SALES_MANAGER",
      "SALES_REPRESENTATIVE",
      "ORGANIZATION_ADMIN",
      "ORGANIZATION_STAFF",
      "PARENT",
      "PARTICIPANT",
    ],
    accessRoles: [
      "SALES_MANAGER",
      "SALES_REPRESENTATIVE",
      "ORGANIZATION_ADMIN",
      "ORGANIZATION_STAFF",
      "PARENT",
      "PARTICIPANT",
    ],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "campaigns",
    path: "/dashboard/campaigns",
    heading: /fundraisers/i,
    sidebarLabel: "Fundraisers",
    sidebarRoles: ["PARTICIPANT", "PARENT"],
    accessRoles: ["PARTICIPANT", "PARENT"],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "prizes",
    path: "/dashboard/prizes",
    heading: /prizes/i,
    sidebarLabel: "Prizes",
    sidebarRoles: ["PARTICIPANT"],
    accessRoles: ["PARTICIPANT"],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "payments",
    path: "/dashboard/payments",
    heading: /payments/i,
    sidebarLabel: "Payments",
    sidebarRoles: ["PARTICIPANT", "PARENT"],
    accessRoles: ["PARTICIPANT", "PARENT"],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "documents",
    path: "/dashboard/documents",
    heading: /documents/i,
    sidebarLabel: "Permission Slips",
    sidebarRoles: ["PARTICIPANT", "PARENT"],
    accessRoles: ["PARTICIPANT", "PARENT"],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "inventory",
    path: "/dashboard/inventory",
    heading: /inventory/i,
    sidebarLabel: "Inventory",
    sidebarRoles: ["PARENT"],
    accessRoles: ["PARENT"],
    denyBehavior: "redirect",
    ctas: [],
  },
  {
    id: "documentation",
    path: "https://docs.worldsfinestchocolate.com",
    heading: /documentation/i,
    sidebarLabel: "Documentation",
    sidebarRoles: "all",
    accessRoles: "all",
    isExternal: true,
    ctas: [],
  },
  {
    id: "payment-portal",
    path: "https://payments.worldsfinestchocolate.com",
    heading: /payment/i,
    sidebarLabel: "Payment Portal",
    sidebarRoles: "all",
    accessRoles: "all",
    isExternal: true,
    ctas: [],
  },
]

function resolveRoles(roles: Role[] | "all"): Role[] {
  return roles === "all" ? ALL_TESTABLE_ROLES : roles
}

function getRolesWithoutAccess(screen: ScreenDefinition): Role[] {
  const allowed = new Set(resolveRoles(screen.accessRoles))
  return ALL_TESTABLE_ROLES.filter(r => !allowed.has(r))
}

export { SCREENS, ALL_TESTABLE_ROLES, resolveRoles, getRolesWithoutAccess }
export type { ScreenDefinition, CtaCheck, Role, DenyBehavior }
