-- Custom SQL migration file, put your code below! --

-- 1. Backfill campaigns_users
UPDATE campaigns_users cu
SET organization_id = c.organization_id
FROM campaigns c
WHERE cu.campaign_id = c.id
  AND cu.organization_id IS NULL;

-- 2. Backfill events
UPDATE events e
SET organization_id = c.organization_id
FROM campaigns c
WHERE e.campaign_id = c.id
  AND e.organization_id IS NULL;

-- 3. Backfill prizes
UPDATE prizes p
SET organization_id = c.organization_id
FROM campaigns c
WHERE p.campaign_id = c.id
  AND p.organization_id IS NULL;

-- 4. Backfill campaign_announcements
UPDATE campaign_announcements ca
SET organization_id = c.organization_id
FROM campaigns c
WHERE ca.campaign_id = c.id
  AND ca.organization_id IS NULL;

COMMIT;
