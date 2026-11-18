import { env } from "@/env"

import { PrizeGoalTypeEnum } from "./prize"

const PRIZE_ASSETS_VERSION = "v3"

export const prize_template_names = {
  HOME_RUN_ELEMENTARY_MIDDLE: "home-run-elementary-middle-school",
  HOME_RUN_MIDDLE_HIGH: "home-run-middle-high-school",
} as const

export type PrizeTemplateItem = {
  slug: string
  name: string
  description: string
  imagePath: string
  goalType: PrizeGoalTypeEnum
  casesGoal?: number
  position: number
}

export type PrizeTemplate = {
  slug: string
  name: string
  subtitle: string
  description: string
  flyerImagePath: string
  sortOrder: number
  items: PrizeTemplateItem[]
}

export const resolvePrizeAssetUrl = (assetPath: string) =>
  `${env.NEXT_PUBLIC_APP_URL}/prizes/${PRIZE_ASSETS_VERSION}/${assetPath}`

export const getPrizeTemplateName = (slug: string | null | undefined): string | null =>
  PRIZE_TEMPLATES.find(template => template.slug === slug)?.name ?? null

export const PRIZE_TEMPLATES: PrizeTemplate[] = [
  {
    slug: prize_template_names.HOME_RUN_ELEMENTARY_MIDDLE,
    name: "Home Run: Elementary - Middle School",
    subtitle: "Mission Chocolate",
    description: "Eight prize levels designed for elementary and middle school participants.",
    flyerImagePath: "flyers/home-run-elementary-middle-school.pdf",
    sortOrder: 1,
    items: [
      {
        slug: "checkout-first-case",
        name: "Checkout First Case",
        description: "Check out your first box, earn your first fidget spinner",
        imagePath: "middle-school/checkout-first-case.png",
        goalType: PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT,
        position: 1,
      },
      {
        slug: "first-payment-turned-in",
        name: "First Payment Turned In",
        description: "When you turn in your your money for the 1st box, you win a second fidget spinner",
        imagePath: "middle-school/first-payment-turned-in.png",
        goalType: PrizeGoalTypeEnum.FIRST_PAYMENT_TURNED_IN,
        position: 2,
      },
      {
        slug: "level-a",
        name: "Level A",
        description: "Sell 1 box and earn this drop-n-pop",
        imagePath: "middle-school/level-a.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 1,
        position: 3,
      },
      {
        slug: "level-b",
        name: "Level B",
        description: "Sell 2 boxes and earn these items plus level A",
        imagePath: "middle-school/level-b.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 2,
        position: 4,
      },
      {
        slug: "level-c",
        name: "Level C",
        description: "Sell 3 boxes and earn these items plus level A+B",
        imagePath: "middle-school/level-c-v.3.0.1.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 3,
        position: 5,
      },
      {
        slug: "level-d",
        name: "Level D",
        description: "Sell 5 boxes and earn this item plus level A+B+C",
        imagePath: "middle-school/level-d.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 5,
        position: 6,
      },
      {
        slug: "level-e",
        name: "Level E",
        description: "Sell 7 boxes and earn this item plus A+B+C+D",
        imagePath: "middle-school/level-e.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 7,
        position: 7,
      },
      {
        slug: "level-f",
        name: "Level F",
        description: "Sell 10 boxes and earn these items plus A+B+C+D+E",
        imagePath: "middle-school/level-f.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 10,
        position: 8,
      },
    ],
  },
  {
    slug: prize_template_names.HOME_RUN_MIDDLE_HIGH,
    name: "Home Run: Middle School - High School",
    subtitle: "Sweet Rewards",
    description: "Four prize levels designed for middle and high school participants.",
    flyerImagePath: "flyers/home-run-middle-high-school.pdf",
    sortOrder: 2,
    items: [
      {
        slug: "level-a",
        name: "Level A",
        description: "Sell 2 boxes and earn this prize",
        imagePath: "high-school/level-a.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 2,
        position: 1,
      },
      {
        slug: "level-b",
        name: "Level B",
        description: "Sell 3 boxes and earn these items plus Level A",
        imagePath: "high-school/level-b.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 3,
        position: 2,
      },
      {
        slug: "level-c",
        name: "Level C",
        description: "Sell 5 boxes and earn these items plus Level A + B",
        imagePath: "high-school/level-c.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 5,
        position: 3,
      },
      {
        slug: "level-d",
        name: "Level D",
        description: "Sell 10 boxes and earn these items plus Level A + B + C",
        imagePath: "high-school/level-d.png",
        goalType: PrizeGoalTypeEnum.CASE_PAYMENT,
        casesGoal: 10,
        position: 4,
      },
    ],
  },
]
