"use client"

import debounce from "lodash.debounce"
import { type ReactNode, useMemo } from "react"
import { type Control, type ControllerRenderProps, type FieldValues, type Path } from "react-hook-form"
import { NumericFormat } from "react-number-format"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"

import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { InfoTooltip } from "@/components/ui/tooltip"
import { Typeahead, type TypeaheadProps } from "@/components/ui/typeahead"
import { cn } from "@/utils/cn"

import { DatePicker } from "./date-picker"

type FormFieldType =
  | "text"
  | "email"
  | "password"
  | "textarea"
  | "select"
  | "checkbox"
  | "switch"
  | "date"
  | "number"
  | "currency"
  | "phone"
  | "rich-text"
  | "typeahead"

type BaseFormField<T extends FieldValues> = {
  name: Path<T>
  label?: string
  labelSmall?: string
  placeholder?: string
  description?: ReactNode
  type: FormFieldType
  options?: { value: string; label: string }[]
  selectContentClassName?: string
  className?: string
  info?: string
  disabled?: boolean
  onChange?: (value: string) => void
  step?: number
  min?: number
  leftIcon?: string
  max?: number
  fromDate?: Date
  required?: boolean
  maxLength?: number
  readOnly?: boolean
  rows?: number
}

type StandardFormField<T extends FieldValues> = BaseFormField<T> & {
  type: Exclude<FormFieldType, "typeahead">
}

type TypeaheadFormField<T extends FieldValues> = BaseFormField<T> &
  Omit<TypeaheadProps, "value" | "onChange" | "onSelect"> & {
    type: "typeahead"
    onValueChange: TypeaheadProps["onChange"]
    onValueSelect: TypeaheadProps["onSelect"]
  }

export type FormField<T extends FieldValues> = StandardFormField<T> | TypeaheadFormField<T>

type FormFieldWrapperProps<T extends FieldValues> = FormField<T> & { control: Control<T> }

export function FormFieldWrapper<T extends FieldValues>(props: FormFieldWrapperProps<T>) {
  const {
    name,
    control,
    label,
    labelSmall,
    placeholder = "",
    description = "",
    type = "text",
    options,
    selectContentClassName,
    info,
    className,
    disabled = false,
    onChange,
    step = 1,
    min = 0,
    leftIcon,
    max,
    fromDate,
    required = false,
    maxLength,
    readOnly = false,
    rows = 3,
  } = props
  const renderByType = useMemo<
    Partial<Record<FormFieldType, (field: ControllerRenderProps<T>, hasError?: boolean) => React.ReactNode>>
  >(
    () => ({
      textarea: (field, hasError) => (
        <Textarea
          disabled={disabled}
          placeholder={placeholder}
          {...field}
          value={field.value || ""}
          rows={rows}
          className={cn(
            hasError
              ? "border-destructive focus-visible:border-destructive"
              : "focus-visible:border-input-background-active"
          )}
        />
      ),
      select: (field, hasError) => (
        <Select
          disabled={disabled}
          onValueChange={value => {
            field.onChange(value)
            onChange?.(value)
          }}
          value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
        >
          <SelectTrigger
            className={cn(
              hasError ? "border-destructive focus:border-destructive" : "focus:border-input-background-active"
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className={cn("z-[9999]", selectContentClassName)}>
            {(options ?? [])?.length > 0 ? (
              options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-results" disabled>
                No results
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      ),
      checkbox: field => (
        <div className="flex items-center gap-2">
          <Checkbox
            id={name}
            disabled={disabled}
            checked={!!field.value}
            onCheckedChange={checked => {
              field.onChange(checked)
              onChange?.(String(checked))
            }}
          />
          <FormLabel htmlFor={name} className="cursor-pointer">
            {label}
          </FormLabel>

          {info && <InfoTooltip content={info} />}
        </div>
      ),
      switch: field => (
        <div className="flex items-center gap-2">
          <Switch
            id={name}
            disabled={disabled}
            checked={!!field.value}
            onCheckedChange={checked => {
              field.onChange(checked)
              onChange?.(String(checked))
            }}
          />
          <FormLabel htmlFor={name}>{label}</FormLabel>
        </div>
      ),
      date: (field, hasError) => (
        <DatePicker
          fromDate={fromDate}
          placeholder={placeholder}
          value={field.value}
          onChange={value => {
            field.onChange(value)
          }}
          className={cn(
            hasError
              ? "border-destructive focus-visible:border-destructive"
              : "focus-visible:border-input-background-active"
          )}
        />
      ),
      currency: ({ ref, ...rest }, hasError) => (
        <NumericFormat
          readOnly={readOnly}
          thousandSeparator=","
          decimalSeparator="."
          prefix="$ "
          decimalScale={2}
          getInputRef={ref}
          allowNegative={false}
          disabled={disabled}
          className={cn(
            "flex h-11 w-full rounded-control border-[1px] bg-input-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-[1.5px] focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            hasError
              ? "border-destructive focus-visible:border-destructive"
              : "border-input focus-visible:border-input-background-active"
          )}
          {...rest}
        />
      ),
      phone: (field, hasError) => (
        <PhoneInput
          {...field}
          placeholder={placeholder}
          onChange={debounce(field.onChange, 500)}
          defaultCountry="US"
          className={cn(
            "flex gap-1 h-11 w-full rounded-control border-[1px] bg-input-background px-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-within:border-[1.5px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            hasError
              ? "border-destructive focus-within:border-destructive"
              : "border-input focus-within:border-input-background-active",
            "[&>input]:h-full [&>input]:outline-none [&>input]:ring-0 [&>input]:border-none [&>input]:bg-transparent"
          )}
        />
      ),
      "rich-text": field => <RichTextEditor {...field} placeholder={placeholder} />,
      typeahead: (field, hasError) =>
        props.type == "typeahead" ? (
          <Typeahead
            value={field.value}
            error={hasError}
            onChange={(val, setEmptyMessage, setSuggestions) => {
              field.onChange(val)
              props.onValueChange?.(val, setEmptyMessage, setSuggestions)
            }}
            onSelect={props.onValueSelect}
            allowScrollWheelNav={true}
          />
        ) : null,
    }),
    [disabled, placeholder, options, selectContentClassName, name, onChange, info, label, fromDate, readOnly]
  )

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn("flex flex-col gap-2 justify-start space-y-0", className)}>
          {type !== "checkbox" && type !== "switch" && (
            <div className="flex items-center gap-2">
              <FormLabel>
                {label}
                {labelSmall && <small className="text-muted-foreground">{labelSmall}</small>}
                {required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>

              {info && <InfoTooltip content={info} />}
            </div>
          )}

          <FormControl>
            <div className="relative mt-auto">
              {renderByType?.[type]?.(field, !!fieldState.error) ?? (
                <>
                  {leftIcon && (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">{leftIcon}</span>
                    </div>
                  )}

                  <Input
                    readOnly={readOnly}
                    step={step}
                    disabled={disabled}
                    type={type}
                    placeholder={placeholder}
                    {...field}
                    value={field.value || ""}
                    min={min}
                    max={max}
                    maxLength={maxLength}
                    className={cn(
                      leftIcon && "pl-8",
                      fieldState.error
                        ? "border-destructive focus-visible:border-destructive"
                        : "focus-visible:border-input-background-active"
                    )}
                  />
                </>
              )}

              {maxLength && (
                <div className="text-[10px] absolute -top-4 right-0 text-muted-foreground">
                  {field.value?.length ?? 0}/{maxLength}
                </div>
              )}
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage>{fieldState.error?.message}</FormMessage>
        </FormItem>
      )}
    />
  )
}
