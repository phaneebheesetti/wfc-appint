"use client"

import { useRouter } from "next/navigation"

type RequestConfirmationProps = {
  firstName: string
  email: string
  packageLabel: string
  buyerName: string
}

export function RequestConfirmation({ firstName, email, packageLabel, buyerName }: RequestConfirmationProps) {
  const router = useRouter()

  const name = buyerName.trim() || "friend"

  const steps = [
    {
      title: `${firstName}'s family reviews your request`,
      description: "They'll confirm when this product is available.",
    },
    {
      title: "You'll receive a notification",
      description: "With a secure payment link once confirmed.",
    },
    {
      title: `${firstName} delivers in person`,
      description: "After payment is complete.",
    },
  ]

  return (
    <>
      <div className="bg-[#d97706] px-[18px] pb-[26px] pt-5 text-center">
        <div className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white/40 bg-[#f9e4b7] text-[34px]">
          🐱
        </div>

        <h1 className="mb-[3px] text-xl font-semibold text-white">Request Sent!</h1>

        <p className="text-[13px] text-white/70">Thanks, {name}! We&apos;ll be in touch soon.</p>
      </div>

      <div className="space-y-[10px] p-[14px]">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 text-left text-xs font-semibold uppercase tracking-[0.5px] text-primary">Your Request</h2>

          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">Requested</span>
            <span className="text-[13px] font-semibold text-primary">{packageLabel}</span>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 text-left text-xs font-semibold uppercase tracking-[0.5px] text-primary">
            What happens next
          </h2>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-start gap-3 rounded-lg bg-[#eaf7ec] p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">
                  {index + 1}
                </div>

                <div>
                  <div className="text-[13px] font-semibold text-primary">{step.title}</div>
                  <div className="text-[13px] text-muted-foreground">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-[13px] font-semibold text-primary">We&apos;ll reach you at</h2>
          <p className="text-[13px] text-primary">{email}</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="block w-full text-center text-[13px] font-medium text-primary underline-offset-2"
        >
          Back to {firstName}&apos;s page
        </button>
      </div>
    </>
  )
}
