"use client"

import { Suspense } from "react"

import { PaymentSuccess } from "@/components/payment"

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccess />
    </Suspense>
  )
}
