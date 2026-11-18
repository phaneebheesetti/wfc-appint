import { ErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Mails, UserIcon } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { stripHtml } from "string-strip-html"
import { z } from "zod"

import { DataTable, DataTableCell, DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormLabel, FormMessage } from "@/components/ui/form"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Modal } from "@/components/ui/modal"
import { WithTooltip } from "@/components/ui/tooltip"
import { APP_NAME } from "@/constants/app"
import { CampaignAnnouncementStatusEnum, CampaignAnnouncementTypeEnum } from "@/constants/campaign-announcements"
import { UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type CampaignUser, type User } from "@/server/db/schema"
import { batchFetch } from "@/trpc/batch"
import { TRPC_QUERY_ID_CHUNK_SIZE, api } from "@/trpc/react"
import { chunkArray } from "@/utils/array"
import { getUserDisplayName, maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

interface CampaignAnnouncementsCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  organizationId: string
  userId: string | null
}

const TITLE_MAX_LENGTH = 50

const formSchema = z
  .object({
    title: z.string("Required").max(TITLE_MAX_LENGTH),
    message: z.string("Required"),
    includeLink: z.boolean().optional(),
    sms: z.boolean(),
    email: z.boolean(),
    channels: z.boolean().optional(),
    userIds: z.array(z.string()).min(1),
  })
  .refine(data => data.sms || data.email, {
    message: "At least one channel (SMS or Email) must be selected",
    path: ["channels"],
  })
  .refine(
    data => {
      if (data.sms) {
        return data.message.length <= 150
      }

      return data.message.length <= 1000
    },
    {
      message: "SMS supports a maximum of 150 characters",
      path: ["message"],
    }
  )

type FormValues = z.infer<typeof formSchema>

