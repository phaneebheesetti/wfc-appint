-- Fundraiser Report
-- One row per campaign (fundraiser). Excludes soft-deleted campaigns and organizations.
--
-- Columns:
--   org_name                     from organizations.name
--   fundraiser_name               from campaigns.name
--   fundraiser_start_date         from campaigns.start_date
--   fundraiser_end_date           from campaigns.end_date
--   cases_checked_out             SUM(cases_transactions.quantity) where type = 'checkout'
--   participant_count             count of campaigns_users per campaign
--   digital_payment_enabled       campaigns.digital_payment as 'Yes' / 'No'
--   parent_emails_count          distinct parents (participant's parent_user_id) with email
--   total_funds_received         total funds in USD (not cents)
--   digital_funds_received       digital funds in USD (not cents)
--
-- Optional filter (uncomment to restrict):
--   AND c.start_date >= '2020-01-01'
--   AND o.id = 'your-org-uuid'

WITH campaign_cases AS (
  SELECT
    ct.campaign_id,
    COALESCE(SUM(ct.quantity), 0)::integer AS cases_checked_out
  FROM cases_transactions ct
  WHERE ct.type = 'checkout'
    AND ct.campaign_id IS NOT NULL
  GROUP BY ct.campaign_id
),
campaign_participants AS (
  SELECT
    cu.campaign_id,
    COUNT(*)::integer AS participant_count
  FROM campaigns_users cu
  GROUP BY cu.campaign_id
),
campaign_parent_emails AS (
  SELECT
    cu.campaign_id,
    COUNT(DISTINCT parent.id)::integer AS parent_emails_count
  FROM campaigns_users cu
  INNER JOIN users u ON u.id = cu.user_id
  INNER JOIN users parent ON parent.id = u.parent_user_id
  LEFT JOIN contact_infos ci ON ci.id = parent.contact_info_id
  WHERE (parent.email IS NOT NULL AND TRIM(parent.email) <> '')
     OR (ci.email IS NOT NULL AND TRIM(ci.email) <> '')
  GROUP BY cu.campaign_id
),
campaign_funds AS (
  SELECT
    pl.campaign_id,
    COALESCE(SUM(pl.amount_cents), 0)::bigint AS total_funds_cents,
    COALESCE(SUM(CASE WHEN pl.type = 'digital' THEN pl.amount_cents ELSE 0 END), 0)::bigint AS digital_funds_cents
  FROM payment_logs pl
  WHERE pl.status = 'completed'
    AND pl.deleted_at IS NULL
    AND pl.campaign_id IS NOT NULL
  GROUP BY pl.campaign_id
)
SELECT
  o.name AS org_name,
  c.name AS fundraiser_name,
  c.start_date AS fundraiser_start_date,
  c.end_date AS fundraiser_end_date,
  COALESCE(cc.cases_checked_out, 0) AS cases_checked_out,
  COALESCE(cp.participant_count, 0) AS participant_count,
  CASE WHEN c.digital_payment THEN 'Yes' ELSE 'No' END AS digital_payment_enabled,
  COALESCE(cpe.parent_emails_count, 0) AS parent_emails_count,
  ROUND((COALESCE(cf.total_funds_cents, 0) / 100.0)::numeric, 2) AS total_funds_received,
  ROUND((COALESCE(cf.digital_funds_cents, 0) / 100.0)::numeric, 2) AS digital_funds_received
FROM campaigns c
INNER JOIN organizations o ON o.id = c.organization_id
LEFT JOIN campaign_cases cc ON cc.campaign_id = c.id
LEFT JOIN campaign_participants cp ON cp.campaign_id = c.id
LEFT JOIN campaign_parent_emails cpe ON cpe.campaign_id = c.id
LEFT JOIN campaign_funds cf ON cf.campaign_id = c.id
WHERE c.deleted_at IS NULL
  AND o.deleted_at IS NULL
ORDER BY o.name, c.start_date;
