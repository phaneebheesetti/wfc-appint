"use client"

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Lightbulb,
  type LucideIcon,
  Mail,
  Users,
} from "lucide-react"

export type MissingStep = { step: number; name: string }

type AdminTask = { icon: LucideIcon; title: string; description: string }

const ADMIN_TASKS: AdminTask[] = [
  {
    icon: Mail,
    title: "Accept their invitation",
    description: "An invite was emailed to them — once they accept, they get access to the fundraiser.",
  },
  {
    icon: CreditCard,
    title: "Enable digital payments",
    description: "They'll connect a bank account through Stripe so families can pay online.",
  },
  {
    icon: Users,
    title: "Add participants",
    description: "They upload the student roster to generate access codes.",
  },
  {
    icon: FileText,
    title: "Configure permission slips",
    description: "They will decide if participants will need permission from an adult to participate.",
  },
]

const THINGS_YOU_CAN_DO = [
  "Let the org admin know to look out for an email",
  "Reinforce the value of using the app",
  "Help them understand what to expect next",
]

type LaunchReadyContentProps = {
  // True only when every prior step is complete — gates the "handoff" panel so it never
  // shows "Nice work" while steps are still outstanding.
  isReadyForHandoff: boolean
  // How many prior steps are still incomplete — drives the "N steps still outstanding" message.
  outstandingStepCount: number
  // Steps surfaced after a launch attempt found gaps — drives the "Can't launch yet" panel.
  missingSteps: MissingStep[]
}

// The Launch Ready step body shared between FC onboarding (Step 6) and the Add-Fundraiser popup.
// Renders the intro line plus the three status panels (outstanding warning, handoff success card,
// missing-steps list). The launch button stays with each caller since its action differs.
export function LaunchReadyContent({ isReadyForHandoff, outstandingStepCount, missingSteps }: LaunchReadyContentProps) {
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">Review what happens next.</p>

      {!isReadyForHandoff && (
        <div className="mb-4 flex items-start gap-3 rounded-card border bg-muted/30 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <div className="font-semibold">
              {outstandingStepCount} {outstandingStepCount === 1 ? "step is" : "steps are"} still outstanding
            </div>
            <p className="mt-0.5 text-muted-foreground">Finish the steps above before launching the fundraiser.</p>
          </div>
        </div>
      )}

      {isReadyForHandoff && (
        <div className="mb-4 overflow-hidden rounded-card border bg-card">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-green-700">
                  Your setup is complete — handoff next
                </div>
                <h3 className="mt-1 font-serif text-2xl font-bold text-green-950">
                  Nice work — now the Org Admin takes over
                </h3>
                <p className="mt-1 text-sm text-green-900/80">
                  Your fundraiser isn&apos;t live, yet. Next, your admin will complete the final steps to get the most
                  out of your fundraiser.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What the Org Admin needs to do
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {ADMIN_TASKS.map((task, index) => (
                <div key={task.title} className="rounded-card border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-900 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        <task.icon className="h-4 w-4 text-muted-foreground" />
                        {task.title}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-card border border-rose-200 bg-rose-50/60 p-4">
              <div className="flex items-center gap-2 font-semibold text-rose-950">
                <Lightbulb className="h-4 w-4 text-rose-600" /> What you can do now
              </div>
              <ul className="mt-2 space-y-1.5">
                {THINGS_YOU_CAN_DO.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-rose-900/90">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {missingSteps.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 p-5 text-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold text-rose-950">
              Can&apos;t launch yet — {missingSteps.length} {missingSteps.length === 1 ? "step is" : "steps are"}{" "}
              incomplete
            </div>
            <p className="mt-0.5 text-rose-900/80">Finish the steps below before launching the fundraiser.</p>
            <ul className="mt-3 space-y-2">
              {missingSteps.map(item => (
                <li key={item.step} className="flex items-center gap-3 text-rose-950">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-200 text-xs font-bold text-rose-900">
                    {item.step}
                  </span>
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
