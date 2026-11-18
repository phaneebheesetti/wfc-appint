import { type ExternalToast, toast } from "sonner"

interface ToastErrorProps {
  error: unknown
  fallbackMessage?: string
  toastOptions?: ExternalToast
}

export function toastError({ error, fallbackMessage = "An unexpected error occurred", toastOptions }: ToastErrorProps) {
  let errorMessage = fallbackMessage

  if (error instanceof Error) {
    if (error.name === "TRPCClientError") return

    errorMessage = error.message
  }

  toast.error(errorMessage, toastOptions)
}
