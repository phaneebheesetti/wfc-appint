import { Skeleton } from "@/components/ui/skeleton"

export function LoadingStep() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-10/12" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>

      <Skeleton className="h-32 w-full flex items-center justify-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full bg-white" />
        <Skeleton className="h-2 w-6 bg-white" />
        <Skeleton className="h-12 w-12 rounded-full bg-white" />
      </Skeleton>

      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
