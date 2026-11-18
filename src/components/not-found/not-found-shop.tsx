import { AlertCircle } from "lucide-react"

export function NotFoundShop({ message = "The shop you're looking for is not available." }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-2xl text-destructive font-bold tracking-tight mb-2">Shop Not Found</h1>
      <p className="text-muted-foreground mb-6">{message}</p>
    </div>
  )
}
