import { getSalesforceConnection } from "@/lib/salesforce"
import type { sfOrderDetails } from "@/utils/cases-transactions"

export const casesTransactionsGetBySFOrderId = async (orderId: string) => {
  const conn = await getSalesforceConnection()
  const orderDetails: Record<string, sfOrderDetails> = {}

  const result = await conn.query(
    `select SKU__c, ccrz__Quantity__c, ccrz__Price__c, Profit_Per_Case__c, Bars_per_Case__c, ccrz__Product_Name__c from ccrz__E_OrderItem__c where ccrz__Order__r.Name='${orderId}'`
  )

  const lookupResults = result?.records

  if (lookupResults.length == 0) {
    return null
  }

  lookupResults.forEach(order => {
    const {
      SKU__c,
      ccrz__Quantity__c: quantity,
      ccrz__Price__c: costPerCase,
      Profit_Per_Case__c: profitPerCase,
      Bars_per_Case__c: barsPerCase,
      ccrz__Product_Name__c: product,
    } = order

    !orderDetails[SKU__c]
      ? (orderDetails[SKU__c] = {
          orderId,
          costPerCase,
          barsPerCase,
          product,
          billedCases: 0,
          freeCases: 0,
          profitPerCase: 0,
        })
      : ""

    costPerCase > 0
      ? (orderDetails[SKU__c] = {
          ...orderDetails[SKU__c],
          billedCases: quantity,
          profitPerCase,
        })
      : (orderDetails[SKU__c].freeCases = quantity)
  })

  return orderDetails
}
