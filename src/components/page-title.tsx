interface PageTitleProps {
  title: string
  description: string
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  )
}
