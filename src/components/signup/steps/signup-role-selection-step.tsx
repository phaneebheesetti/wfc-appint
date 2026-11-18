"use client"

import { Button } from "@/components/ui/button"

import { SignupRoleEnum, SignupStepEnum } from "../signup"
import { SignupTitle } from "../signup-title"

interface SignupRoleSelectionStepProps {
  onStepChange: (step: SignupStepEnum) => void
  role: SignupRoleEnum | null
  setRole: (role: SignupRoleEnum) => void
}

export function SignupRoleSelectionStep({ onStepChange, role, setRole }: SignupRoleSelectionStepProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <SignupTitle
        title="Let's get to know you!"
        description={
          <>
            To help us personalize your signup experience, please let us know if you&apos;re signing up as a parent or a
            participant.
          </>
        }
        onGoBack={() => onStepChange(SignupStepEnum.INITIAL)}
      />

      <div className="flex gap-2">
        <Button
          className="h-20 flex-1"
          variant={role === SignupRoleEnum.PARTICIPANT ? "default" : "outline"}
          onClick={() => setRole(SignupRoleEnum.PARTICIPANT)}
          disabled
        >
          Participant <span className="text-xs text-muted-foreground">(Coming Soon)</span>
        </Button>
        <Button
          className="h-20 flex-1"
          variant={role === SignupRoleEnum.PARENT ? "default" : "outline"}
          onClick={() => setRole(SignupRoleEnum.PARENT)}
        >
          Parent
        </Button>
      </div>

      <Button
        disabled={!role}
        onClick={() =>
          onStepChange(role === SignupRoleEnum.PARENT ? SignupStepEnum.CHILDREN_SELECTION : SignupStepEnum.FORM)
        }
      >
        Continue
      </Button>
    </div>
  )
}
