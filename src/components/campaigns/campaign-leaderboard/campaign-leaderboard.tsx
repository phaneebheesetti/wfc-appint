import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { ENCRYPTED_STRING } from "@/utils/string"
import { shouldMaskParticipantPii } from "@/utils/users"

import { CampaignLeaderboardTable } from "./campaign-leaderboard-table"

interface CampaignLeaderboardProps {
  campaignId: string
}

export function CampaignLeaderboard({ campaignId }: CampaignLeaderboardProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const { data: leaderboards, isLoading } = api.campaigns.getLeaderboards.useQuery({ campaignId })
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const gradeData = useMemo(() => {
    return Array.from(leaderboards?.leaderboardByGrade ?? []).map(([grade, cases], index) => [
      index + 1,
      <Badge className="bg-white" variant="secondary" key={grade}>
        {grade}
      </Badge>,
      cases,
    ])
  }, [leaderboards?.leaderboardByGrade])

  const participantData = useMemo(() => {
    const mask = shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false)
    return Array.from(leaderboards?.leaderboardByParticipant ?? []).map(([participant, cases]) => {
      const [fullName, grade] = participant.split("=")
      return [
        mask ? ENCRYPTED_STRING : fullName,
        <Badge className="bg-white" variant="secondary" key={participant}>
          {grade}
        </Badge>,
        cases,
      ]
    })
  }, [leaderboards?.leaderboardByParticipant, role])

  const teacherData = useMemo(() => {
    return Array.from(leaderboards?.leaderboardByTeacher ?? []).map(([teacher, cases]) => [
      teacher.split("=")[0],
      <Badge className="bg-white" variant="secondary" key={teacher}>
        {teacher.split("=")[1]}
      </Badge>,
      cases,
    ])
  }, [leaderboards?.leaderboardByTeacher])

  return (
    <Card>
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-2xl font-semibold">Leaderboard</h2>

        <div className="flex flex-col sm:flex-row gap-4 overflow-auto">
          <CampaignLeaderboardTable
            title={GRADE_LABEL}
            headers={[
              { key: "rank", label: "Rank" },
              { key: "grade", label: GRADE_LABEL },
              { key: "cases", label: "Cases Checked Out" },
            ]}
            data={gradeData}
            isLoading={isLoading}
          />

          <CampaignLeaderboardTable
            title="Participant"
            headers={[
              { key: "participant", label: "Participant" },
              { key: "grade", label: GRADE_LABEL },
              { key: "cases", label: "Cases Checked Out" },
            ]}
            data={participantData}
            isLoading={isLoading}
          />

          <CampaignLeaderboardTable
            title={TEACHER_LABEL}
            headers={[
              { key: "teacher", label: TEACHER_LABEL },
              { key: "grade", label: GRADE_LABEL },
              { key: "cases", label: "Cases Checked Out" },
            ]}
            data={teacherData}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Card>
  )
}
