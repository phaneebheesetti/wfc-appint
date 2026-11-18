import type { RolesEnum } from "@/constants/roles"

export {}

declare global {
  interface CustomJwtSessionClaims {
    user_role?: RolesEnum
    user_id?: string
    // Mirrors publicMetadata.roles so the middleware can validate the per-browser
    // wfc_active_role cookie against the live role set without a Clerk API call
    // per request. Requires the Clerk JWT session template to project
    // {{user.public_metadata.roles}} as `user_roles`.
    user_roles?: { databaseId: string; role: RolesEnum }[]
  }

  interface UserPublicMetadata {
    role: RolesEnum
    roles?: { databaseId: string; role: RolesEnum }[]
    databaseId: string
    phone?: string
  }
}
