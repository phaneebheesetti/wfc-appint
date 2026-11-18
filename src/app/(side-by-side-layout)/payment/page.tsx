import { type Metadata } from "next"
import { Suspense } from "react"

import { Payment } from "@/components/payment"

export const metadata: Metadata = {
  title: "Payment",
}

export default function PaymentPage() {
  return (
    <Suspense>
      <Payment />
    </Suspense>
  )
}
