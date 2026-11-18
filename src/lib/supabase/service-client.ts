import { createClient as createServiceRoleClient } from "@supabase/supabase-js"

import { env } from "@/env"

export function createServiceClient() {
  return createServiceRoleClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}

export interface SupabaseOrganization {
  id: string
  contact_info_id?: string | null
  created_by_user_id: string
  admin_user_id?: string | null
  encryption_key_secret_id?: string | null
  stripe_connected_account_id?: string | null
  name?: string | null
  street?: string | null
  city?: string | null
  postal_code?: string | null
  state?: string | null
  country?: string
  deleted_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface SupabaseCampaign {
  id: string
  created_by_user_id: string
  organization_id: string
  sponsor_id: string
  name: string
  start_date: string
  end_date: string
  profit_share_percentage: number
  cases_goal: number
  cases_goal_free: number
  status: string
  digital_payment: boolean
  digital_permission_slip: boolean
  home_run_prizes_template: boolean
  prize_template_name: string | null
  deleted_at?: string | null
  created_at?: string
  updated_at?: string
  organizations?: SupabaseOrganization
}

export interface SupabaseCampaignUser {
  id: string
  campaign_id: string
  user_id: string
  organization_id: string
  permission_slip_signed_at?: string | null
  requested_case_transaction_at?: string | null
  created_at?: string
  updated_at?: string
  campaigns?: SupabaseCampaign
}

export interface SupabasePaymentLog {
  id: string
  created_by_user_id: string
  organization_id: string
  campaign_id?: string | null
  user_id?: string | null
  type: string
  status: string
  amount_cents: number
  fee_cents: number
  transaction_id?: string | null
  description?: string | null
  deleted_at?: string | null
  created_at?: string
  updated_at?: string
  createdByUser?: string
}

export interface SupabaseUser {
  id: string
  clerk_id?: string | null
  clerk_external_id?: string | null
  contact_info_id?: string | null
  parent_user_id?: string | null
  invited_by_user_id?: string | null
  encryption_key_secret_id?: string | null
  status: string
  role: string
  pin?: string | null
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  grade?: string | null
  teacher_name?: string | null
  encrypted?: boolean
  clerk_invitation_url?: string | null
  clerk_invitation_sent_at?: string | null
  deleted_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface SupabaseOrganizationUser {
  id: string
  organization_id: string
  user_id: string
  eligible: boolean
  eligible_updated_at?: string | null
  eligible_updated_by_user_id?: string | null
  created_at?: string
  updated_at?: string
  organizations?: SupabaseOrganization
  user?: SupabaseUser
}
