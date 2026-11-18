import { type RolesEnum } from "@/constants/roles"

// Per-browser active role. Stored in an HMAC-signed cookie so different browsers
// of the same Clerk user can hold independent active roles. Falls back to the
// JWT-projected `user_role` claim (which mirrors `publicMetadata.role`) when the
// cookie is absent or invalid.

export const ROLE_SESSION_COOKIE_NAME = "wfc_active_role"
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7

type Payload = {
  clerkId: string
  role: RolesEnum
  databaseId: string
  exp: number
}

const encoder = new TextEncoder()

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

const base64UrlDecode = (input: string): Uint8Array => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const importKey = async (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])

const constantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export const signRoleSessionCookie = async ({
  clerkId,
  role,
  databaseId,
  secret,
  ttlSeconds = SEVEN_DAYS_SECONDS,
}: {
  clerkId: string
  role: RolesEnum
  databaseId: string
  secret: string
  ttlSeconds?: number
}): Promise<string> => {
  const payload: Payload = {
    clerkId,
    role,
    databaseId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const payloadBytes = encoder.encode(JSON.stringify(payload))
  const payloadB64 = base64UrlEncode(payloadBytes)

  const key = await importKey(secret)
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes as BufferSource))

  return `${payloadB64}.${base64UrlEncode(sig)}`
}

export const verifyRoleSessionCookie = async ({
  cookieValue,
  expectedClerkId,
  secret,
}: {
  cookieValue: string
  expectedClerkId: string
  secret: string
}): Promise<{ role: RolesEnum; databaseId: string } | null> => {
  const parts = cookieValue.split(".")
  if (parts.length !== 2) return null
  const [payloadB64, sigB64] = parts as [string, string]

  let payloadBytes: Uint8Array
  let sigBytes: Uint8Array
  try {
    payloadBytes = base64UrlDecode(payloadB64)
    sigBytes = base64UrlDecode(sigB64)
  } catch {
    return null
  }

  const key = await importKey(secret)
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes as BufferSource))
  if (!constantTimeEqual(expected, sigBytes)) return null

  let payload: Payload
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Payload
  } catch {
    return null
  }

  if (payload.clerkId !== expectedClerkId) return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null

  return { role: payload.role, databaseId: payload.databaseId }
}

// Client-side decode (no HMAC verify — display only). Used by the browser UI
// to show which role is active in this browser. The server is the trust boundary
// for any actual role check.
export const decodeRoleSessionCookieUnsafe = (
  cookieValue: string | undefined
): { role: RolesEnum; databaseId: string; exp: number } | null => {
  if (!cookieValue) return null
  const parts = cookieValue.split(".")
  if (parts.length !== 2) return null
  const [payloadB64] = parts as [string, string]
  try {
    const bytes = base64UrlDecode(payloadB64)
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Payload
    if (!payload.role || !payload.databaseId) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return { role: payload.role, databaseId: payload.databaseId, exp: payload.exp }
  } catch {
    return null
  }
}

// Resolve the active (role, databaseId) for the current request.
// Cookie wins when present and valid; otherwise falls back to JWT claims
// (which mirror `publicMetadata.role` / `databaseId`).
export const resolveActiveRole = async ({
  cookieValue,
  clerkId,
  fallbackRole,
  fallbackDatabaseId,
  secret,
}: {
  cookieValue: string | undefined
  clerkId: string | undefined | null
  fallbackRole: RolesEnum | undefined | null
  fallbackDatabaseId: string | undefined | null
  secret: string
}): Promise<{ role: RolesEnum | null; databaseId: string | null }> => {
  if (cookieValue && clerkId) {
    const verified = await verifyRoleSessionCookie({ cookieValue, expectedClerkId: clerkId, secret })
    if (verified) return verified
  }
  return {
    role: (fallbackRole as RolesEnum | null) ?? null,
    databaseId: fallbackDatabaseId ?? null,
  }
}
