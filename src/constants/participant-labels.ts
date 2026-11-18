import { env } from "@/env"

export const IS_LABEL_CHANGE_ENABLED = env.NEXT_PUBLIC_FF_LABEL_CHANGE === "true"

export const GRADE_LABEL = IS_LABEL_CHANGE_ENABLED ? "Grade / Group" : "Grade"
export const TEACHER_LABEL = IS_LABEL_CHANGE_ENABLED ? "Teacher / Leader" : "Teacher"

export const GRADE_LABEL_LOWERCASE = GRADE_LABEL.toLowerCase()

export const CSV_GRADE_HEADER = IS_LABEL_CHANGE_ENABLED ? "grade_group" : "grade"
export const CSV_TEACHER_HEADER = IS_LABEL_CHANGE_ENABLED ? "teacher_leader" : "teacher_name"
export const PARTICIPANTS_UPLOAD_TEMPLATE_PATH = IS_LABEL_CHANGE_ENABLED
  ? "/download/participants-upload-grade-group.csv"
  : "/download/participants-upload.csv"
