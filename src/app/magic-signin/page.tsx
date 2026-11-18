"use client"

import { Suspense } from "react"

import { MagicSignIn } from "@/components/magic-signin"

export default function MagicSignInPage() {
  return (
    <Suspense>
      <MagicSignIn />
    </Suspense>
  )
}
