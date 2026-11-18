"use client"

import type { Column, ColumnDef, Row } from "@tanstack/react-table"
import { Eye, FileText, Pen } from "lucide-react"
import Link from "next/link"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type DocumentUser } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { getUserDisplayName } from "@/utils/users"

interface DocumentsUsersListProps {
  status: DocumentsUsersStatusEnum
}

export function DocumentsUsersList({ status }: DocumentsUsersListProps) {
  const { loggedInRole: role, loggedInUserId } = useLoggedInUser()

  const { data, isLoading } =
    role !== RolesEnum.PARENT
      ? api.documentsUsers.getByUserId.useQuery({ userId: loggedInUserId!, status }, { enabled: !!loggedInUserId })
      : api.documentsUsers.listFromParentId.useQuery(
          { parentId: loggedInUserId!, status },
          { enabled: !!loggedInUserId }
        )

  if (!role) return null

  const columns: ColumnDef<DocumentUser>[] = [
    ...(status === DocumentsUsersStatusEnum.PENDING
      ? [
          {
            id: "sign",
            cell: ({ row }: { row: Row<DocumentUser> }) => (
              <div className="flex justify-start">
                <Link href={`/dashboard/documents/${row.original.id}`}>
                  <Button variant="outline">
                    <Pen /> Sign
                  </Button>
                </Link>
              </div>
            ),
          },
        ]
      : []),
    {
      accessorKey: "document.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Document" />,
      cell: ({ row }) => {
        const documentUser = row.original
        const document = row.original.document

        if ((documentUser?.status as DocumentsUsersStatusEnum) === DocumentsUsersStatusEnum.SIGNED) {
          return (
            <div>
              {document?.name}
              {documentUser?.signedAt && (
                <div className="text-sm text-muted-foreground">Signed on {formatDate(documentUser?.signedAt)}</div>
              )}
            </div>
          )
        }

        return (
          <div>
            {document?.name}
            {document?.createdAt && (
              <div className="text-sm text-muted-foreground">{formatDate(document?.createdAt)}</div>
            )}
          </div>
        )
      },
    },
    ...(role === RolesEnum.PARENT
      ? [
          {
            accessorKey: "user.fullName" as const,
            header: ({ column }: { column: Column<DocumentUser, unknown> }) => (
              <DataTableColumnHeader column={column} title="Participant" />
            ),
            cell: ({ row }: { row: Row<DocumentUser> }) => {
              const user = row.original.user

              return <div>{getUserDisplayName(user)}</div>
            },
          },
        ]
      : []),
    {
      accessorKey: "document.campaign.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fundraiser" />,
      cell: ({ row }) => {
        const document = row.original.document

        return (
          <div>
            <div>{document?.campaign?.name}</div>
            <div className="text-sm text-muted-foreground">{document?.organization?.name}</div>
          </div>
        )
      },
    },
    ...(status === DocumentsUsersStatusEnum.SIGNED
      ? [
          {
            id: "actions",
            cell: ({ row }: { row: Row<DocumentUser> }) => (
              <div className="flex justify-end">
                <Link href={`/dashboard/documents/${row.original.id}`}>
                  <Button variant="secondary">
                    <Eye /> View
                  </Button>
                </Link>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <DataTable
        data={data ?? []}
        emptyState={{
          title:
            role === RolesEnum.PARENT
              ? `If there are any ${status} documents for your family members, they will appear here`
              : `If you have any ${status} documents, they will appear here`,
          icon: FileText,
        }}
        columns={columns}
        loading={isLoading}
        multiColumnFilter={{
          columns: [
            {
              accessorKey: role === RolesEnum.PARENT ? "user.fullName" : "document.name",
              name: role === RolesEnum.PARENT ? "Participant" : "Document",
            },
          ],
        }}
      />
    </>
  )
}
