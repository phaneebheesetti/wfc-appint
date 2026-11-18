import { create, useStore } from "zustand"
import { useShallow } from "zustand/react/shallow"

import { type FileWithPreview } from "@/components/file-upload"

export interface ParticipantRow {
  firstName: string
  lastName: string
  grade: string
  teacherName: string
  participantEmail?: string
  participantPhone?: string
  parentEmail?: string
  parentPhone?: string
}

type ParticipantsByFileId = Record<string, ParticipantRow[]>

export type ParticipantsUploadState = {
  participantsByFileId: ParticipantsByFileId
  files: FileWithPreview[]
}

export type ParticipantsUploadActions = {
  setParticipantsByFileId: (participantsByFileId: ParticipantsByFileId) => void
  setFiles: (files: FileWithPreview[]) => void
}

export type ParticipantsUploadStore = ParticipantsUploadState & ParticipantsUploadActions

export const participantsUploadStore = create<ParticipantsUploadStore>(set => ({
  participantsByFileId: {},
  files: [],

  setParticipantsByFileId: (participantsByFileId: ParticipantsByFileId) => set({ participantsByFileId }),
  setFiles: (files: FileWithPreview[]) => set({ files }),
}))

export const useParticipantsUploadStore = <T>(selector: (store: ParticipantsUploadStore) => T): T => {
  return useStore(participantsUploadStore, useShallow(selector))
}
