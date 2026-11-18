import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { ShareQrDialog } from "@/components/share-qr-dialog"
import { Button } from "@/components/ui/button"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type DigitalSalesDetails } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"

interface EnableSalesPageCardProps {
  fundraiserId: string
  participantId: string
  details: DigitalSalesDetails
}

export function EnableSalesPageCard({ fundraiserId, participantId, details }: EnableSalesPageCardProps) {
  const utils = api.useUtils()
  const router = useRouter()
  const goToSharePage = () => router.push(`/dashboard/campaigns/${fundraiserId}/share-page?userId=${participantId}`)
  const [qrOpen, setQrOpen] = useState(false)
  const salesPageEnabled = !!details.enable_sales_page?.is_active

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shop/${details.enable_sales_page?.url ?? ""}`

  const toggleSalesPage = api.digitalSalesInformation.toggleSalesPage.useMutation({
    onSuccess: async () => {
      await utils.digitalSalesInformation.getByParticipantAndFundraiser.invalidate({ participantId, fundraiserId })
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  })

  const searchParams = useSearchParams()

  const userId = searchParams.get("userId")

  const { loggedInUserId, loggedInRole } = useLoggedInUser()

  const userIdToUse = loggedInRole === RolesEnum.PARENT ? userId : loggedInUserId

  const { data: user } = api.users.getById.useQuery(
    {
      id: userIdToUse!,
    },
    {
      enabled: !!userIdToUse,
    }
  )

  const firstName = user?.firstName ?? ""

  return (
    <div className="rounded-card border bg-card p-4 shadow-elev-1 ">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="font-bold">Enable Your Sale Page</div>
          <p className="text-muted-foreground">
            Friends and family can buy online for you to deliver to them in-person
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toggleSalesPage.mutate({
              participantId,
              fundraiserId,
              isActive: !salesPageEnabled,
            })
          }
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
            salesPageEnabled ? "bg-primary" : "bg-[#dfd0b3]"
          )}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200",
              salesPageEnabled && "translate-x-5"
            )}
          />
        </button>
      </div>
      <div className="mt-4">
        {salesPageEnabled ? (
          <>
            <div className="rounded-control border bg-[#fbf6eb] p-3">
              <p className="break-all text-sm text-primary">{shareUrl}</p>
            </div>

            <div className="mt-4 flex justify-center gap-3">
              <Button
                className="border bg-white hover:bg-white active:bg-white text-muted-foreground w-full sm:w-auto sm:px-10"
                onClick={() => setQrOpen(true)}
              >
                QR Code
              </Button>
              <Button
                className="bg-success hover:bg-success active:bg-success w-full sm:w-auto sm:px-10"
                onClick={goToSharePage}
              >
                Share
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-control border bg-[#fbf6eb] p-3">
            <p className="text-sm text-muted-foreground text-center ">
              You&apos;re all set! Turn on your page to start accepting orders.
            </p>
          </div>
        )}
      </div>
      <ShareQrDialog open={qrOpen} onOpenChange={setQrOpen} url={shareUrl} firstName={firstName} />
    </div>
  )
}