export function CampaignAnnouncementsCreate({
  open,
  onOpenChange,
  campaignId,
  organizationId,
  userId,
}: CampaignAnnouncementsCreateProps) {
  const utils = api.useUtils()
  const { loggedInUserId, loggedInRole } = useLoggedInUser()

  const { data: campaignUsers = [], isLoading } = api.campaignsUsers.listByCampaignId.useQuery(
    { campaignId },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  )
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const participantUserIds = useMemo(() => campaignUsers.map(cu => cu.userId), [campaignUsers])

  const batches = chunkArray(participantUserIds, TRPC_QUERY_ID_CHUNK_SIZE)

  const queries = api.useQueries(util =>
    batches.map(batch => {
      return util.participantParentMapping.listByParticipantIds(
        { participantUserIds: batch },
        {
          enabled: participantUserIds.length > 0,
        }
      )
    })
  )

  const mappingsKey = queries.map(query => query.dataUpdatedAt).join("|")
  const allMappings = useMemo(() => queries.flatMap(query => query.data ?? []), [mappingsKey])
  const isMappingsLoading = queries.some(query => query.isLoading)

  const mappingsByParticipantId = useMemo(() => {
    const map = new Map<string, typeof allMappings>()
    for (const mapping of allMappings) {
      if (!map.has(mapping.participantUserId)) map.set(mapping.participantUserId, [])
      map.get(mapping.participantUserId)!.push(mapping)
    }
    return map
  }, [allMappings])

  const isActiveOrPending = (status: string | null | undefined) =>
    status === UsersStatusEnum.ACTIVE || status === UsersStatusEnum.PENDING

  const getParentUsers = (cu: { userId: string; user?: { parentUser?: User | null } | null }): User[] => {
    const mappings = mappingsByParticipantId.get(cu.userId) ?? []
    const parents = new Map<string, User>()

    // Legacy parent (if present)
    if (cu.user?.parentUser?.id) {
      parents.set(cu.user.parentUser.id, cu.user.parentUser)
    }
    // All mapping parents
    for (const mapping of mappings) {
      if (mapping.parentUser?.id) {
        parents.set(mapping.parentUser.id, mapping.parentUser)
      }
    }

    return Array.from(parents.values()).filter(p => isActiveOrPending(p.status))
  }

  const hasAnyParent = (cu: { userId: string; user?: { parentUser?: User | null } | null }): boolean => {
    return getParentUsers(cu).length > 0
  }

  const createManyMessages = api.channelMessages.createMany.useMutation()
  const createAnnouncement = api.campaignAnnouncements.create.useMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      includeLink: true,
      sms: false,
      email: true,
      userIds: userId ? [userId] : [],
    },
  })

  const watchSms = form.watch("sms")
  const userIds = form.watch("userIds")

  const allUserIds = useMemo(
    () => campaignUsers?.filter(cu => hasAnyParent(cu)).map(cu => cu.userId) ?? [],
    [campaignUsers, mappingsByParticipantId]
  )

  const sortedCampaignUsers = useMemo(() => {
    if (!campaignUsers) return []

    const sortGroup = (cu: (typeof campaignUsers)[number]) => (userIds.includes(cu.userId) ? 0 : 1)

    const sortName = (cu: (typeof campaignUsers)[number]) => cu.user?.fullName ?? ""

    return [...campaignUsers].sort((a, b) => {
      const groupA = sortGroup(a)
      const groupB = sortGroup(b)
      if (groupA !== groupB) return groupA - groupB
      return sortName(a).localeCompare(sortName(b))
    })
  }, [campaignUsers, userIds])

  useEffect(() => {
    if (campaignUsers?.length === 0 || !!userId) return

    form.setValue(
      "userIds",
      campaignUsers.map(cu => cu.userId)
    )
  }, [campaignUsers])

  const getAllContactInfo = () => {
    if (!userIds.length || !campaignUsers?.length) return { phoneNumbers: [], emailAddresses: [] }

    const selectedCampaignUsers = campaignUsers.filter(cu => userIds.includes(cu.userId))
    const allParents = selectedCampaignUsers.flatMap(cu => getParentUsers(cu))

    const phoneNumbers = Array.from(
      new Set(allParents.map(contact => contact.phone).filter((phone): phone is string => !!phone))
    )

    const emailAddresses = Array.from(
      new Set(allParents.map(contact => contact.email).filter((email): email is string => !!email))
    )

    return { phoneNumbers, emailAddresses }
  }

  const uniqueParentCount = useMemo(() => {
    if (!userIds.length || !campaignUsers?.length) return 0

    const selectedCampaignUsers = campaignUsers.filter(cu => userIds.includes(cu.userId))
    const allParents = selectedCampaignUsers.flatMap(cu => getParentUsers(cu))

    return new Set(allParents.map(p => p.id)).size
  }, [campaignUsers, userIds, mappingsByParticipantId])

  const onSubmit = async (data: FormValues) => {
    try {
      if (!loggedInUserId) {
        toast.error("You must be logged in to send messages")
        return
      }

      const organization = await utils.organizations.getById.fetch({ id: organizationId })
      const campaign = await utils.campaigns.getById.fetch({ id: campaignId })

      const { phoneNumbers, emailAddresses } = getAllContactInfo()

      if (data.sms) {
        if (!phoneNumbers.length) {
          toast.error("No valid phone numbers found in this fundraiser")
        } else {
          const response = await fetch("/api/sms/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phoneNumbers,
              message: stripHtml(data.message).result,
              includeLink: data.includeLink,
            }),
          })

          if (!response.ok) {
            toast.error("Failed to send SMS messages")
          } else {
            toast.success(`SMS messages have been sent successfully`)
            // Create SMS announcement record
            await createAnnouncement.mutateAsync({
              organizationId,
              campaignId,
              title: data.title,
              content: stripHtml(data.message).result,
              type: CampaignAnnouncementTypeEnum.SMS,
              status: CampaignAnnouncementStatusEnum.DELIVERED,
              reach: phoneNumbers.length,
              createdByUserId: loggedInUserId,
            })
          }
        }
      }

      if (data.email) {
        if (!emailAddresses.length) {
          toast.error("No valid email addresses found in this fundraiser")
        } else {
          let response = null
          try {
            const fromName = organization?.name ?? APP_NAME

            response = await fetch("/api/email/send/announcement", {
              method: "POST",
              body: JSON.stringify({
                emailAddresses,
                message: data.message,
                title: data.title,
                fromName,
                organizationName: organization?.name ?? "Unknown",
                organizationAdminEmail: organization?.adminUser?.email,
                campaignName: campaign?.name ?? "Unknown",
                includeLink: data.includeLink,
              }),
            })
          } catch (_error) {
            toast.error("Failed to process email messages, please try again")
          }

          if (!response?.ok) {
            toast.error("Failed to send email messages")
          } else {
            toast.success("Email messages have been sent successfully")
            // Create email announcement record
            await createAnnouncement.mutateAsync({
              organizationId,
              campaignId,
              title: data.title,
              content: data.message,
              type: CampaignAnnouncementTypeEnum.EMAIL,
              status: CampaignAnnouncementStatusEnum.DELIVERED,
              reach: emailAddresses.length,
              createdByUserId: loggedInUserId,
            })
          }
        }
      }

      const userChannels = await batchFetch(data.userIds, userIds => utils.channels.listByUsersIds.fetch({ userIds }))

      if (userChannels?.length > 0) {
        try {
          await createManyMessages.mutateAsync({
            channelIds: userChannels.map(channel => channel.id),
            content: data.message,
            userId: loggedInUserId,
          })

          // Create app announcement record
          await createAnnouncement.mutateAsync({
            organizationId,
            campaignId,
            title: data.title,
            content: data.message,
            type: CampaignAnnouncementTypeEnum.APP,
            status: CampaignAnnouncementStatusEnum.DELIVERED,
            reach: userChannels.length,
            createdByUserId: loggedInUserId,
          })
        } catch (_error) {
          return onOpenChange(false)
        }
      }

      void utils.campaignAnnouncements.listByCampaignId.invalidate({ campaignId })

      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send messages"
      toast.error(`Failed to send messages ${errorMessage}`)
    }
  }

  const fields: FormField<FormValues>[] = [
    {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
      maxLength: TITLE_MAX_LENGTH,
    },
    {
      name: "message",
      label: "Message",
      type: "rich-text",
      required: true,
      maxLength: watchSms ? 150 : 1000,
    },
    {
      name: "includeLink",
      label: "Include link to the app",
      type: "checkbox",
    },
  ]

  const ChannelFields: FormField<FormValues>[] = [
    {
      name: "email",
      label: "Email",
      type: "switch",
    },
    {
      name: "sms",
      label: "SMS",
      type: "switch",
    },
  ]

  const columns = useMemo<ColumnDef<CampaignUser>[]>(
    () => [
      {
        id: "checkbox",
        header: () => {
          const toggleAll = () => form.setValue("userIds", userIds.length === allUserIds.length ? [] : allUserIds)

          return (
            <WithTooltip
              content={userIds.length === allUserIds.length ? "Unselect all" : "Select all"}
              side="top"
              trigger={
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-accent">
                  <Checkbox
                    aria-label={userIds.length === allUserIds.length ? "Unselect all" : "Select all"}
                    checked={allUserIds.length > 0 && userIds.length === allUserIds.length}
                    disabled={allUserIds.length === 0}
                    className="disabled:border-red-500"
                    onCheckedChange={toggleAll}
                  />
                </div>
              }
            />
          )
        },
        cell: ({ row }) => {
          const rowHasParent = hasAnyParent(row.original)
          return (
            <Checkbox
              checked={rowHasParent ? userIds.includes(row.original.userId) : "indeterminate"}
              disabled={!rowHasParent}
              className="ml-3"
              onCheckedChange={() => {
                if (userIds.includes(row.original.userId)) {
                  form.setValue(
                    "userIds",
                    userIds.filter(id => id !== row.original.userId)
                  )
                } else {
                  form.setValue("userIds", [...userIds, row.original.userId])
                }
              }}
            />
          )
        },
        size: 40,
      },
      {
        accessorKey: "user.fullName",
        enableSorting: false,
        header: props => <DataTableColumnHeader {...props} title="Participant" />,
        cell: props => {
          const u = props.row.original.user
          const displayUser =
            u && shouldMaskParticipantPii(loggedInRole, participantAccessData?.isGranted ?? false)
              ? maskParticipantUserPii(u)
              : u
          return <DataTableCell {...props} value={displayUser} type="nameAndEmail" />
        },
      },
      {
        id: "user_parentUser_fullName",
        accessorFn: row => {
          const parents = getParentUsers(row)
          return parents
            .map(p => p.fullName ?? "")
            .filter(Boolean)
            .join(" ")
        },
        enableSorting: false,
        header: props => <DataTableColumnHeader {...props} title="Parent" />,
        cell: props => {
          const parents = getParentUsers(props.row.original)
          if (parents.length === 0) return <div>-</div>

          return (
            <div className="flex flex-col gap-2">
              {parents.map(parent => (
                <div key={parent.id}>
                  <div className="first-letter:uppercase">{getUserDisplayName(parent)}</div>
                  <div className="text-xs text-muted-foreground">{parent.email}</div>
                </div>
              ))}
            </div>
          )
        },
      },
    ],
    [userIds, allUserIds, loggedInRole, mappingsByParticipantId]
  )

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Message"
      description="Send messages to all fundraiser participants"
      icon={Mails}
      iconClassName="text-green-500"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {fields.map(field => (
            <FormFieldWrapper key={field.name} {...field} control={form.control} />
          ))}

          {/* WFAL-201: Channels section hidden - defaulting to email only */}
          <div className="hidden flex-col gap-2">
            <FormLabel>Channels</FormLabel>
            <div className="flex gap-6">
              {ChannelFields.map(field => (
                <FormFieldWrapper key={field.name} {...field} control={form.control} />
              ))}
            </div>

            <ErrorMessage
              errors={form.formState.errors}
              name="channels"
              render={({ message }) => <FormMessage>{message}</FormMessage>}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FormLabel>Participants</FormLabel>

            <DataTable
              data={sortedCampaignUsers ?? []}
              loading={isLoading}
              columns={columns}
              emptyState={{
                title: "Participants will appear here",
                icon: UserIcon,
              }}
              multiColumnFilter={{
                columns: [
                  { accessorKey: "user.fullName", name: "Participant" },
                  { accessorKey: "user_parentUser_fullName", name: "Parent" },
                ],
              }}
              searchContainerClassName="md:w-full"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting || userIds.length === 0 || isMappingsLoading}>
              {form.formState.isSubmitting
                ? "Sending..."
                : `Send to ${uniqueParentCount} ${uniqueParentCount === 1 ? "Parent" : "Parents"}`}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  )
}
