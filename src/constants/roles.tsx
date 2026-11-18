import { Baby, Crown, type LucideIcon, ShieldUser, User, UserCog, UserStar } from "lucide-react"

export enum RolesEnum {
  USER = "user", // user with no permissions
  ADMIN = "admin", // admin with all permissions
  WFC_ADMIN = "wfc_admin",
  SALES_MANAGER = "sales_manager",
  SALES_REPRESENTATIVE = "sales_representative",
  ORGANIZATION_ADMIN = "organization_admin",
  ORGANIZATION_STAFF = "organization_staff",
  PARTICIPANT = "participant",
  PARENT = "parent",
}

type RoleDetails = {
  label: string
  icon: LucideIcon
  textColor: string
  bgColor: string
}

export const ROLES_DETAILS: Record<RolesEnum, RoleDetails> = {
  [RolesEnum.ADMIN]: {
    label: "Admin",
    icon: Crown,
    textColor: "text-red-500",
    bgColor: "bg-red-50 hover:bg-red-100",
  },
  [RolesEnum.WFC_ADMIN]: {
    label: "WFC Admin",
    icon: ShieldUser,
    textColor: "text-red-500",
    bgColor: "bg-red-50 hover:bg-red-100",
  },
  [RolesEnum.SALES_MANAGER]: {
    label: "Sales Manager",
    icon: UserStar,
    textColor: "text-green-500",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  [RolesEnum.SALES_REPRESENTATIVE]: {
    label: "Fundraising Consultant",
    icon: UserStar,
    textColor: "text-green-500",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  [RolesEnum.ORGANIZATION_ADMIN]: {
    label: "Organization Admin",
    icon: UserCog,
    textColor: "text-blue-500",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  [RolesEnum.ORGANIZATION_STAFF]: {
    label: "Organization Staff",
    icon: UserCog,
    textColor: "text-blue-500",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  [RolesEnum.USER]: {
    label: "User",
    icon: User,
    textColor: "text-gray-500",
    bgColor: "bg-gray-50 hover:bg-gray-100",
  },
  [RolesEnum.PARTICIPANT]: {
    label: "Participant",
    icon: Baby,
    textColor: "text-purple-500",
    bgColor: "bg-purple-50 hover:bg-purple-100",
  },
  [RolesEnum.PARENT]: {
    label: "Parent",
    icon: User,
    textColor: "text-purple-500",
    bgColor: "bg-purple-50 hover:bg-purple-100",
  },
}

export const COST_VISIBLE_ROLES = [RolesEnum.ADMIN, RolesEnum.SALES_MANAGER, RolesEnum.SALES_REPRESENTATIVE]

export const MULTI_ROLE_ELIGIBLE_ROLES: ReadonlyArray<RolesEnum> = [
  RolesEnum.WFC_ADMIN,
  RolesEnum.SALES_REPRESENTATIVE,
  RolesEnum.ORGANIZATION_ADMIN,
  RolesEnum.ORGANIZATION_STAFF,
  RolesEnum.PARENT,
]

export const isMultiRoleEligible = (role: RolesEnum): boolean => MULTI_ROLE_ELIGIBLE_ROLES.includes(role)

// Explicit pairs of roles that may co-exist as sibling rows under the same
// email in the multi-role row model. Membership in MULTI_ROLE_ELIGIBLE_ROLES
// only says a role CAN take part in multi-role at all — it does not say which
// other roles it may pair with. WFC_ADMIN and SALES_REPRESENTATIVE are only
// allowed to combine with PARENT, not with each other or with the
// organization roles.
const MULTI_ROLE_COMBINATIONS: ReadonlyArray<readonly [RolesEnum, RolesEnum]> = [
  [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF],
  [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.PARENT],
  [RolesEnum.ORGANIZATION_STAFF, RolesEnum.PARENT],
  [RolesEnum.WFC_ADMIN, RolesEnum.PARENT],
  [RolesEnum.SALES_REPRESENTATIVE, RolesEnum.PARENT],
]

export const canRolesCombine = (roleA: RolesEnum, roleB: RolesEnum): boolean =>
  MULTI_ROLE_COMBINATIONS.some(([x, y]) => (x === roleA && y === roleB) || (x === roleB && y === roleA))

export const ALLOWED_INVITE_ROLES_BY_ROLE: Record<RolesEnum, RolesEnum[]> = {
  [RolesEnum.ADMIN]: [
    RolesEnum.WFC_ADMIN,
    RolesEnum.SALES_MANAGER,
    RolesEnum.SALES_REPRESENTATIVE,
    RolesEnum.ORGANIZATION_ADMIN,
    RolesEnum.ORGANIZATION_STAFF,
    RolesEnum.PARTICIPANT,
    RolesEnum.PARENT,
    RolesEnum.USER,
  ],

  [RolesEnum.WFC_ADMIN]: [
    RolesEnum.WFC_ADMIN,
    RolesEnum.SALES_MANAGER,
    RolesEnum.SALES_REPRESENTATIVE,
    RolesEnum.ORGANIZATION_ADMIN,
    RolesEnum.ORGANIZATION_STAFF,
    RolesEnum.PARENT,
    RolesEnum.USER,
  ],

  [RolesEnum.SALES_MANAGER]: [
    RolesEnum.SALES_REPRESENTATIVE,
    RolesEnum.ORGANIZATION_ADMIN,
    RolesEnum.ORGANIZATION_STAFF,
  ],
  [RolesEnum.SALES_REPRESENTATIVE]: [
    RolesEnum.ORGANIZATION_ADMIN,
    RolesEnum.ORGANIZATION_STAFF,
    RolesEnum.PARTICIPANT,
    RolesEnum.PARENT,
  ],

  [RolesEnum.ORGANIZATION_ADMIN]: [RolesEnum.ORGANIZATION_STAFF, RolesEnum.PARTICIPANT, RolesEnum.PARENT],
  [RolesEnum.ORGANIZATION_STAFF]: [RolesEnum.PARTICIPANT, RolesEnum.PARENT],

  [RolesEnum.PARTICIPANT]: [],
  [RolesEnum.PARENT]: [],
  [RolesEnum.USER]: [],
}
