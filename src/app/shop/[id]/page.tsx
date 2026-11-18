import { eq } from "drizzle-orm"
import { type Metadata } from "next"
import { Suspense } from "react"
import { z } from "zod"

import { NotFoundShop } from "@/components/not-found"
import { Shop } from "@/components/shop"
import { env } from "@/env"
import { db } from "@/server/db"
import { digitalSalesInformation } from "@/server/db/schema"

interface ShopPageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Per-fundraiser Open Graph metadata for Facebook (and other) link previews.
 * Runs server-side on every request, so preview content always reflects the
 * latest fundraiser name/message with no manual refresh step on our end -
 * the only caching involved is Facebook's own scrape cache (see share-flow docs)
 */
export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { id } = await params

  if (!z.uuid().safeParse(id).success) {
    return { title: "Shop Page" }
  }

  let salesPage

  try {
    salesPage = await db.query.digitalSalesInformation.findFirst({
      where: eq(digitalSalesInformation.id, id),
      with: { participant: true, fundraiser: true },
    })
  } catch (error) {
    // Don't let a DB hiccup break metadata resolution for the whole page
    console.error("generateMetadata: failed to load sales page:", error)
    return { title: "Shop Page" }
  }

  if (!salesPage) {
    return { title: "Shop Page" }
  }

  const fullName = salesPage.participant?.fullName ?? "Fundraiser"
  const campaignName = salesPage.fundraiser?.name
  const personalMessage = salesPage.digitalSalesDetails?.personal_message?.message?.trim()

  const title = campaignName ? `${fullName} — ${campaignName}` : fullName
  const description = personalMessage || `Support ${fullName} with World's Finest Chocolate!`
  const canonicalUrl = `${env.NEXT_PUBLIC_APP_URL}/shop/${id}`
  const ogImageUrl = `${env.NEXT_PUBLIC_APP_URL}/digital-sales/facebook-preview-v2.jpg`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 5000,
          height: 2625,
        },
      ],
    },
  }
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { id } = await params

  if (!z.uuid().safeParse(id).success) {
    return <NotFoundShop />
  }

  const salesPage = await db.query.digitalSalesInformation.findFirst({
    where: eq(digitalSalesInformation.id, id),
  })

  if (!salesPage) {
    return <NotFoundShop />
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <p className="text-lg">Loading...</p>
        </div>
      }
    >
      <Shop />
    </Suspense>
  )
}
