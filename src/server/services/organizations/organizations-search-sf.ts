import { eq } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { getSalesforceConnection } from "@/lib/salesforce"
import type { db } from "@/server/db"
import { type UserSelect, users } from "@/server/db/schema"

export const organizationsSearchSFAccounts = async ({
  searchMode,
  searchValue,
  userId,
  userRole,
  database,
}: {
  searchMode: string
  searchValue: string
  userId: string | undefined
  userRole: string | undefined
  database: typeof db
}) => {
  const conn = await getSalesforceConnection()
  const escapedSearchValue = searchValue.replace(/'/g, "\\'")

  const isSandbox: boolean = env.SF_LOGIN_URL?.includes("test.salesforce.com") ?? false
  let userDetails: Array<UserSelect>
  let salesRepEmail: string = ""

  if (!userId || !userRole) {
    return []
  }

  if (userRole == RolesEnum.SALES_REPRESENTATIVE) {
    userDetails = await database.select().from(users).where(eq(users.id, userId))
    salesRepEmail = (userDetails && userDetails.length === 1 && userDetails[0]?.email) || ""
    if (!salesRepEmail) {
      return []
    }
  }

  const result = await conn.query(
    `SELECT Id, Name, SAP_Account_ID__c, Email__c, BillingAddress
        FROM Account
        where isActive__c=true
        ${salesRepEmail ? ` and ISR_Account_Email__c='${salesRepEmail + (isSandbox ? ".invalid" : "")}' ` : ""}
        ${
          searchMode === "accountNumber"
            ? ` and SAP_Account_ID__c = '${escapedSearchValue}'`
            : searchMode === "contactEmail"
              ? ` and Email__c = '${escapedSearchValue}'`
              : ` and (Name LIKE '${escapedSearchValue}%' 
            or Name LIKE '%${escapedSearchValue}%' 
            or Name LIKE '%${escapedSearchValue}')`
        }
        ORDER BY Name ASC
        LIMIT 50`
  )
  const searchResults =
    result?.records?.map(record => {
      const SAPAccId = record.SAP_Account_ID__c ?? null
      const contactEmail = record.Email__c ?? null
      delete record.SAP_Account_ID__c
      delete record.Email__c
      return {
        ...record,
        AccountNumber: SAPAccId,
        ContactEmail: contactEmail,
      }
    }) ?? []

  return searchResults
}
