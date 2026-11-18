"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { NotFoundShop } from "@/components/not-found"
import { Button } from "@/components/ui/button"
import { ShopOrderPageEnum, ShopOrdersContactMethodEnum, ShopOrdersPaymentTypeEnum } from "@/constants/shop-orders"
import { formatCentsToCurrency } from "@/utils/money"
import { type ShopOrdersContactFormValues, shopOrdersContactFormSchema } from "@/utils/shop-orders"

import { FundraiserProgress } from "./fundraiser-progress"
import { HeroBanner } from "./hero-banner"
import { PackageSelector } from "./package-selector"
import { sendShopOrderConfirmationEmail } from "./send-shop-order-confirmation-email"
import { sendShopOrderParentNotificationEmail } from "./send-shop-order-parent-notification-email"
import { SHOP_CONTACT_FORM_ID, ShopContactForm } from "./shop-contact-form"
import { ShopOrderSummary } from "./shop-order-summary"

type ShopData = {
  firstName: string
  fullName: string
  pin: string
  message: string
  campaignName: string
  campaignDeleted: boolean
  campaignEnded: boolean
  digitalPaymentEnabled: boolean
  cardPaymentAvailable: boolean
  goalBars: number
  soldBars: number
  availableBars: number
  pricePerBarCents: number
  barsPerCase: number
}

type SelectedPackage = {
  key: string
  isRequest: boolean
  priceCents: number
  label: string
  bars: number
}

