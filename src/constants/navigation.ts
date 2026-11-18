import {
  BookOpenText,
  Building2,
  CreditCard,
  Files,
  Home,
  Mail,
  Megaphone,
  MessagesSquare,
  Receipt,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react"

import { type NavItem } from "@/components/ui/sidebar/app-sidebar"
import { RolesEnum } from "@/constants/roles"

export enum NavigationRoutesEnum {
  CAMPAIGNS = "/dashboard/campaigns",
  CHAT = "/dashboard/chat",
  DOCUMENTS = "/dashboard/documents",
  INVENTORY = "/dashboard/inventory",
  ORGANIZATIONS = "/dashboard/organizations",
  PAYMENTS = "/dashboard/payments",
  PERMISSIONS = "/dashboard/permissions",
  EMAIL_TEMPLATES = "/dashboard/email-templates",
  PRIZES = "/dashboard/prizes",
  USERS = "/dashboard/users",
  DOCUMENTATION = "/dashboard/documentation",
  DASHBOARD = "/dashboard",
  PAYMENT_PORTAL = "/payment",
}

export const NAVIGATION_ITEMS_BY_ROUTE: Record<NavigationRoutesEnum, NavItem> = {
  [NavigationRoutesEnum.DASHBOARD]: {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  [NavigationRoutesEnum.USERS]: {
    title: "Members",
    url: "/dashboard/users",
    icon: Users,
    roles: [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN],
  },
  [NavigationRoutesEnum.ORGANIZATIONS]: {
    title: "Organizations",
    url: "/dashboard/organizations",
    icon: Building2,
    roles: [
      RolesEnum.ADMIN,
      RolesEnum.WFC_ADMIN,
      RolesEnum.SALES_MANAGER,
      RolesEnum.SALES_REPRESENTATIVE,
      RolesEnum.ORGANIZATION_ADMIN,
      RolesEnum.ORGANIZATION_STAFF,
    ],
  },
  [NavigationRoutesEnum.DOCUMENTS]: {
    title: "Permission Slips",
    url: "/dashboard/documents",
    icon: Files,
    roles: [RolesEnum.PARTICIPANT, RolesEnum.PARENT],
  },
  [NavigationRoutesEnum.PRIZES]: {
    title: "Prizes",
    url: "/dashboard/prizes",
    icon: Trophy,
    roles: [RolesEnum.PARTICIPANT],
  },
  [NavigationRoutesEnum.CAMPAIGNS]: {
    title: "Fundraisers",
    url: "/dashboard/campaigns",
    icon: Megaphone,
    roles: [RolesEnum.PARTICIPANT, RolesEnum.PARENT],
  },
  [NavigationRoutesEnum.PERMISSIONS]: {
    title: "Permissions",
    url: "/dashboard/permissions",
    icon: ShieldCheck,
    roles: [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN],
  },
  [NavigationRoutesEnum.EMAIL_TEMPLATES]: {
    title: "Email Templates",
    url: "/dashboard/email-templates",
    icon: Mail,
    roles: [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN],
  },
  [NavigationRoutesEnum.PAYMENTS]: {
    title: "Payments",
    url: "/dashboard/payments",
    icon: Receipt,
    roles: [RolesEnum.PARTICIPANT, RolesEnum.PARENT],
  },
  [NavigationRoutesEnum.CHAT]: {
    title: "Messages",
    url: "/dashboard/chat",
    icon: MessagesSquare,
    roles: [
      RolesEnum.ADMIN,
      RolesEnum.PARTICIPANT,
      RolesEnum.PARENT,
      RolesEnum.ORGANIZATION_STAFF,
      RolesEnum.ORGANIZATION_ADMIN,
      RolesEnum.SALES_REPRESENTATIVE,
      RolesEnum.SALES_MANAGER,
    ],
  },
  [NavigationRoutesEnum.INVENTORY]: {
    title: "Inventory",
    url: "/dashboard/inventory",
    icon: Trophy,
    roles: [RolesEnum.PARENT],
  },
  [NavigationRoutesEnum.DOCUMENTATION]: {
    title: "Documentation",
    url: "/documentation",
    icon: BookOpenText,
    openInNewTab: true,
  },
  [NavigationRoutesEnum.PAYMENT_PORTAL]: {
    title: "Payment Portal",
    url: "/payment",
    icon: CreditCard,
    openInNewTab: true,
  },
}
