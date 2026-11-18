import { type UserSelect } from "@/server/db/schema"

export type UsersBulkResult =
  | { status: "ok"; user: UserSelect }
  | { status: "error"; email: string | null; phone: string | null; message: string }
