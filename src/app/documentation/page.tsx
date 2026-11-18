"use client"

import { ExternalLink } from "lucide-react"
import { useMemo } from "react"

import { Button } from "@/components/ui/button/button"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"

/**
 * Documentation tier hierarchy (higher index = higher in hierarchy).
 * A role sees all PDFs whose tier index is <= their max tier index.
 */
const DOCUMENTATION_TIER_ORDER = ["parent", "org_admin", "sales_rep"] as const
type DocumentationTier = (typeof DOCUMENTATION_TIER_ORDER)[number]

interface DocumentationPdf {
  title: string
  url: string
  tier: DocumentationTier
}

// Display order: hierarchy first (sales rep → org admin → parent last)
const DOCUMENTATION_PDFS: DocumentationPdf[] = [
  {
    title: "Addressing Concerns with Stripe and Digital Payment (Internal)",
    url: "/documentation/sales-representative-digital-payments.pdf",
    tier: "sales_rep",
  },
  {
    title: "WFC Platform Guide - Fundraising Consultants",
    url: "/documentation/sales-representative.pdf",
    tier: "sales_rep",
  },
  {
    title: "Using Stripe and Digital Payment (For Schools)",
    url: "/documentation/organization-admin-digital-payments.pdf",
    tier: "org_admin",
  },
  {
    title: "WFC Platform Guide - Organization Admins",
    url: "/documentation/organization-admin.pdf",
    tier: "org_admin",
  },
  {
    title: "WFC Platform Guide - Parent Portal",
    url: "/documentation/parent.pdf",
    tier: "parent",
  },
  {
    title: "Digital Sales Page Guide",
    url: "/documentation/digital-sales-page.pdf",
    tier: "parent",
  },
]

const DOCUMENTATION_TIER_INDEX: Record<DocumentationTier, number> = Object.fromEntries(
  DOCUMENTATION_TIER_ORDER.map((tier, index) => [tier, index])
) as Record<DocumentationTier, number>

/** Role → max doc tier they can see. Add new roles here. Fallback (no role / not signed in) uses "parent". */
const MAX_DOCUMENTATION_TIER_BY_ROLE: Partial<Record<RolesEnum, DocumentationTier>> = {
  [RolesEnum.PARENT]: "parent",
  [RolesEnum.USER]: "parent",
  [RolesEnum.PARTICIPANT]: "parent",
  [RolesEnum.ORGANIZATION_ADMIN]: "org_admin",
  [RolesEnum.ORGANIZATION_STAFF]: "org_admin",
  [RolesEnum.SALES_REPRESENTATIVE]: "sales_rep",
  [RolesEnum.SALES_MANAGER]: "sales_rep",
  [RolesEnum.WFC_ADMIN]: "sales_rep",
  [RolesEnum.ADMIN]: "sales_rep",
}

function getDocumentationPdfsForRole(role: RolesEnum | null | undefined): DocumentationPdf[] {
  const maxTier = MAX_DOCUMENTATION_TIER_BY_ROLE[role ?? RolesEnum.PARENT] ?? "parent"
  const maxIndex = DOCUMENTATION_TIER_INDEX[maxTier]
  return DOCUMENTATION_PDFS.filter(pdf => DOCUMENTATION_TIER_INDEX[pdf.tier] <= maxIndex)
}

export default function DocumentationPage() {
  const { isLoading, loggedInRole } = useLoggedInUser()
  const pdfs = useMemo(() => getDocumentationPdfsForRole(loggedInRole ?? null), [loggedInRole])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  const { label, textColor } = ROLES_DETAILS[loggedInRole as RolesEnum] ?? ROLES_DETAILS[RolesEnum.PARENT]

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Documentation</h1>

      <div className="flex gap-1 text-sm text-muted-foreground">
        Showing documentation available for
        <div className={`font-medium ${textColor}`}>{label}</div>
      </div>

      <div className="flex flex-col gap-4">
        {pdfs.map(pdf => (
          <Button key={pdf.url} asChild>
            <a href={pdf.url} rel="noopener noreferrer" target="_blank">
              {pdf.title}
              <ExternalLink />
            </a>
          </Button>
        ))}
      </div>
    </div>
  )
}
