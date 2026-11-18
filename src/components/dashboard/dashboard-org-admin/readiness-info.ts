export const getReadinessInfo = ({
  hasParticipants,
  hasInventory,
  hasPrizes,
  hasStripeSetup,
  hasPermissionSlipSetup,
  hasFinalReviewCompleted,
}: {
  hasParticipants: boolean
  hasInventory: boolean
  hasPrizes: boolean
  hasStripeSetup: boolean
  hasPermissionSlipSetup: boolean
  hasFinalReviewCompleted: boolean
}) => {
  const checks = [
    hasParticipants,
    hasInventory,
    hasPrizes,
    hasStripeSetup,
    hasPermissionSlipSetup,
    hasFinalReviewCompleted,
  ]

  const completedChecks = checks.filter(Boolean).length

  const readinessPercent = Math.round((completedChecks / checks.length) * 100)

  return {
    readinessPercent,
    hasParticipants,
    hasInventory,
    hasPrizes,
    hasStripeSetup,
    hasPermissionSlipSetup,
    hasFinalReviewCompleted,
    completedChecks,
    totalChecks: checks.length,
  }
}
