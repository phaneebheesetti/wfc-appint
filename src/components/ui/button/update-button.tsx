import { Pencil } from "lucide-react"

import { Button, type ButtonProps } from "."

interface UpdateButtonProps extends ButtonProps {
  children?: React.ReactNode
}

export function UpdateButton({ children = "Edit", ...props }: UpdateButtonProps) {
  return (
    <Button {...props}>
      <Pencil /> {children}
    </Button>
  )
}
