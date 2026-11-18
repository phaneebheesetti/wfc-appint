"use client"

import { SignInButton } from "@clerk/nextjs"
import { CheckCircle, LogIn, UserCheck } from "lucide-react"
import { useState } from "react"

import {
  SignupChildrenSelectionStep,
  SignupFinishedFailureStep,
  SignupFinishedSuccessStep,
  SignupFormStep,
  SignupInitialStep,
  SignupOrganizationAdminContactStep,
  SignupRoleSelectionStep,
} from "./steps"

export enum SignupStepEnum {
  INITIAL = "INITIAL",
  ROLE_SELECTION = "ROLE_SELECTION",
  FORM = "FORM",
  CHILDREN_SELECTION = "CHILDREN_SELECTION",
  ORGANIZATION_ADMIN_CONTACT = "ORGANIZATION_ADMIN_CONTACT",
  FINISHED_SUCCESS = "FINISHED_SUCCESS",
  FINISHED_FAILURE = "FINISHED_FAILURE",
  FINISHED_FAILURE_ORGANIZATION_ADMIN_NOTIFIED = "FINISHED_FAILURE_ORGANIZATION_ADMIN_NOTIFIED",
  FINISHED_FAILURE_ACCOUNT_ALREADY_EXISTS = "FINISHED_FAILURE_ACCOUNT_ALREADY_EXISTS",
}

export enum SignupRoleEnum {
  PARTICIPANT = "PARTICIPANT",
  PARENT = "PARENT",
}

export interface SignupChild {
  id: string
  firstName: string
  lastName: string
  grade: string
  valid?: boolean
}

export interface SignupUser {
  id?: string
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  phone?: string | null
  children?: SignupChild[]
}

export function Signup() {
  const [step, setStep] = useState<SignupStepEnum>(SignupStepEnum.INITIAL)
  const [role, setRole] = useState<SignupRoleEnum | null>(SignupRoleEnum.PARENT)
  const [user, setUser] = useState<SignupUser | null>(null)

  const contentByStep: Record<SignupStepEnum, React.ReactNode> = {
    [SignupStepEnum.INITIAL]: <SignupInitialStep onStepChange={setStep} />,
    [SignupStepEnum.ROLE_SELECTION]: <SignupRoleSelectionStep onStepChange={setStep} role={role} setRole={setRole} />,
    [SignupStepEnum.FORM]: <SignupFormStep user={user} role={role} onStepChange={setStep} setUser={setUser} />,
    [SignupStepEnum.CHILDREN_SELECTION]: (
      <SignupChildrenSelectionStep user={user} setUser={setUser} onStepChange={setStep} />
    ),
    [SignupStepEnum.ORGANIZATION_ADMIN_CONTACT]: (
      <SignupOrganizationAdminContactStep user={user} setUser={setUser} onStepChange={setStep} />
    ),
    [SignupStepEnum.FINISHED_SUCCESS]: <SignupFinishedSuccessStep />,
    [SignupStepEnum.FINISHED_FAILURE]: <SignupFinishedFailureStep />,
    [SignupStepEnum.FINISHED_FAILURE_ORGANIZATION_ADMIN_NOTIFIED]: (
      <SignupFinishedFailureStep
        title="Message sent!"
        description={
          <>
            Thank you!
            <br />
            Your school’s fundraising coordinator will help connect you to your child’s account and will contact you
            within 1-2 business days.
            <br />
            Check your email for updates.
          </>
        }
        icon={CheckCircle}
        iconClassname="text-green-500"
      />
    ),
    [SignupStepEnum.FINISHED_FAILURE_ACCOUNT_ALREADY_EXISTS]: (
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
