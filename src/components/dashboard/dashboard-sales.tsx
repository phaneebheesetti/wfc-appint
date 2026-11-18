"use client"

import { Plus } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function DashboardSales() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-sm text-muted-foreground">
        Let&apos;s create an organization to kick things off. <br />
        After that, you&apos;ll be ready to launch your first campaign!
      </div>
      <div className="flex justify-center">
        <Link href="/dashboard/organizations/#create-form">
          <Button>
            <Plus /> Create Organization
          </Button>
        </Link>
      </div>
    </div>
  )
}
