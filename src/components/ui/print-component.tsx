import { forwardRef } from "react"

interface PrintComponentProps {
  children: React.ReactNode
}

export const PrintComponent = forwardRef<HTMLDivElement, PrintComponentProps>(({ children }, ref) => {
  return (
    <div style={{ display: "none" }}>
      <div ref={ref} className="relative">
        {children}
      </div>
    </div>
  )
})
PrintComponent.displayName = "PrintComponent"
