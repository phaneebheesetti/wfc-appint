import { RolesEnum } from "./roles"

export type PrizeTemplateSelection = string | null

export const CREATE_MY_OWN_LABEL = "Create my own"
export const CREATE_MY_OWN_SUBTITLE = "Build a custom prize structure for this fundraiser."

export const HOME_RUN_PRIZE_TEMPLATE_TOGGLE_LABEL = "Use Home Run Prizes Template"
export const HOME_RUN_PRIZE_TEMPLATE_INFO = `Activate predefined prizes for the fundraiser. Once this is checked, any previously set up custom prize programs will be set to inactive (which can be reactivated manually if needed).`
export const HOME_RUN_PRIZE_TEMPLATE_SINGLE_USE_HINT = "Only one prize template can be used per fundraiser."

export const HOME_RUN_PRIZE_TEMPLATE_ROLES: RolesEnum[] = [
  RolesEnum.ADMIN,
  RolesEnum.WFC_ADMIN,
  RolesEnum.SALES_MANAGER,
  RolesEnum.SALES_REPRESENTATIVE,
]
