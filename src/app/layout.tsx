import { ClerkProvider } from "@clerk/nextjs"
import { type Metadata } from "next"
import { Mr_Dafoe, Rethink_Sans } from "next/font/google"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { Toaster } from "sonner"

import { NotificationBanner } from "@/components/notification-banner"
import { StagingAlert } from "@/components/staging-alert"
import { APP_NAME, WFC_LONG_NAME } from "@/constants/app"
import { PostHogProvider, SentryProvider } from "@/providers"
import "@/styles/globals.css"
import { TRPCReactProvider } from "@/trpc/react"

const mrDafoe = Mr_Dafoe({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mr-dafoe",
})

const reThinkSans = Rethink_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rethink-sans",
})

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description: `${WFC_LONG_NAME} is the sweetest way to bring profit to your organization and smiles to your community. Experience a simpler way to track sales, collect payments, and watch your fundraising progress grow in real time with our premium chocolate fundraising programs. We pride ourselves on providing the easiest and most effective fundraising solutions, helping you achieve your goals while making a difference. Join us and change the world one chocolate bar at a time!`,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  keywords: [
    "World’s Finest Chocolate",
    "chocolate fundraising",
    "fundraising programs",
    "school fundraising",
    "chocolate bars",
    "fundraising app",
    "nonprofit fundraising",
    "PTA fundraising",
    "easy fundraising",
    "fundraising solutions",
    "premium chocolate",
    "fundraising ideas",
    "chocolate sales",
    "fundraising platform",
    "World’s Finest Chocolate app",
    "online payments",
    "payment processing",
    "fundraising payments",
    "secure payments",
    "accept donations",
    "credit card payments",
    "stripe payments",
    "digital fundraising",
    "collect payments online",
    "easy payment solutions",
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${reThinkSans.variable} ${mrDafoe.variable}`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen md:h-screen w-screen">
        <ClerkProvider>
          <NotificationBanner />
          <StagingAlert />

          <SentryProvider>
            <TRPCReactProvider>
              <PostHogProvider>
                <NuqsAdapter>{children}</NuqsAdapter>
              </PostHogProvider>
            </TRPCReactProvider>
          </SentryProvider>

          <Toaster
            position="top-center"
            richColors
            expand
            toastOptions={{
              classNames: {
                title: "font-semibold",
              },
              duration: 8_000,
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  )
}
