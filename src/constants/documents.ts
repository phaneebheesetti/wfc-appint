import { FileKey, FileText, type LucideIcon } from "lucide-react"

import { ColorEnum } from "@/constants/colors"

export enum DocumentsTypeEnum {
  DOCUMENT = "document",
  PERMISSION_SLIP = "permission_slip",
}

type DocumentDetails = {
  label: string
  icon: LucideIcon
  color: ColorEnum
}

export const DOCUMENTS_DETAILS: Record<DocumentsTypeEnum, DocumentDetails> = {
  [DocumentsTypeEnum.DOCUMENT]: {
    label: "Document",
    icon: FileText,
    color: ColorEnum.BLUE,
  },
  [DocumentsTypeEnum.PERMISSION_SLIP]: {
    label: "Permission Slip",
    icon: FileKey,
    color: ColorEnum.GREEN,
  },
}
