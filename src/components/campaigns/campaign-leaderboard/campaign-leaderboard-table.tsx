import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { firstLetterUpperCase } from "@/utils/string"

interface TableHeader {
  key: string
  label: string
}

interface CampaignLeaderboardTableProps {
  title: string
  headers: TableHeader[]
  data: React.ReactNode[][]
  isLoading?: boolean
}

export function CampaignLeaderboardTable({ title, headers, data, isLoading }: CampaignLeaderboardTableProps) {
  if (isLoading) {
    return (
      <Skeleton className="w-full flex flex-col gap-4 p-4 rounded-lg">
        <Skeleton className="w-32 h-8 bg-background" />

        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="w-full h-12 bg-background mb-2" />
          ))}
        </div>
      </Skeleton>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-muted rounded-card w-full">
      <h2 className="text-xl font-semibold">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map(header => (
              <TableHead key={header.key}>{header.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <TableRow key={index}>
                {row?.map((cell, cellIndex) => (
                  <TableCell className="truncate max-w-0" key={`${index}-${cellIndex}`}>
                    {typeof cell === "string" ? firstLetterUpperCase(cell) : cell}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={headers.length} className="text-center text-muted-foreground">
                No data yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
