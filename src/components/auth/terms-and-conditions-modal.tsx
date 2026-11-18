"use client"

import { FileText } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Modal } from "@/components/ui/modal"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

export function TermsAndConditionsModal() {
  const { isLoaded, isSignedIn, loggedInUserId, loggedInRole } = useLoggedInUser()
  const utils = api.useUtils()
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    setAgreed(false)
  }, [loggedInRole])

  const { data: dbUser } = api.users.getById.useQuery({ id: loggedInUserId! }, { enabled: !!loggedInUserId })

  const acceptMutation = api.users.acceptTermsAndConditions.useMutation({
    onSuccess: () => void utils.users.getById.invalidate({ id: loggedInUserId! }),
  })

  const open = !!(isLoaded && isSignedIn && dbUser && !dbUser.acceptedTermsAndConditions)

  return (
    <Modal
      open={open}
      onOpenChange={() => {}}
      title="Accept Terms & Conditions"
      icon={FileText}
      showCloseButton={false}
    >
      <div className="flex flex-col gap-4 mt-0.5">
        <label htmlFor="accept-terms" className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            id="accept-terms"
            checked={agreed}
            onCheckedChange={checked => setAgreed(checked === true)}
            className="mt-0.5 focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <span>
            I have read and agree to the WFC{" "}
            <a
              href="/wfc-employee-terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
              onClick={e => e.stopPropagation()}
            >
              Terms and Conditions
            </a>
            .
          </span>
        </label>
        <Button
          onClick={() => acceptMutation.mutate({ id: loggedInUserId!, role: loggedInRole! })}
          disabled={!agreed || !loggedInRole || acceptMutation.isPending}
          className="w-full"
        >
          {acceptMutation.isPending ? "Saving…" : "I Accept"}
        </Button>
      </div>
    </Modal>
  )
}
