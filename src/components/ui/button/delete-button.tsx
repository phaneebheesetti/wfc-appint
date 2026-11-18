import { Trash2 } from "lucide-react"

import { Button, type ButtonProps } from "."

interface DeleteButtonProps extends ButtonProps {
  children?: React.ReactNode
  icon?: React.ReactNode
}

export function DeleteButton({ children = "Delete", icon = <Trash2 />, ...props }: DeleteButtonProps) {
  return (
    <Button variant="destructive" {...props}>
      {icon} {children}
    </Button>
  )
}
