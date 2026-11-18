"use client"

import { FileSpreadsheet, type LucideIcon, UserPlus } from "lucide-react"

import { type ModalState } from "./organizations-participants-create"

interface ParticipantsCreateOptionsProps {
  setModalState: (state: ModalState) => void
  campaignId?: string
}

type ParticipantCreateOption = {
  label: string
  description: string
  icon: LucideIcon
  onClick: () => void
}

export function ParticipantsCreateOptions({ setModalState }: ParticipantsCreateOptionsProps) {
  const options: ParticipantCreateOption[] = [
    // ...(campaignId
    //   ? [
    //       {
    //         label: "Add Existing",
    //         description: "Select an existing participant not in this fundraiser",
    //         icon: UserSearch,
    //         onClick: () => setModalState("existing"),
    //       },
    //     ]
    //   : []),
    {
      label: "Add New",
      description: "Manually enter details for a single participant/parent",
      icon: UserPlus,
      onClick: () => setModalState("individual"),
    },
    {
      label: "Upload CSV",
      description: "Add multiple participants/parents by uploading a CSV file",
      icon: FileSpreadsheet,
      onClick: () => setModalState("upload-csv"),
    },
    // {
    //   label: "Upload Image(s)",
    //   description: "Add multiple participants/parents by uploading image(s)",
    //   icon: ImagePlus,
    //   onClick: () => setModalState("upload-image"),
    // },
    // {
    //   label: "Share QR Code",
    //   description: "Share a QR code to let participants or parents self-register",
    //   icon: QrCode,
    //   onClick: () => setModalState("qr-code"),
    // },
  ]

  return (
    <div className="flex flex-col gap-3">
      {options.map(option => {
        const { label, description, onClick } = option

        return (
          <button
            key={label}
            onClick={onClick}
            className="flex w-full gap-3 items-center justify-between rounded-lg border border-gray-200 p-3 text-left transition hover:bg-gray-100"
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-slate-500 min-h-10 flex items-start ">{description}</p>
            </div>
            <div className="flex items-center justify-center min-w-16">
              <option.icon className="text-slate-500" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
