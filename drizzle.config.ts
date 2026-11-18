import { type Config } from "drizzle-kit"

import { env } from "@/env"

export default {
  schema: "./src/server/db/schema/index.ts",
  out: "./supabase/public-migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_MIGRATIONS_URL,
  },
  breakpoints: false,
} satisfies Config
