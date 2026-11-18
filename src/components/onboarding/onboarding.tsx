"use client"

import { SignInButton } from "@clerk/nextjs"
import { LogIn, UserCheck } from "lucide-react"
import { useState } from "react"

import { SignupFinishedFailureStep } from "@/components/signup/steps/signup-finished-failure-step"
import { SignupFinishedSuccessStep } from "@/components/signup/steps/signup-finished-success-step"

import { OnboardingFormStep, OnboardingInitialStep } from "./steps"

export enum OnboardingStepEnum {
  INITIAL = "INITIAL",
  FORM = "FORM",
  FINISHED_SUCCESS = "FINISHED_SUCCESS",
  FINISHED_FAILURE = "FINISHED_FAILURE",
  FINISHED_FAILURE_ACCOUNT_ALREADY_EXISTS = "FINISHED_FAILURE_ACCOUNT_ALREADY_EXISTS",
}

export function Onboarding() {
  const [step, setStep] = useState<OnboardingStepEnum>(OnboardingStepEnum.INITIAL)

  const contentByStep: Record<OnboardingStepEnum, React.ReactNode> = {
    [OnboardingStepEnum.INITIAL]: <OnboardingInitialStep onStepChange={setStep} />,
    [OnboardingStepEnum.FORM]: <OnboardingFormStep onStepChange={setStep} />,
    [OnboardingStepEnum.FINISHED_SUCCESS]: <SignupFinishedSuccessStep />,
    [OnboardingStepEnum.FINISHED_FAILURE]: <SignupFinishedFailureStep />,
    [OnboardingStepEnum.FINISHED_FAILURE_ACCOUNT_ALREADY_EXISTS]: (
      <SignupFinishedFailureStep
        title="Account already exists!"
        description={
          <>
            An account with this email already exists.
            <br />
            Please sign in instead.
            <div className="w-full flex justify-center">
              <SignInButton>
                <div className="mt-6 flex items-center justify-center gap-2 ww-40 h-10 px-4 py-2 rounded-md border border-input bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-sm font-medium">
                  <LogIn size={16} /> Sign in
                </div>
              </SignInButton>
            </div>
          </>
        }
        icon={UserCheck}
        iconClassname="text-green-500"
      />
    ),
  }

  return contentByStep[step]
}
