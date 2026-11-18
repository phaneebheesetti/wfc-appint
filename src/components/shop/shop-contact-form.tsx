import { type UseFormReturn } from "react-hook-form"

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Textarea } from "@/components/ui/textarea"
import { SHOP_ORDERS_CONTACT_METHOD_DETAILS, type ShopOrdersContactMethodEnum } from "@/constants/shop-orders"
import { cn } from "@/utils/cn"
import { type ShopOrdersContactFormValues } from "@/utils/shop-orders"

const VARIETY_PREFERENCES_MAX_LENGTH = 200

export const SHOP_CONTACT_FORM_ID = "shop-contact-form"

interface ShopContactFormProps {
  form: UseFormReturn<ShopOrdersContactFormValues>
  onSubmit: (values: ShopOrdersContactFormValues) => Promise<void> | void
}

export function ShopContactForm({ form, onSubmit }: ShopContactFormProps) {
  return (
    <Form {...form}>
      <form
        id={SHOP_CONTACT_FORM_ID}
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-card border bg-card p-5 shadow-elev-1"
      >
        <p className="mb-4 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Your details</p>

        <div className="flex flex-col gap-5">
          <FormFieldWrapper
            name="buyerName"
            label="Name"
            control={form.control}
            type="text"
            placeholder="Name"
            required
          />

          <FormFieldWrapper
            name="deliveryAddress"
            control={form.control}
            type="text"
            label="Your address"
            labelSmall=" (Optional - Orders will not be shipped. Address is for in-person delivery only)"
            placeholder="Street address, City, State, ZIP"
            description="If provided, delivery will be made to this address. Otherwise, we'll reach out to coordinate an in-person handoff."
          />

          <FormFieldWrapper
            name="email"
            control={form.control}
            type="email"
            label="Email address"
            placeholder="you@example.com"
            description="Your receipt and order confirmation will always be sent here."
            required
          />

          <FormFieldWrapper
            name="phone"
            control={form.control}
            type="phone"
            label="Phone number"
            placeholder="(555) 123-4567"
            required
          />

          <FormField
            control={form.control}
            name="preferredContactMethod"
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-col gap-2 space-y-0">
                <FormLabel>Preferred contact method for order updates</FormLabel>
                <FormDescription>
                  If a parent has questions or updates to share about your order, they&apos;ll contact you via your
                  selected channel below.
                </FormDescription>

                <div role="radiogroup" className="grid max-w-sm grid-cols-2 gap-3">
                  {Object.entries(SHOP_ORDERS_CONTACT_METHOD_DETAILS).map(([value, { label }]) => {
                    const isSelected = field.value === value

                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => field.onChange(value as ShopOrdersContactMethodEnum)}
                        className={cn(
                          "flex h-11 items-center justify-center rounded-control border text-[13.5px] font-medium transition-colors focus-visible:border-[1.5px] focus-visible:border-input-background-active focus-visible:outline-none",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-card text-primary hover:bg-creamy-50",
                          fieldState.error && !isSelected && "border-destructive"
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="varietyPreferences"
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-col gap-2 space-y-0">
                <FormLabel>
                  Any preferences for specific varieties?
                  <small className="text-muted-foreground"> (filled as available)</small>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                    maxLength={VARIETY_PREFERENCES_MAX_LENGTH}
                    placeholder="Any preferences for specific varieties?  (filled as available)"
                    className={cn(
                      "bg-input-background",
                      fieldState.error
                        ? "border-destructive focus-visible:border-destructive"
                        : "focus-visible:border-input-background-active"
                    )}
                  />
                </FormControl>

                <div className="text-right text-[10px] text-muted-foreground">
                  {field.value?.length ?? 0}/{VARIETY_PREFERENCES_MAX_LENGTH}
                </div>

                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  )
}
