export enum PrizeGoalTypeEnum {
  FIRST_CASE_CHECKOUT = "first_case_checkout",
  FIRST_PAYMENT_TURNED_IN = "first_payment_turned_in",
  CASE_PAYMENT = "case_payment",
  ALL_PARTICIPANTS = "all_participants",
}

export const PRIZE_GOAL_TYPE_DETAILS: Record<PrizeGoalTypeEnum, { label: string; howToBeEligible: string }> = {
  [PrizeGoalTypeEnum.ALL_PARTICIPANTS]: {
    label: "All Participants",
    howToBeEligible: "All participants unlock this prize",
  },
  [PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT]: {
    label: "First Case Checkout",
    howToBeEligible: "Check out your first case to unlock this prize",
  },
  [PrizeGoalTypeEnum.FIRST_PAYMENT_TURNED_IN]: {
    label: "First Payment Turned In",
    howToBeEligible: "Turn in your money for the first case to unlock this prize",
  },
  [PrizeGoalTypeEnum.CASE_PAYMENT]: {
    label: "Case Level",
    howToBeEligible: "Sell more cases to unlock this prize",
  },
}
