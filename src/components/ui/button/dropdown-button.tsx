import { ChevronDown, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/utils/cn"

export interface DropdownButton {
  text: string
  icon?: LucideIcon
  onClick?: () => void
  disabled?: boolean
  variant?: "default" | "outline" | "secondary"
  className?: string
}

export interface DropdownButtonProps extends DropdownButton {
  buttons?: DropdownButton[]
}

export function DropdownButton(props: DropdownButtonProps) {
  const { text, disabled, buttons, variant = "outline", className } = props

  return (
    <DropdownMenu key={text}>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} variant={variant} className={cn("w-full md:w-auto", className)}>
          {props.icon && <props.icon />}
          {text}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {buttons?.map(button => (
          <DropdownMenuItem key={button.text} onClick={button.onClick} disabled={button.disabled}>
            {button.icon && <button.icon size={16} />}
            {button.text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
