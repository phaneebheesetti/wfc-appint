import { Connection, type Schema } from "jsforce"

import { env } from "@/env"

let cachedConn: Connection<Schema>

export async function getSalesforceConnection() {
  if (cachedConn) return cachedConn

  const conn = new Connection({
    loginUrl: env.SF_LOGIN_URL,
  })

  if (env.SF_USERNAME && env.SF_PASSWORD) {
    await conn.login(env.SF_USERNAME, env.SF_PASSWORD)
  }

  cachedConn = conn
  return cachedConn
}
