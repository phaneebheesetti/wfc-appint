import { ArrowLeft } from "lucide-react"

import { WithTooltip } from "@/components/ui/tooltip"

interface SignupTitleProps {
  title: string
  description: React.ReactNode
  onGoBack?: () => void
}

export function SignupTitle({ title, description, onGoBack }: SignupTitleProps) {
  return (
    <div className="flex flex-col gap-3 text-center md:text-left">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        {onGoBack && (
          <WithTooltip
            content="Go back"
            side="top"
            trigger={<ArrowLeft className="w-5 h-5 cursor-pointer" onClick={onGoBack} />}
          />
        )}

        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
