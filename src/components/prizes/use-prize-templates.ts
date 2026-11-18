"use client"

import { CREATE_MY_OWN_LABEL, CREATE_MY_OWN_SUBTITLE, type PrizeTemplateSelection } from "@/constants/prize-selection"
import { PRIZE_TEMPLATES, resolvePrizeAssetUrl } from "@/constants/prize-templates"

export type PrizeProgramOption = {
  id: PrizeTemplateSelection
  name: string
  subtitle: string | null
  flyerImageUrl: string | null
}
export function usePrizeTemplates() {
  const templates: PrizeProgramOption[] = [...PRIZE_TEMPLATES]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(template => ({
      id: template.slug,
      name: template.name,
      subtitle: template.subtitle,
      flyerImageUrl: resolvePrizeAssetUrl(template.flyerImagePath),
    }))

  const createMyOwn: PrizeProgramOption = {
    id: null,
    name: CREATE_MY_OWN_LABEL,
    subtitle: CREATE_MY_OWN_SUBTITLE,
    flyerImageUrl: null,
  }

  return { templates, options: [...templates, createMyOwn] }
}
