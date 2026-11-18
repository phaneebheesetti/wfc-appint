export enum EventGoalTypeEnum {
  FIRST_CASE_CHECKOUT = "first_case_checkout",
  FIRST_PAYMENT_TURNED_IN = "first_payment_turned_in",
  CASE_PAYMENT = "case_payment",
  ALL_PARTICIPANTS = "all_participants",
  PRIZE_QUALIFICATION = "prize_qualification",
}

export const EVENT_GOAL_TYPE_DETAILS: Record<EventGoalTypeEnum, { label: string }> = {
  [EventGoalTypeEnum.ALL_PARTICIPANTS]: {
    label: "All Participants",
  },
  [EventGoalTypeEnum.FIRST_CASE_CHECKOUT]: {
    label: "First Case Checkout",
  },
  [EventGoalTypeEnum.FIRST_PAYMENT_TURNED_IN]: {
    label: "First Payment Turned In",
  },
  [EventGoalTypeEnum.CASE_PAYMENT]: {
    label: "Case Level",
  },
  [EventGoalTypeEnum.PRIZE_QUALIFICATION]: {
    label: "Prize Qualification Required",
  },
}
