"use client"

import { useSession } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Calendar, Check, Download, ExternalLink, PenLine } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { UAParser } from "ua-parser-js"
import { z } from "zod"

import { NotFound } from "@/components/not-found"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import { WithTooltip } from "@/components/ui/tooltip"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { sortObjectByKeyOrder } from "@/utils/object"
import { capitalizeEveryWord } from "@/utils/string"

const formSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  checkbox: z.boolean().refine(val => val === true, { message: "You must check this box to continue" }),
})
type FormValues = z.infer<typeof formSchema>

export default function DocumentPage() {
  const utils = api.useUtils()
  const { documentUserId } = useParams<{ documentUserId: string }>()
  const { user, loggedInUserId, isLoading: isLoadingLoggedInUser } = useLoggedInUser()
  const { session, isLoaded: sessionLoaded } = useSession()
  const [deviceInfo, setDeviceInfo] = useState<Record<string, string> | null>(null)

  const { data: documentUser, isLoading } = api.documentsUsers.getById.useQuery(
    { id: documentUserId, userId: loggedInUserId ?? "" },
    { enabled: !!loggedInUserId }
  )

  const { mutateAsync: signDocument } = api.documentsUsers.signDocument.useMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      checkbox: false,
    },
  })

  const profileFirstName = user?.firstName?.trim() ?? ""
  const profileLastName = user?.lastName?.trim() ?? ""

  useEffect(() => {
    if (profileFirstName) form.setValue("firstName", profileFirstName)
    if (profileLastName) form.setValue("lastName", profileLastName)
  }, [profileFirstName, profileLastName, form])

  const watchFirstName = form.watch("firstName")
  const watchLastName = form.watch("lastName")

  useEffect(() => {
    if (typeof window !== "undefined" && !isLoadingLoggedInUser && sessionLoaded) {
      void collectDeviceInfo()
    }
  }, [isLoadingLoggedInUser, sessionLoaded])

  const collectDeviceInfo = async () => {
    try {
      const parser = new UAParser()
      const result = parser.getResult()

      const info = {
        device:
          `${result.device.vendor ?? ""} ${result.device.model ?? ""} ${result.device.type ?? ""}`.trim() ||
          "Unknown Device",
        operatingSystem: `${result.os.name ?? ""} ${result.os.version ?? ""}`.trim() || "Unknown OS",
        browser: `${result.browser.name ?? ""} ${result.browser.version ?? ""}`.trim() || "Unknown Browser",
        sessionId: session?.id ?? "sess_unknown",
        userId: user?.id ?? "user_unknown",
      }

      setDeviceInfo(info)
    } catch (_error) {
      setDeviceInfo(null)
    }
  }

  const onSubmit = async (data: FormValues) => {
    await signDocument({
      id: documentUserId,
      metadata: {
        date: new Date().toLocaleString(),
        fullName: capitalizeEveryWord(`${data.firstName} ${data.lastName}`),
        email: user?.primaryEmailAddress?.emailAddress ?? "-",
        phone: user?.primaryPhoneNumber?.phoneNumber ?? "-",
        signedDigitally: "true",
        ...deviceInfo,
      },
      userId: loggedInUserId ?? null,
    })

    toast.success("Document signed successfully")
    void utils.documentsUsers.getByUserId.invalidate()
    await utils.documentsUsers.getById.invalidate()
  }

  if (isLoading || isLoadingLoggedInUser) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="w-72 h-8" />
        <div className="flex flex-col md:flex-row gap-4 max-w-md">
          <Skeleton className="w-full h-96" />
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    )
  }

  if (!documentUser) {
    return <NotFound />
  }

  const isSigned = (documentUser.status as DocumentsUsersStatusEnum) === DocumentsUsersStatusEnum.SIGNED

  return (
    <div className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <WithTooltip
          content="Go back to your documents"
          side="top"
          trigger={
            <Link
              href={
                (documentUser?.status as DocumentsUsersStatusEnum) === DocumentsUsersStatusEnum.SIGNED
                  ? "/dashboard/documents#signed"
                  : "/dashboard/documents"
              }
            >
              <ArrowLeft className="w-5 h-5 cursor-pointer" />
            </Link>
          }
        />
        {documentUser?.document?.name ?? "Document"}
      </h2>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="p-6 flex flex-col gap-4 max-w-md w-full">
          <iframe
            src={documentUser?.document?.fileUrl ?? ""}
            style={{ width: "100%", height: "250px" }}
            title="PDF Viewer"
          />
          <div className="font-semibold leading-6 first-letter:uppercase">{documentUser?.document?.name}</div>
          <div className="flex items-center gap-2">
            <Calendar />
            {documentUser?.document && (
              <div className="text-sm text-muted-foreground">
                {formatDate(documentUser?.document?.createdAt)} (Sent)
              </div>
            )}
          </div>

          <div className="flex flex-row gap-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => window.open(documentUser?.document?.fileUrl, "_blank")}
            >
              Open <ExternalLink />
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              onClick={async () => {
                if (!documentUser?.document?.fileUrl) return

                await fetch(documentUser.document.fileUrl)
                  .then(response => response.blob())
                  .then(blob => {
                    const blobUrl = window.URL.createObjectURL(blob)

                    const link = document.createElement("a")
                    link.href = blobUrl
                    link.download = documentUser?.document?.name ?? "document"

                    document.body.appendChild(link)
                    link.click()

                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(blobUrl)
                  })
              }}
            >
              Download <Download />
            </Button>
          </div>
          {isSigned && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="text-chart-2" /> Signed
            </div>
          )}
        </Card>

        {isSigned ? (
          <div className="flex flex-col gap-4 py-6 px-4 max-w-md rounded-lg bg-accent w-full">
            <div className="font-semibold">Electronic Signature Record</div>

            <div className="flex flex-col text-sm">
              {Object.entries(
                sortObjectByKeyOrder<Record<string, string>>((documentUser?.metadata ?? {}) as Record<string, string>, [
                  "fullName",
                  "email",
                  "phone",
                ])
              ).map(([key, value]) => (
                <div key={key}>
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}: {value}
                </div>
              ))}
            </div>

            {Object.entries(documentUser?.metadata ?? {}).find(([key]) => key === "fullName")?.[1] && (
              <div className="font-mrDafoe text-4xl text-center border-b">
                {Object.entries(documentUser?.metadata ?? {}).find(([key]) => key === "fullName")?.[1]}
              </div>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-md">
              <FormFieldWrapper
                name="firstName"
                control={form.control}
                label="Your First Name"
                type="text"
                required
                disabled
              />
              <FormFieldWrapper
                name="lastName"
                control={form.control}
                label="Your Last Name"
                type="text"
                required
                disabled
              />
              <div className="font-mrDafoe text-4xl text-center border-b">
                {watchFirstName} {watchLastName}
              </div>

              <FormFieldWrapper
                name="checkbox"
                control={form.control}
                type="checkbox"
                label="By checking this box, I authorize my child to check out their first case and acknowledge that submitting my signature constitutes my agreement to the terms of this document."
                required
                className="[&>*]:items-start"
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing..." : "Sign Digital Document"}
                <PenLine />
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}
