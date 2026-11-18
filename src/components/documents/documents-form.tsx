import { ErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { FileUpload, type FileWithPreview } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Form, FormLabel, FormMessage } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { DocumentsTypeEnum } from "@/constants/documents"
import { useLoggedInUser } from "@/hooks"
import { type Document } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { filterOutObjectUndefinedAndNull } from "@/utils/object"

const formSchema = z.object({
  name: z.string().max(50),
  description: z.string().max(200).optional(),
  fileUrl: z.string(),
  permissionSlip: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface DocumentsFormProps {
  organizationId: string
  campaignId: string
  document?: Document
  onCreate?: (document: Document) => void
  onUpdate?: () => void
  onBack?: () => void
}

export function DocumentsForm({
  organizationId,
  campaignId,
  document,
  onCreate,
  onUpdate,
  onBack,
}: DocumentsFormProps) {
  const { mutateAsync: createDocument } = api.documents.create.useMutation()
  const { mutateAsync: updateDocument } = api.documents.update.useMutation()
  const { loggedInUserId } = useLoggedInUser()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...(document ? (filterOutObjectUndefinedAndNull(document) as Partial<FormValues>) : {}),
      permissionSlip: !document ? true : (document?.type as DocumentsTypeEnum) === DocumentsTypeEnum.PERMISSION_SLIP,
    },
  })

  const onSubmit = async (data: FormValues) => {
    if (document) {
      await handleUpdateDocument(data)
    } else {
      await handleCreateDocument(data)
    }
  }

  const handleCreateDocument = async (data: FormValues) => {
    const createdDocument = await createDocument({
      ...data,
      uploadedByUserId: loggedInUserId ?? "",
      organizationId,
      campaignId,
      type: data.permissionSlip ? DocumentsTypeEnum.PERMISSION_SLIP : DocumentsTypeEnum.DOCUMENT,
    })

    if (createdDocument) {
      onCreate?.(createdDocument)
    }
  }

  const handleUpdateDocument = async (data: FormValues) => {
    await updateDocument({
      ...data,
      id: document?.id,
      type: data.permissionSlip ? DocumentsTypeEnum.PERMISSION_SLIP : DocumentsTypeEnum.DOCUMENT,
    })
    toast.success(`Document updated successfully`)
    onUpdate?.()
  }

  const handleFilesChange = (files: FileWithPreview[]) => {
    if (files.length === 0) {
      form.resetField("fileUrl")
    } else {
      form.setValue("fileUrl", files?.[0]?.uploadUrl ?? "")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormFieldWrapper
          name="name"
          control={form.control}
          label="Name"
          className="col-span-2"
          type="text"
          maxLength={50}
          required
        />

        <FormFieldWrapper
          name="description"
          control={form.control}
          label="Description"
          className="col-span-2"
          type="textarea"
          maxLength={200}
        />

        {/* <FormFieldWrapper
          name="permissionSlip"
          control={form.control}
          label="Permission Slip"
          className="col-span-2"
          type="checkbox"
        /> */}

        <div className="col-span-2">
          <FormLabel>
            File <span className="text-destructive ml-1">*</span>
          </FormLabel>

          <FileUpload
            description="Accepted formats: .pdf"
            fileTypes={["PDF"]}
            onFilesChange={handleFilesChange}
            multiple={false}
            bucket={{ id: "documents" }}
          />

          <ErrorMessage
            errors={form.formState.errors}
            name="fileUrl"
            render={({ message }) => <FormMessage>{message}</FormMessage>}
          />
        </div>

        <div className={cn("col-span-2 flex justify-end gap-2", document && "justify-start")}>
          {onBack && (
            <Button
              variant="secondary"
              onClick={e => {
                e.preventDefault()
                onBack()
              }}
              disabled={form.formState.isSubmitting}
            >
              <ArrowLeft />
              Back
            </Button>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {document && <Save />}
            {document
              ? form.formState.isSubmitting
                ? "Saving..."
                : "Save"
              : form.formState.isSubmitting
                ? "Creating..."
                : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
