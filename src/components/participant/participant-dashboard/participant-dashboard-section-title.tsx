import Link from "next/link"

interface ParticipantDashboardSectionTitleProps {
  title: string
  description?: string
  viewAllRoute?: string
}

export function ParticipantDashboardSectionTitle({
  title,
  description,
  viewAllRoute,
}: ParticipantDashboardSectionTitleProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">{title}</div>

        {viewAllRoute && (
          <Link href={viewAllRoute}>
            <div className="text-xs text-muted-foreground">View All</div>
          </Link>
        )}
      </div>
      {description && <div className="text-xs">{description}</div>}
    </div>
  )
}
