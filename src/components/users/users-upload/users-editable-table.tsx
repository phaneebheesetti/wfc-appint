import { type ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { type ParticipantRow } from "@/stores"

import { UserEditableCell } from "./user-editable-cell"
import { type ChangedCells } from "./users-upload"

interface UsersEditableTableProps {
  tableData: ParticipantRow[]
  selectedRows: Set<number>
  changedCells: ChangedCells
  handleSelectAll: () => void
  handleCheckboxChange: (rowIndex: number) => void
  stableUpdateData: (rowIndex: number, columnId: string, newValue: string) => void
  setChangedCells: (changedCells: ChangedCells) => void
}

export function UsersEditableTable({
  tableData,
  selectedRows,
  changedCells,
  handleSelectAll,
  handleCheckboxChange,
  stableUpdateData,
  setChangedCells,
}: UsersEditableTableProps) {
  const columns = useMemo<ColumnDef<ParticipantRow>[]>(
    () => [
      {
        id: "checkbox",
        header: () => (
          <input
            type="checkbox"
            checked={selectedRows.size === tableData.length && tableData.length > 0}
            onChange={handleSelectAll}
          />
        ),
        cell: ({ row }) => {
          const rowIndex = row.index
          return (
            <input
              type="checkbox"
              checked={selectedRows.has(rowIndex)}
              onChange={() => handleCheckboxChange(rowIndex)}
            />
          )
        },
        size: 40,
      },
      {
        accessorKey: "firstName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="First Name" />,
        cell: ({ row, getValue }) => {
          const initialValue = getValue() as string
          const rowIndex = row.index
          const columnId = "firstName"
          const isChanged = !!changedCells[rowIndex]?.[columnId]

          return (
            <UserEditableCell
              rowIndex={rowIndex}
              columnId={columnId}
              initialValue={initialValue}
              isChanged={isChanged}
              onCommit={(r, c, newVal) => {
                // Mark this cell as changed in your parent's "changedCells" state
                const newChangedCells = { ...changedCells }
                newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
                setChangedCells(newChangedCells)
                stableUpdateData(r, c, newVal)
              }}
            />
          )
        },
      },
      {
        accessorKey: "lastName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last Name" />,
        cell: ({ row, getValue }) => {
          const initialValue = getValue() as string
          const rowIndex = row.index
          const columnId = "lastName"
          const isChanged = !!changedCells[rowIndex]?.[columnId]

          return (
            <UserEditableCell
              rowIndex={rowIndex}
              columnId={columnId}
              initialValue={initialValue}
              isChanged={isChanged}
              onCommit={(r, c, newVal) => {
                const newChangedCells = { ...changedCells }
                newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
                setChangedCells(newChangedCells)
                stableUpdateData(r, c, newVal)
              }}
            />
          )
        },
      },
      {
        accessorKey: "grade",
        header: ({ column }) => <DataTableColumnHeader column={column} title={GRADE_LABEL} />,
        cell: ({ row, getValue }) => {
          const initialValue = getValue() as string
          const rowIndex = row.index
          const columnId = "grade"
          const isChanged = !!changedCells[rowIndex]?.[columnId]

          return (
            <UserEditableCell
              rowIndex={rowIndex}
              columnId={columnId}
              initialValue={initialValue}
              isChanged={isChanged}
              onCommit={(r, c, newVal) => {
                const newChangedCells = { ...changedCells }
                newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
                setChangedCells(newChangedCells)
                stableUpdateData(r, c, newVal)
              }}
            />
          )
        },
      },
      {
        accessorKey: "teacherName",
        header: ({ column }) => <DataTableColumnHeader column={column} title={TEACHER_LABEL} />,
        cell: ({ row, getValue }) => {
          const initialValue = getValue() as string
          const rowIndex = row.index
          const columnId = "teacherName"
          const isChanged = !!changedCells[rowIndex]?.[columnId]

          return (
            <UserEditableCell
              rowIndex={rowIndex}
              columnId={columnId}
              initialValue={initialValue}
              isChanged={isChanged}
              onCommit={(r, c, newVal) => {
                const newChangedCells = { ...changedCells }
                newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
                setChangedCells(newChangedCells)
                stableUpdateData(r, c, newVal)
              }}
            />
          )
        },
      },
      // {
      //   accessorKey: "eligible",
      //   header: ({ column }) => <DataTableColumnHeader column={column} title="Eligible" />,
      //   cell: ({ row, getValue }) => {
      //     const initialValue = (getValue() as string)?.toLowerCase()?.trim()
      //     const rowIndex = row.index
      //     const columnId = "eligible"
      //     const isChanged = !!changedCells[rowIndex]?.[columnId]

      //     return (
      //       <UserEditableCell
      //         rowIndex={rowIndex}
      //         columnId={columnId}
      //         initialValue={initialValue}
      //         isChanged={isChanged}
      //         onCommit={(r, c, newVal) => {
      //           const newChangedCells = { ...changedCells }
      //           newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
      //           setChangedCells(newChangedCells)
      //           stableUpdateData(r, c, newVal)
      //         }}
      //       />
      //     )
      //   },
      // },
      // {
      //   accessorKey: "participantEmail",
      //   header: ({ column }) => <DataTableColumnHeader column={column} title="Participant Email" />,
      //   cell: ({ row, getValue }) => {
      //     const initialValue = getValue() as string
      //     const rowIndex = row.index
      //     const columnId = "participantEmail"
      //     const isChanged = !!changedCells[rowIndex]?.[columnId]

      //     return (
      //       <UserEditableCell
      //         rowIndex={rowIndex}
      //         columnId={columnId}
      //         initialValue={initialValue}
      //         isChanged={isChanged}
      //         onCommit={(r, c, newVal) => {
      //           const newChangedCells = { ...changedCells }
      //           newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
      //           setChangedCells(newChangedCells)
      //           stableUpdateData(r, c, newVal)
      //         }}
      //       />
      //     )
      //   },
      // },
      // {
      //   accessorKey: "participantPhone",
      //   header: ({ column }) => <DataTableColumnHeader column={column} title="Participant Phone" />,
      //   cell: ({ row, getValue }) => {
      //     const initialValue = getValue() as string
      //     const rowIndex = row.index
      //     const columnId = "participantPhone"
      //     const isChanged = !!changedCells[rowIndex]?.[columnId]

      //     return (
      //       <UserEditableCell
      //         rowIndex={rowIndex}
      //         columnId={columnId}
      //         initialValue={initialValue}
      //         isChanged={isChanged}
      //         onCommit={(r, c, newVal) => {
      //           const newChangedCells = { ...changedCells }
      //           newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
      //           setChangedCells(newChangedCells)
      //           stableUpdateData(r, c, newVal)
      //         }}
      //       />
      //     )
      //   },
      // },
      {
        accessorKey: "parentEmail",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Parent Email" />,
        cell: ({ row, getValue }) => {
          const initialValue = getValue() as string
          const rowIndex = row.index
          const columnId = "parentEmail"
          const isChanged = !!changedCells[rowIndex]?.[columnId]

          return (
            <UserEditableCell
              rowIndex={rowIndex}
              columnId={columnId}
              initialValue={initialValue}
              isChanged={isChanged}
              onCommit={(r, c, newVal) => {
                const newChangedCells = { ...changedCells }
                newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
                setChangedCells(newChangedCells)
                stableUpdateData(r, c, newVal)
              }}
            />
          )
        },
      },
      // {
      //   accessorKey: "parentPhone",
      //   header: ({ column }) => <DataTableColumnHeader column={column} title="Parent Phone" />,
      //   cell: ({ row, getValue }) => {
      //     const initialValue = getValue() as string
      //     const rowIndex = row.index
      //     const columnId = "parentPhone"
      //     const isChanged = !!changedCells[rowIndex]?.[columnId]

      //     return (
      //       <UserEditableCell
      //         rowIndex={rowIndex}
      //         columnId={columnId}
      //         initialValue={initialValue}
      //         isChanged={isChanged}
      //         onCommit={(r, c, newVal) => {
      //           const newChangedCells = { ...changedCells }
      //           newChangedCells[r] = { ...newChangedCells[r], [c]: newVal !== row.original[c as keyof ParticipantRow] }
      //           setChangedCells(newChangedCells)
      //           stableUpdateData(r, c, newVal)
      //         }}
      //       />
      //     )
      //   },
      // },
    ],
    [stableUpdateData, changedCells, selectedRows]
  )

  return (
    <DataTable
      data={tableData}
      columns={columns}
      loading={false}
      autoResetPageIndex={false}
      initialPageSize={50}
      multiColumnFilter={{
        columns: [{ accessorKey: "firstName", name: "First Name" }],
      }}
      emptyState={{
        title: "No data",
        description: "No rows to display",
      }}
    />
  )
}
