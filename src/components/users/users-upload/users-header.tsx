import { CircleAlert, CircleCheck, Users, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

interface UsersHeaderProps {
  organizationId: string
  campaignId?: string
  totalErrorCount: number
  isSaving: boolean
  handleUpload: () => void
  uploadProgress: number
}

export function UsersHeader({
  totalErrorCount,
  organizationId,
  campaignId,
  isSaving,
  handleUpload,
  uploadProgress,
}: UsersHeaderProps) {
  return (
    <div className="flex flex-row justify-between">
      {totalErrorCount > 0 && (
        <div className="flex flex-col gap-2 rounded-md">
          <div className="font-medium text-sm bg-yellow-50 w-fit flex items-center gap-2 py-2 px-3 rounded-full">
            <CircleAlert className="w-5 h-5 text-yellow-800" />
            Review & Fix Issues Before Uploading: {totalErrorCount} error
            {totalErrorCount > 1 ? "s" : ""} detected
          </div>
          <div className="mt-1 text-muted-foreground text-sm">
            Some fields need updates. Look for cells that need correction.
          </div>
        </div>
      )}

      {totalErrorCount === 0 && (
        <div className="flex flex-col gap-2 rounded-md">
          <div className="font-medium text-sm bg-green-50 w-fit flex items-center gap-2 py-2 px-3 rounded-full">
            <CircleCheck className="w-5 h-5 text-green-800" />
            All fields are correctly filled.
          </div>
          <div className="mt-1 text-muted-foreground text-sm">Click Upload Participants to continue.</div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-row items-center gap-2">
          <Link
            href={
              campaignId
                ? `/dashboard/organizations/${organizationId}/campaigns/${campaignId}#participants`
                : `/dashboard/organizations/${organizationId}#participants`
            }
          >
            <Button variant="secondary">
              <X />
              Cancel
            </Button>
          </Link>

          <Button onClick={handleUpload} disabled={totalErrorCount > 0 || isSaving}>
            <Users />
            {isSaving ? "Uploading..." : "Upload Participants"}
          </Button>
        </div>

        {isSaving && (
          <div className="flex flex-row items-center gap-2">
            <div className="text-muted-foreground text-sm">Upload Progress: {Math.round(uploadProgress * 100)}%</div>
          </div>
        )}
      </div>
    </div>
  )
}
