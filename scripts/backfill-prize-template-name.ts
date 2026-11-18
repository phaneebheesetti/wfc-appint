import "dotenv/config"
import { sql } from "drizzle-orm"

import { PRIZE_TEMPLATES, prize_template_names } from "@/constants/prize-templates"
import { db } from "@/server/db"

async function backfillPrizeTemplates() {
  const elementary = PRIZE_TEMPLATES.find(template => template.slug === prize_template_names.HOME_RUN_ELEMENTARY_MIDDLE)

  if (!elementary) return { campaigns: 0 }

  await db.transaction(async tx => {
    await tx.execute(sql`
      UPDATE campaigns
         SET prize_template_name = ${elementary.slug}
       WHERE home_run_prizes_template = true
         AND prize_template_name IS NULL
    `)

    const pairs = elementary.items.map(item => ({
      name: item.name,
      file: item.imagePath
        .split("/")
        .pop()!
        .replace(/\.png$/, ""),
    }))

    for (const pair of pairs) {
      await tx.execute(sql`
        UPDATE prizes p
           SET prize_template_name = ${elementary.slug}
          FROM campaigns c
         WHERE c.id = p.campaign_id
           AND c.prize_template_name = ${elementary.slug}
           AND p.prize_template_name IS NULL
           AND p.name = ${pair.name}
           AND regexp_replace(
                 regexp_replace(split_part(p.image_url, '/', -1), '\.png$', ''),
                 '-v2$', ''
               ) = ${pair.file}
      `)
    }
  })
}

try {
  await backfillPrizeTemplates()
  console.log("Prize template backfill completed successfully")
  process.exit(0)
} catch (error) {
  console.error("Error backfilling prize templates:", error)
  process.exit(1)
}
