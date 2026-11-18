import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface SheetSimpleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}

export function SheetSimple({ open, onOpenChange, title, description, children }: SheetSimpleProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6">
        <SheetHeader className="space-y-0">
          <SheetDescription>{description}</SheetDescription>
          <SheetTitle className="mt-0 truncate">{title}</SheetTitle>
        </SheetHeader>

        {children}
      </SheetContent>
    </Sheet>
  )
}
