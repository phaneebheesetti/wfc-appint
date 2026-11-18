import { getSalesforceConnection } from "@/lib/salesforce"

const ACCOUNT_NUMBER_CHUNK_SIZE = 200

const MAX_FETCH = 10_000

export type SalesforceAccountRecord = {
  Id: string
  Name?: string | null
  AccountNumber?: string | null
  ContactEmail?: string | null
  BillingAddress?: {
    street?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
  } | null
}

export const normalizeAccountNumber = (accountNumber: string) => accountNumber.trim().toLowerCase()

const escapeSoqlLiteral = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")

export const organizationsSearchSFAccountsByAccountNumbers = async ({
  accountNumbers,
}: {
  accountNumbers: string[]
}): Promise<Map<string, SalesforceAccountRecord[]>> => {
  const accountsByNumber = new Map<string, SalesforceAccountRecord[]>()

  const uniqueAccountNumbers = Array.from(new Set(accountNumbers.map(normalizeAccountNumber).filter(Boolean)))
  if (uniqueAccountNumbers.length === 0) return accountsByNumber

  const conn = await getSalesforceConnection()

  for (let start = 0; start < uniqueAccountNumbers.length; start += ACCOUNT_NUMBER_CHUNK_SIZE) {
    const chunk = uniqueAccountNumbers.slice(start, start + ACCOUNT_NUMBER_CHUNK_SIZE)
    const values = chunk.map(accountNumber => `'${escapeSoqlLiteral(accountNumber)}'`).join(", ")

    const result = await conn.query(
      `SELECT Id, Name, SAP_Account_ID__c, Email__c, BillingAddress
          FROM Account
          where isActive__c=true
          and SAP_Account_ID__c IN (${values})
          ORDER BY Name ASC`,
      { autoFetch: true, maxFetch: MAX_FETCH }
    )

    for (const record of result?.records ?? []) {
      const accountNumber = (record.SAP_Account_ID__c as string | null) ?? null
      const contactEmail = (record.Email__c as string | null) ?? null
      delete record.SAP_Account_ID__c
      delete record.Email__c

      const key = normalizeAccountNumber(accountNumber ?? "")
      if (!key) continue

      const account = { ...record, AccountNumber: accountNumber, ContactEmail: contactEmail } as SalesforceAccountRecord

      accountsByNumber.set(key, [...(accountsByNumber.get(key) ?? []), account])
    }
  }

  return accountsByNumber
}
