import "dotenv/config"

import { stripe } from "@/lib/stripe/stripe"

async function registerPaymentMethodDomains() {
  const domainName = new URL(process.env.APP_URL!).hostname

  console.log("======================================")
  console.log("Starting PMD registration script")
  console.log("Environment APP_URL:", process.env.APP_URL)
  console.log("Resolved domain:", domainName)
  console.log("======================================")

  let hasMore = true
  let startingAfter: string | undefined

  let totalAccounts = 0
  let registeredCount = 0
  let alreadyRegisteredCount = 0
  let failedCount = 0

  while (hasMore) {
    console.log("--------------------------------------")
    console.log("Fetching Stripe accounts...")
    console.log("starting_after:", startingAfter ?? "none")
    console.log("--------------------------------------")

    const accountsResponse = await stripe.accounts.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    console.log(`Fetched ${accountsResponse.data.length} accounts`)

    for (const account of accountsResponse.data) {
      totalAccounts++

      console.log("")
      console.log("======================================")
      console.log(`Processing account: ${account.id}`)
      console.log(`Business name: ${account.business_profile?.name ?? "N/A"}`)
      console.log("======================================")

      try {
        // fetch existing PMDs for connected account
        const existingDomains = await stripe.paymentMethodDomains.list(
          {},
          {
            stripeAccount: account.id,
          }
        )

        const alreadyRegistered = existingDomains.data.some(domain => domain.domain_name === domainName)

        if (alreadyRegistered) {
          alreadyRegisteredCount++

          console.log("PMD already registered")
          console.log(`Domain: ${domainName}`)

          continue
        }

        console.log("Registering PMD...")

        const createdDomain = await stripe.paymentMethodDomains.create(
          {
            domain_name: domainName,
          },
          {
            stripeAccount: account.id,
          }
        )

        registeredCount++

        console.log("PMD registration successful")
        console.log(`PMD ID: ${createdDomain.id}`)
        console.log(`Domain: ${createdDomain.domain_name}`)
      } catch (error) {
        failedCount++

        console.error("PMD registration failed")
        console.error(`Account ID: ${account.id}`)

        if (error instanceof Error) {
          console.error(error.message)
        } else {
          console.error(error)
        }
      }
    }

    hasMore = accountsResponse.has_more

    if (accountsResponse.data.length > 0) {
      startingAfter = accountsResponse.data[accountsResponse.data.length - 1]?.id
    }
  }

  console.log("")
  console.log("======================================")
  console.log("PMD registration script completed")
  console.log("======================================")
  console.log(`Total accounts processed: ${totalAccounts}`)
  console.log(`New PMDs registered: ${registeredCount}`)
  console.log(`Already registered: ${alreadyRegisteredCount}`)
  console.log(`Failures: ${failedCount}`)
  console.log("======================================")
}

void registerPaymentMethodDomains()
