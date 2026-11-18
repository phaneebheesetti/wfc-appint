import { type Metadata } from "next"

import { env } from "@/env"

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Shop Page",
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
