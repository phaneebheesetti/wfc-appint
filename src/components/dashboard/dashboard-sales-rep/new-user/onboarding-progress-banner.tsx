"use client"

import { Rocket } from "lucide-react"

const DEFAULT_TOTAL_STEPS = 6
const DEFAULT_TITLE = "Launch Your First Fundraiser"
const DEFAULT_DESCRIPTION = "Six quick steps. Each one saves automatically — come back any time."

type OnboardingProgressBannerProps = {
  doneCount: number
  // Defaults preserve the FC new-user flow (6 steps). The Add-Fundraiser popup passes its own
  // reduced count and copy (no "Create Organization" step, commit-at-end rather than auto-save).
  totalSteps?: number
  title?: string
  description?: string
}

export function OnboardingProgressBanner({
  doneCount,
  totalSteps = DEFAULT_TOTAL_STEPS,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: OnboardingProgressBannerProps) {
  const percent = Math.round((doneCount / totalSteps) * 100)

  return (
    <div className="rounded-card bg-primary px-6 py-6 text-primary-foreground shadow-elev-2 sm:px-8">
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider opacity-90">
            <Rocket className="h-4 w-4" /> Quick Start
          </div>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm opacity-90">{description}</p>
        </div>

        <CircularProgress percent={percent} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <StepTracker doneCount={doneCount} totalSteps={totalSteps} />
        <span className="text-xs font-semibold">{percent}%</span>
      </div>

      <div className="mt-2 text-xs opacity-90">
        {doneCount} of {totalSteps} complete
      </div>
    </div>
  )
}

function CircularProgress({ percent }: { percent: number }) {
  const size = 64
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{percent}%</div>
    </div>
  )
}

function StepTracker({ doneCount, totalSteps }: { doneCount: number; totalSteps: number }) {
  return (
    <div className="flex flex-1 gap-1.5">
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const isDone = idx < doneCount
        return (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              isDone ? "bg-white" : "bg-white/25"
            }`}
          />
        )
      })}
    </div>
  )
}
