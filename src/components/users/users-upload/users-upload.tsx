"use client"

import { CircleX, Download, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SelectionBar } from "@/components/ui/selection-bar"
import { Separator } from "@/components/ui/separator"
import { WithTooltip } from "@/components/ui/tooltip"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks"
import { type User } from "@/server/db/schema"
import { type UsersBulkResult } from "@/server/services/users/users-bulk-result"
import { type ParticipantRow, useParticipantsUploadStore } from "@/stores"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"

import { UsersEditableTable } from "./users-editable-table"
import { UsersHeader } from "./users-header"
import { UsersImages } from "./users-images"

const participantRowSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  grade: z.string().min(1, `${GRADE_LABEL} is required`),
  teacherName: z.string().min(1, `${TEACHER_LABEL} name is required`),
  participantEmail: z.email("Invalid email").optional().or(z.literal("")),
  participantPhone: z.string().optional().or(z.literal("")),
  parentEmail: z.email("Invalid email").optional().or(z.literal("")),
  parentPhone: z.string().optional().or(z.literal("")),
})

interface UsersUploadProps {
  title: string
  organizationId: string
  campaignId?: string
}

export type ChangedCells = Record<number, Record<string, boolean>>

const BULK_SIZE = 25

export const UsersUpload = ({ title, organizationId, campaignId }: UsersUploadProps) => {
  const router = useRouter()
  const utils = api.useUtils()
  const { loggedInUserId } = useLoggedInUser()

  const { participantsByFileId, files } = useParticipantsUploadStore(state => ({
    participantsByFileId: state.participantsByFileId,
    files: state.files,
  }))

  const { mutateAsync: findUpdateOrCreateManyUsers } = api.users.findUpdateOrCreateMany.useMutation()
  const { mutateAsync: upsertManyOrganizationsUsers } = api.organizationsUsers.upsertMany.useMutation()
  const { mutateAsync: upsertManyCampaignsUsers } = api.campaignsUsers.upsertMany.useMutation()

  const [tableDataByFileId, setTableDataByFileId] = useState<Record<string, ParticipantRow[]>>({})
  const [errorCountByFileId, setErrorCountByFileId] = useState<Record<string, number>>({})
  const [changedCellsByFileId, setChangedCellsByFileId] = useState<Record<string, ChangedCells>>({})
  const [selectedRowsByFileId, setSelectedRowsByFileId] = useState<Record<string, Set<number>>>({})

  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id ?? "")
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [hasError] = useState<boolean>(false)

  const tableData = useMemo(() => tableDataByFileId[selectedFileId] ?? [], [tableDataByFileId, selectedFileId])
  const changedCells = useMemo(() => changedCellsByFileId[selectedFileId] ?? {}, [changedCellsByFileId, selectedFileId])

  const selectedRows: Set<number> = useMemo(
    () => selectedRowsByFileId[selectedFileId] ?? new Set(),
    [selectedRowsByFileId, selectedFileId]
  )

  const totalErrorCount = useMemo(
    () => Object.values(errorCountByFileId).reduce((acc, count) => acc + count, 0),
    [errorCountByFileId]
  )

  const stableUpdateData = useCallback(
    (rowIndex: number, columnId: string, value: string) => {
      setTableDataByFileId(oldDataByFileId => {
        const newDataByFileId = { ...oldDataByFileId }

        let newData = newDataByFileId[selectedFileId] ?? []

        newData = newData.map((row, index) => (index === rowIndex ? { ...row, [columnId]: value } : row))

        return {
          ...oldDataByFileId,
          [selectedFileId]: newData,
        }
      })
    },
    [selectedFileId]
  )

  function getErrorCountByTableData(tableData: ParticipantRow[]) {
    let totalErrors = 0

    tableData.forEach(row => {
      const result = participantRowSchema.safeParse(row)

      if (!result.success) {
        const fieldsInvalid: Record<string, boolean> = {}

        result.error.issues.forEach(issue => {
          const fieldName = issue.path[0]

          if (fieldName) {
            fieldsInvalid[fieldName as string] = true
            totalErrors++
          }
        })
      }
    })

    return totalErrors
  }

  useEffect(() => {
    const newTableDataByFileId = Object.fromEntries(files.map(file => [file.id, participantsByFileId[file.id] ?? []]))
    setTableDataByFileId(newTableDataByFileId)

    const newErrorCountByFileId = Object.fromEntries(
      files.map(file => [file.id, getErrorCountByTableData(participantsByFileId[file.id] ?? [])])
    )
    setErrorCountByFileId(newErrorCountByFileId)
  }, [participantsByFileId])

  useEffect(() => {
    const errorCount = getErrorCountByTableData(tableData)

    setErrorCountByFileId(prev => ({ ...prev, [selectedFileId]: errorCount }))
  }, [tableData, selectedFileId])

  useEffect(() => {
    if (files.length === 0) {
      return router.push(`/dashboard/organizations/${organizationId}`)
    }
  }, [files, organizationId, router])

  const handleCheckboxChange = (index: number) => {
    setSelectedRowsByFileId(oldSelectedRowsByFileId => {
      const newSelectedRows = new Set(oldSelectedRowsByFileId[selectedFileId] ?? [])

      if (newSelectedRows.has(index)) {
        newSelectedRows.delete(index)
      } else {
        newSelectedRows.add(index)
      }

      return {
        ...oldSelectedRowsByFileId,
        [selectedFileId]: newSelectedRows,
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedRows.size === tableData.length) {
      setSelectedRowsByFileId(prev => ({ ...prev, [selectedFileId]: new Set() }))
    } else {
      setSelectedRowsByFileId(prev => ({
        ...prev,
        [selectedFileId]: new Set(tableData.map((_, i) => i)),
      }))
    }
  }

  const handleDelete = () => {
    setTableDataByFileId(prev => ({
      ...prev,
      [selectedFileId]: tableData.filter((_, index) => !selectedRows.has(index)),
    }))
    setSelectedRowsByFileId(prev => ({ ...prev, [selectedFileId]: new Set() }))
  }

  const handleUpload = async () => {
    setIsSaving(true)
    setUploadProgress(0)

    try {
      const { parentIdMap, hasErrors } = await handleUploadParents(tableData)
      if (hasErrors) {
        return
      }
      await handleUploadParticipants(tableData, parentIdMap)

      toast.success("Participants uploaded successfully!", {
        description: "Refreshing participants list, wait a moment...",
        duration: 5_000,
        closeButton: true,
      })

      void utils.campaigns.getHeaderMetrics.invalidate()
      void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
      void utils.campaigns.getSmallCardsMetrics.invalidate()
      void utils.organizationsUsers.getAllParticipants.invalidate()
      void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()

      if (campaignId) {
        router.push(`/dashboard/organizations/${organizationId}/campaigns/${campaignId}`)
      } else {
        router.push(`/dashboard/organizations/${organizationId}#participants`)
      }
    } catch (error) {
      console.error("error", error)
      toast.error("Error uploading participants", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadParents = async (
    tableData: ParticipantRow[]
  ): Promise<{ parentIdMap: Map<string, string>; hasErrors: boolean }> => {
    if (!tableData.length) {
      setUploadProgress(0.5)

      return { parentIdMap: new Map<string, string>(), hasErrors: false }
    }

    // Create a Map to deduplicate parents by email (using email if present, else phone as fallback).
    const uniqueParentsMap = new Map<string, { email?: string; phone?: string }>()
    tableData.forEach(row => {
      const email = row.parentEmail?.trim()
      const phone = row.parentPhone?.trim()
      if (email) {
        uniqueParentsMap.set(email.toLowerCase(), { email, phone })
      } else if (phone) {
        uniqueParentsMap.set(`phone:${phone}`, { email, phone })
      }
    })

    const uniqueParents = Array.from(uniqueParentsMap.values())
    if (uniqueParents.length === 0) {
      setUploadProgress(0.5)

      return { parentIdMap: new Map<string, string>(), hasErrors: false }
    }

    // Map parents to minimal user object (email normalized to lowercase)
    const parentsToInvite = uniqueParents.map(parent => {
      const normalizedEmail = parent.email?.trim().toLowerCase()
      const firstName = normalizedEmail?.split("@")[0] ?? ""

      return {
        status: UsersStatusEnum.PENDING,
        invitedByUserId: loggedInUserId,
        role: RolesEnum.PARENT,
        email: normalizedEmail,
        phone: parent.phone,
        firstName,
        fullName: firstName,
      }
    })

    const numberOfChunks = Math.ceil(parentsToInvite.length / BULK_SIZE)
    let uploadProgress = 0

    const chunks: (typeof parentsToInvite)[] = []
    for (let i = 0; i < parentsToInvite.length; i += BULK_SIZE) {
      chunks.push(parentsToInvite.slice(i, i + BULK_SIZE))
    }

    const chunkResults: User[][] = []
    let hasErrors = false

    for (const chunk of chunks) {
      const result = await findUpdateOrCreateManyUsers(chunk)
      const okUsers = pickOkUsers(result)
      toastBulkErrors(result)
      if (result.some(r => r.status === "error")) hasErrors = true
      chunkResults.push(okUsers)
      // welcome-parent fires server-side from usersCreate / usersCloneForRole
      // when the PARENT row is first persisted — no UI fan-out needed.

      uploadProgress += 1 / numberOfChunks
      setUploadProgress(uploadProgress / 2)
    }

    const allUsers = chunkResults.flat()

    const parentIdByEmailOrPhone = new Map<string, string>()

    for (const user of allUsers) {
      if (user.email) parentIdByEmailOrPhone.set(user.email.trim().toLowerCase(), user.id)
      if (user.phone) parentIdByEmailOrPhone.set(user.phone.trim(), user.id)
    }

    return { parentIdMap: parentIdByEmailOrPhone, hasErrors }
  }

  const handleUploadParticipants = async (
    tableData: ParticipantRow[],
    parentIdByEmailOrPhone?: Map<string, string>
  ): Promise<void> => {
    if (!tableData.length) return

    const participantsToInvite = tableData.map(row => {
      const parentEmail = row.parentEmail?.trim().toLowerCase()
      const participantEmail = row.participantEmail?.trim().toLowerCase()

      const parentUserId =
        parentIdByEmailOrPhone?.get(parentEmail ?? "") ??
        parentIdByEmailOrPhone?.get(row.parentPhone?.trim() ?? "") ??
        undefined

      const firstName = row.firstName || (participantEmail?.split("@")[0] ?? "")

      return {
        status: UsersStatusEnum.ACTIVE,
        invitedByUserId: loggedInUserId,
        role: RolesEnum.PARTICIPANT,
        email: row.participantEmail ?? undefined,
        phone: row.participantPhone ?? undefined,
        firstName,
        lastName: row.lastName || undefined,
        fullName: `${firstName} ${row.lastName ?? ""}`.trim(),
        grade: row.grade || undefined,
        teacherName: row.teacherName || undefined,
        parentUserId,
      }
    })

    const numberOfChunks = Math.ceil(participantsToInvite.length / BULK_SIZE)
    let uploadProgress = 0

    const chunks: (typeof participantsToInvite)[] = []
    for (let i = 0; i < participantsToInvite.length; i += BULK_SIZE) {
      chunks.push(participantsToInvite.slice(i, i + BULK_SIZE))
    }

    for (const chunk of chunks) {
      const result = await findUpdateOrCreateManyUsers(chunk)
      const okUsers = pickOkUsers(result)
      toastBulkErrors(result)

      const allUserIds = okUsers.map(user => user.id)

      await upsertManyOrganizationsUsers({
        organizationId,
        users: allUserIds.map(userId => ({ userId, eligible: true })),
      })

      if (campaignId) {
        await upsertManyCampaignsUsers({ organizationId, campaignId, userIds: allUserIds })
      }

      uploadProgress += 1 / numberOfChunks
      setUploadProgress(0.5 + uploadProgress / 2)
    }
  }

  const handleDownloadFailedParticipants = () => {
    const failedParticipants = tableData.map(data => ({
      first_name: data.firstName,
      last_name: data.lastName,
      grade: data.grade,
      teacher_name: data.teacherName,
      participant_email: data.participantEmail,
      participant_phone: data.participantPhone,
      parent_email: data.parentEmail,
      parent_phone: data.parentPhone,
    }))

    const csv = Papa.unparse(failedParticipants)
    const blob = new Blob([csv], { type: "text/csv" })
    const filename = `failed-participants-${formatDate(new Date())}.csv`
    const link = document.createElement("a")

    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function pickOkUsers(result: UsersBulkResult[]): User[] {
    return result.flatMap(r => (r.status === "ok" ? [r.user] : []))
  }

  function toastBulkErrors(result: UsersBulkResult[]): void {
    for (const r of result) {
      if (r.status === "error") toast.error(r.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {hasError ? (
        <Alert variant="destructive">
          <CircleX />
          <AlertTitle>
            Error uploading {tableData.length} participant{tableData.length > 1 ? "s" : ""}!
          </AlertTitle>
          <AlertDescription>
            <div className="my-4">
              1. Click below to download CSV file with only failed participants.
              <br />
              2. Review the CSV file information and try to upload again later.
              <br />
              3. If the errors persist, please contact support.
              <br />
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadFailedParticipants}>
              <Download /> Download CSV with failed participants
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="text-2xl font-semibold">{title}</div>

          <Separator />

          <UsersHeader
            organizationId={organizationId}
            campaignId={campaignId}
            totalErrorCount={totalErrorCount}
            isSaving={isSaving}
            handleUpload={handleUpload}
            uploadProgress={uploadProgress}
          />

          <UsersImages
            selectedFileId={selectedFileId}
            setSelectedFileId={setSelectedFileId}
            errorCountByFileId={errorCountByFileId}
          />

          <UsersEditableTable
            tableData={tableData}
            selectedRows={selectedRows}
            changedCells={changedCells}
            handleSelectAll={handleSelectAll}
            handleCheckboxChange={handleCheckboxChange}
            stableUpdateData={stableUpdateData}
            setChangedCells={changedCells =>
              setChangedCellsByFileId(prev => ({ ...prev, [selectedFileId]: changedCells }))
            }
          />

          <SelectionBar
            selectedCount={selectedRows.size}
            onClearSelection={() => setSelectedRowsByFileId(prev => ({ ...prev, [selectedFileId]: new Set() }))}
          >
            <WithTooltip
              content={"Delete selected participants"}
              side="top"
              trigger={
                <Button variant="ghost" className="rounded-full h-8 w-8" size="icon" onClick={handleDelete}>
                  <Trash2 className="w-6 h-6 text-red-600" />
                </Button>
              }
            />
          </SelectionBar>
        </>
      )}
    </div>
  )
}
