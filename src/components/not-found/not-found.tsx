import { AlertCircle, House } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function NotFound({ message = "The page or resource you're looking for doesn't exist." }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-2xl text-destructive font-bold tracking-tight mb-2">Not Found</h1>
      <p className="text-muted-foreground mb-6">{message}</p>
      <Link href="/">
        <Button variant="default">
          <House />
          Return to Home
        </Button>
      </Link>
    </div>
  )
}
