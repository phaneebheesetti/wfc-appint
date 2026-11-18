import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api } from "@/trpc/react"

interface CampaignInventoryAlertProps {
  campaignId: string
}

export function CampaignInventoryAlert({ campaignId }: CampaignInventoryAlertProps) {
  const { data = { casesCheckedOut: 0, casesDelivered: 0 }, isLoading } =
    api.casesTransactions.getSummaryByCampaignId.useQuery({ campaignId })
  if (isLoading) return null

  if (data?.casesCheckedOut <= data?.casesDelivered) return null

  const handleGoToInventory = () => {
    window.location.hash = "inventory"
  }

  return (
    <Alert variant="destructive">
      <AlertTitle className="flex items-center gap-2">
        <AlertCircle className="size-4" />
        Please update inventory
      </AlertTitle>
      <AlertDescription>
        Total cases checked out is greater than total cases delivered.
        <br />
        Cases checked out: {data?.casesCheckedOut}
        <br />
        Cases delivered: {data?.casesDelivered}
        <br />
        <Button variant="outline" onClick={handleGoToInventory}>
          Go to inventory
        </Button>
      </AlertDescription>
    </Alert>
  )
}