export function Shop() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const retryOrderId = searchParams.get("retryOrderId")

  const [shopData, setShopData] = useState<ShopData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRestoringOrder, setIsRestoringOrder] = useState(!!retryOrderId)
  const [notFound, setNotFound] = useState(false)
  const [step, setStep] = useState<ShopOrderPageEnum>(ShopOrderPageEnum.ORDER_FORM)
  const [contactValues, setContactValues] = useState<ShopOrdersContactFormValues | undefined>(undefined)
  const [paymentType, setPaymentType] = useState<ShopOrdersPaymentTypeEnum | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null)
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false)

  const contactForm = useForm<ShopOrdersContactFormValues>({
    resolver: zodResolver(shopOrdersContactFormSchema),
    mode: "all",
    defaultValues: {
      buyerName: "",
      deliveryAddress: "",
      email: "",
      phone: "",
      preferredContactMethod: ShopOrdersContactMethodEnum.EMAIL,
      varietyPreferences: "",
    },
  })

  useEffect(() => {
    const loadShopData = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(`/api/shop/${id}`)

        if (response.status === 404) {
          setNotFound(true)
          return
        }

        if (!response.ok) {
          throw new Error("Failed to fetch sales page.")
        }

        const result = (await response.json()) as {
          data: ShopData
        }

        setShopData(result.data)
        setPaymentType(
          result.data.digitalPaymentEnabled && result.data.cardPaymentAvailable
            ? ShopOrdersPaymentTypeEnum.CARD
            : ShopOrdersPaymentTypeEnum.CASH
        )
      } catch (error) {
        console.error("Failed to load sales page:", error)
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      void loadShopData()
    }
  }, [id])

  useEffect(() => {
    if (!retryOrderId || !shopData) return

    const loadExistingOrder = async () => {
      try {
        const response = await fetch(`/api/shop/${id}/cash-order?orderId=${retryOrderId}`)
        if (!response.ok) return

        const { data } = (await response.json()) as {
          data: {
            order: {
              orderDetails: {
                name: string
                address: string
                phoneNumber: string
                preferredContactMethod: "EMAIL" | "PHONE"
                preferences: string
                packageLabel: string
                packageKey?: string
              }
              barsQuantity: number
              amountCents: number
            }
            consumer: { email: string }
          }
        }

        const { order, consumer } = data

        const restoredContactMethod =
          order.orderDetails.preferredContactMethod === "EMAIL"
            ? ShopOrdersContactMethodEnum.EMAIL
            : ShopOrdersContactMethodEnum.PHONE

        const restoredValues = {
          buyerName: order.orderDetails.name,
          deliveryAddress: order.orderDetails.address,
          email: consumer.email,
          phone: order.orderDetails.phoneNumber,
          preferredContactMethod: restoredContactMethod,
          varietyPreferences: order.orderDetails.preferences,
        }

        contactForm.reset(restoredValues)
        setContactValues(restoredValues)

        setSelectedPackage({
          key: order.orderDetails.packageKey ?? "",
          isRequest: false,
          priceCents: order.amountCents,
          label: order.orderDetails.packageLabel,
          bars: order.barsQuantity,
        })

        setPaymentType(
          shopData.digitalPaymentEnabled && shopData.cardPaymentAvailable
            ? ShopOrdersPaymentTypeEnum.CARD
            : ShopOrdersPaymentTypeEnum.CASH
        )
        setStep(ShopOrderPageEnum.SUMMARY)
        // Once restored, drop the param
        router.replace(`/shop/${id}`)
      } catch (error) {
        console.error("Failed to load existing order for retry:", error)
        router.replace(`/shop/${id}`)
      } finally {
        setIsRestoringOrder(false)
      }
    }

    void loadExistingOrder()
  }, [retryOrderId, shopData, id])

  if (isLoading || isRestoringOrder) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (notFound || !shopData) {
    return <NotFoundShop />
  }

  const {
    firstName,
    fullName,
    pin,
    message,
    campaignName,
    campaignDeleted,
    campaignEnded,
    goalBars,
    soldBars,
    availableBars,
  } = shopData

  const soldOut = availableBars <= 0

  const isInventoryValid = !!selectedPackage
  const isSubmitting = contactForm.formState.isSubmitting

  // 40 bars per case is constant
  const barsPerCase = 40
  // 200 cents per bar is constant
  const pricePerBarCents = 200

  const continueLabel = !selectedPackage
    ? "Continue"
    : selectedPackage.isRequest
      ? "Send request"
      : `Continue - ${formatCentsToCurrency(selectedPackage.priceCents)}`

  const handleSelectPackage = (key: string, isRequest: boolean, priceCents: number, label: string, bars: number) => {
    setSelectedPackage({ key, isRequest, priceCents, label, bars })
  }

  // Set Contact Form selected values and set the step to Order Summary
  const handleContactSubmit = async (values: ShopOrdersContactFormValues) => {
    setContactValues(values)

    if (selectedPackage?.isRequest) {
      const response = await fetch(`/api/shop/${id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          buyerName: values.buyerName,
          deliveryAddress: values.deliveryAddress,
          phone: values.phone,
          preferredContactMethod: values.preferredContactMethod,
          varietyPreferences: values.varietyPreferences,
          bars: selectedPackage.bars,
          priceCents: selectedPackage.priceCents,
          packageLabel: selectedPackage.label,
        }),
      })

      if (!response.ok) {
        toast.error("Something went wrong sending your request. Please try again.")
        return
      }

      const { data } = (await response.json()) as { data: { consumerPaymentLogId: string } }

      router.push(`/shop/${id}/request-confirmation/${data.consumerPaymentLogId}`)
      return
    }

    setStep(ShopOrderPageEnum.SUMMARY)
  }

  // Handle Payment Navigation
  const handlePaymentNavigation = async () => {
    if (!paymentType || !contactValues || !selectedPackage) return

    setIsOrderSubmitting(true)
    const receiptPayload =
      contactValues && selectedPackage
        ? {
            salesPageId: id,
            packageKey: selectedPackage.key,
            email: contactValues.email,
            buyerName: contactValues.buyerName,
            address: contactValues.deliveryAddress,
            varietyPreferences: contactValues.varietyPreferences,
          }
        : null

    try {
      if (paymentType === ShopOrdersPaymentTypeEnum.CASH) {
        const response = await fetch(`/api/shop/${id}/cash-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: contactValues.email,
            buyerName: contactValues.buyerName,
            deliveryAddress: contactValues.deliveryAddress,
            phone: contactValues.phone,
            preferredContactMethod: contactValues.preferredContactMethod,
            varietyPreferences: contactValues.varietyPreferences,
            bars: selectedPackage.bars,
            priceCents: selectedPackage.priceCents,
            packageLabel: selectedPackage.label,
          }),
        })

        if (!response.ok) {
          if (response.status === 409) {
            const errorBody = (await response.json().catch(() => null)) as { error?: string } | null
            toast.error(errorBody?.error ?? "This item is no longer available in the requested quantity.")
            setTimeout(() => {
              window.location.reload()
            }, 5000)
            return
          }

          toast.error("Something went wrong placing your order. Please try again.")
          return
        }

        const { data } = (await response.json()) as {
          data: {
            consumerPaymentLogId: string
          }
        }

        if (receiptPayload) {
          await sendShopOrderConfirmationEmail({ ...receiptPayload, paymentType: ShopOrdersPaymentTypeEnum.CASH })
          await sendShopOrderParentNotificationEmail({
            salesPageId: id,
            buyerName: contactValues.buyerName,
            phoneNumber: contactValues.phone,
            buyerEmail: contactValues.email,
            preferredContactMethodLabel:
              contactValues.preferredContactMethod === ShopOrdersContactMethodEnum.EMAIL ? "Email" : "Phone",
            address: contactValues.deliveryAddress,
            itemName: selectedPackage.label,
            barsQuantity: selectedPackage.bars,
            paymentStatusLabel: "Due in cash",
            amountCents: selectedPackage.priceCents,
            specialRequest: contactValues.varietyPreferences,
          })
        }
        router.push(`/shop/${id}/order-confirmation/${data.consumerPaymentLogId}`)
        return
      }

      if (paymentType === ShopOrdersPaymentTypeEnum.CARD) {
        const response = await fetch(`/api/shop/${id}/card-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: contactValues.email,
            buyerName: contactValues.buyerName,
            deliveryAddress: contactValues.deliveryAddress,
            phone: contactValues.phone,
            preferredContactMethod: contactValues.preferredContactMethod,
            varietyPreferences: contactValues.varietyPreferences,
            bars: selectedPackage.bars,
            priceCents: selectedPackage.priceCents,
            packageLabel: selectedPackage.label,
            packageKey: selectedPackage.key,
          }),
        })

        if (!response.ok) {
          toast.error("Something went wrong placing your order. Please try again.")
          return
        }

        const { data } = (await response.json()) as {
          data: { consumerId: string; consumerPaymentLogId: string }
        }

        const paymentParams = new URLSearchParams({
          pin,
          consumerId: data.consumerId,
          consumerPaymentLogId: data.consumerPaymentLogId,
          shopId: id,
          amountCents: String(selectedPackage.priceCents),
          firstName,
        })

        router.push(`/payment?${paymentParams.toString()}`)
        return
      }
    } catch (error) {
      console.error("Failed to place order:", error)
      toast.error("Something went wrong placing your order. Please try again.")
    } finally {
      setIsOrderSubmitting(false)
    }
  }

  const getOrderFormUI = () => {
    return (
      <>
        {step === ShopOrderPageEnum.ORDER_FORM ? (
          <>
            <div className="rounded-xl border-l-4 border-[#ffa004] bg-[#fdf5e8] px-4 py-[14px] shadow-sm">
              <p className="text-[13px] leading-[1.6] text-primary">&quot;{message}&quot;</p>
            </div>

            <FundraiserProgress
              campaignName={campaignName}
              goalBars={goalBars}
              soldBars={soldBars}
              availableBars={availableBars}
              soldOut={soldOut}
            />

            <PackageSelector
              availableBars={availableBars}
              barsPerCase={barsPerCase}
              pricePerBarCents={pricePerBarCents}
              selectedKey={selectedPackage?.key ?? null}
              onSelect={handleSelectPackage}
            />

            <ShopContactForm form={contactForm} onSubmit={handleContactSubmit} />

            {selectedPackage?.isRequest && (
              <div className="rounded-xl border border-[#f0d8bd] bg-[#fdf2e0] p-4 text-center">
                <p className="text-[13px] leading-[1.6]">
                  This item isn&apos;t currently in stock. {firstName}&apos;s family will review your request and
                  confirm when available — no payment until confirmed.
                </p>
              </div>
            )}

            <Button
              type="submit"
              form={SHOP_CONTACT_FORM_ID}
              variant="default"
              disabled={isSubmitting || !contactForm.formState.isValid || !isInventoryValid}
              className="mx-auto flex w-full max-w-64"
            >
              {isSubmitting ? "Please Wait..." : continueLabel}
            </Button>

            <p className="text-center text-xs text-muted-foreground">No account needed</p>
          </>
        ) : (
          <>
            {!!contactValues && !!selectedPackage && (
              <>
                <ShopOrderSummary
                  receiptTo={contactValues.email}
                  deliveryAddress={contactValues.deliveryAddress}
                  specialRequest={contactValues.varietyPreferences}
                  bars={selectedPackage.bars}
                  label={selectedPackage.label}
                  totalPriceCents={selectedPackage.priceCents}
                  paymentValue={paymentType}
                  digitalPaymentEnabled={shopData.digitalPaymentEnabled}
                  cardPaymentAvailable={shopData.cardPaymentAvailable}
                  getPaymentType={paymentType => setPaymentType(paymentType)}
                />
                <Button
                  type="button"
                  variant="default"
                  disabled={!paymentType || isOrderSubmitting}
                  onClick={() => paymentType && handlePaymentNavigation()}
                  className="mx-auto mt-4 flex w-fit max-w-sm"
                >
                  {isOrderSubmitting
                    ? "Please Wait..."
                    : paymentType === ShopOrdersPaymentTypeEnum.CASH
                      ? `Place Order - Pay ${formatCentsToCurrency(selectedPackage.priceCents)} Cash`
                      : `Continue To Payment - ${formatCentsToCurrency(selectedPackage.priceCents)}`}
                </Button>

                <div className="mt-5 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <span>256-bit encrypted</span>
                  <span>PCI compliant</span>
                </div>
              </>
            )}
          </>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroBanner
        fullName={fullName}
        firstName={firstName}
        fundraiserEnded={campaignDeleted || campaignEnded}
        soldOut={soldOut}
        currentStep={step}
        onBack={() => setStep(ShopOrderPageEnum.ORDER_FORM)}
      />

      <div className="space-y-[10px] p-[14px] mx-auto w-full max-w-4xl">
        {!campaignDeleted && !campaignEnded ? (
          <>{getOrderFormUI()}</>
        ) : (
          <div className="rounded-xl border border-[#e6d6bf] bg-[#f5eee0] p-4 text-center">
            <div className="mb-2 text-[28px]">🎉</div>
            <div className="mb-1 text-[15px] font-medium text-primary">This fundraiser has ended</div>

            <div className="text-[13px] leading-[1.5] text-muted-foreground">No longer accepting orders.</div>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Powered by WFCentral · World&apos;s Finest Chocolate
        </p>
      </div>
    </div>
  )
}
