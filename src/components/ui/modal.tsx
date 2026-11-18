"use client"

import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"

import { cn } from "@/utils/cn"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog"

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  icon?: LucideIcon
  iconClassName?: string
  iconContainerClassName?: string
  className?: string
  headerClassName?: string
  showCloseButton?: boolean
  preventOutsideClose?: boolean
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  icon: Icon,
  iconClassName,
  iconContainerClassName,
  className,
  headerClassName,
  showCloseButton = true,
  preventOutsideClose = false,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("p-0", className)}
        showCloseButton={showCloseButton}
        onPointerDownOutside={event => {
          if (preventOutsideClose) event.preventDefault()
        }}
        onEscapeKeyDown={event => {
          if (preventOutsideClose) event.preventDefault()
        }}
      >
        <DialogHeader className={cn("p-6 pb-0", headerClassName)}>
          <div className={cn("flex gap-3", iconContainerClassName ? "items-center" : "items-start")}>
            {Icon &&
              (iconContainerClassName ? (
                <div className={cn("flex shrink-0 items-center justify-center", iconContainerClassName)}>
                  <Icon className={cn("w-5 h-5", iconClassName)} />
                </div>
              ) : (
                <Icon className={cn("w-6 h-6 shrink-0 mt-0.5", iconClassName)} />
              ))}
            <div className="flex flex-col gap-1.5 min-w-0">
              {title && <DialogTitle className="leading-snug">{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(95vh-6rem)] p-6 pt-0">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
