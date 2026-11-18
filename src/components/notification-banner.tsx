"use client"

import { X } from "lucide-react"
import { useState } from "react"
import { useIsClient } from "usehooks-ts"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button/button"

const BANNER_DISMISSED_KEY = "notification-banner-dismissed"
const BANNER_EXPIRY_DATE = new Date("2026-06-03T18:30:00Z")

export function NotificationBanner() {
  const isClient = useIsClient()
  const [dismissed, setDismissed] = useState(false)

  function handleClose() {
    localStorage.setItem(BANNER_DISMISSED_KEY, "true")
    setDismissed(true)
  }

  if (
    !isClient ||
    new Date() >= BANNER_EXPIRY_DATE ||
    dismissed ||
    localStorage.getItem(BANNER_DISMISSED_KEY) === "true"
  )
    return null

  return (
    <Alert className="fixed sm:bottom-8 bottom-12 z-[2] flex items-center justify-between rounded-none pt-2 pb-2 border-none bg-primary text-white">
      <AlertDescription className="text-sm text-center md:ml-[230px]">
        <div className="mr-[30px]">
          A DB maintenance is scheduled by our DB service provider between 2:30pm EDT to 3pm EDT on June 3rd 2026.{" "}
          <br />
          <strong>Hence we kindly request you to not input any data into the application during this time.</strong>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          aria-label="Close banner"
          className="absolute top-0 right-3"
        >
          {" "}
          <X />{" "}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
