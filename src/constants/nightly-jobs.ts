export enum NightlyJobNameEnum {
  ORGANIZATION_SYNC = "ORGANIZATION_SYNC",
  FC_REPORT = "FC_REPORT",
  DIGITAL_PAYMENTS_REPORT = "DIGITAL_PAYMENTS_REPORT",
}

export enum NightlyJobStatusEnum {
  SUCCESS = "success",
  FAILURE = "failure",
  PARTIAL_SUCCESS = "partial-success",
}

export interface NightlyJobRecipients {
  to?: string[] | null
  cc?: string[] | null
}

// Evaluated in UTC (Heroku Scheduler's clock). `dayOfWeek`: 0 = Sunday ... 6 = Saturday.
export type NightlyJobSchedule =
  | { frequency: "weekly"; dayOfWeek: number }
  | { frequency: "monthly"; dayOfMonth: number }

export const ORGANIZATION_SYNC_EMAIL_SUBJECT = "Status of Organizations sync from Salesforce"
