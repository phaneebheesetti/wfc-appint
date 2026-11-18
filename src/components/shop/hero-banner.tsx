import { ChevronLeft } from "lucide-react"

import { ShopOrderPageEnum } from "@/constants/shop-orders"

type HeroBannerProps = {
  fullName: string
  firstName: string
  fundraiserEnded: boolean
  soldOut: boolean
  currentStep: ShopOrderPageEnum
  onBack?: () => void
}

export function HeroBanner({
  fullName,
  firstName,
  fundraiserEnded = false,
  soldOut = false,
  currentStep = ShopOrderPageEnum.ORDER_FORM,
  onBack,
}: HeroBannerProps) {
  return (
    <div className="bg-primary px-[18px] pb-[26px] pt-5 text-center">
      {currentStep === ShopOrderPageEnum.ORDER_FORM ? (
        <div>
          <div className="mb-[14px] inline-flex items-center gap-[5px] rounded-full bg-primary-foreground/15 px-[13px] py-1">
            <span className="text-[11px] font-medium text-primary-foreground/90">World&apos;s Finest Chocolate</span>
          </div>

          <div className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-[3px] border-primary-foreground/40 bg-[#fbf6eb] text-[34px]">
            🐱
          </div>

          <h1 className="mb-[3px] text-xl font-bold text-primary-foreground">
            {fundraiserEnded ? "Thank You!" : soldOut ? fullName : `Support ${fullName}'s Fundraiser`}
          </h1>

          <p className="text-[13px] text-primary-foreground/70">
            {" "}
            {fundraiserEnded
              ? `${firstName}'s fundraiser has ended`
              : soldOut
                ? "Request below — we'll be in touch when available"
                : "Help reach the fundraising goal"}
          </p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2.5 mb-4 flex h-11 w-fit items-center gap-1 rounded-full pl-1.5 pr-3 text-primary-foreground/90 transition-colors hover:text-primary-foreground"
          >
            <ChevronLeft className="size-6 shrink-0" />
            <span className="text-sm font-medium leading-none">Back</span>
          </button>

          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-sm font-semibold text-primary-foreground tracking-wide">
            Secure Checkout
          </span>

          <h1 className="mt-3 text-xl font-bold text-primary-foreground">Review your order</h1>
          <p className="text-sm mt-2 text-primary-foreground/80">Supporting {fullName}</p>
        </div>
      )}
    </div>
  )
}
