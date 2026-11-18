import { type Metadata } from "next"

import { APP_NAME } from "@/constants/app"
import { createServiceClient } from "@/lib/supabase/service-client"

type LayoutProps = {
  params: Promise<{ organizationId: string; campaignId: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { organizationId, campaignId } = await params

  const supabaseServiceClient = createServiceClient()
  const { data } = await supabaseServiceClient
    .from("campaigns")
    .select("name")
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .single()

  const campaignName = data?.name ?? "Fundraiser"

  return {
    title: `${campaignName} - ${APP_NAME}`,
  }
}

export default function CampaignsLayout({ children }: LayoutProps) {
  return children
}
