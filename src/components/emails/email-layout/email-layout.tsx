import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "@react-email/components"

import { WFC_LONG_NAME } from "@/constants/app"
import { env } from "@/env"

import { CtaButton } from "./cta-button"

export interface EmailLayoutProps {
  children?: React.ReactNode
  title: string
  preview: string
  includeLinkToApp?: boolean
  ctaText?: string
  ctaHref?: string
  noReplyText?: string
}

export function EmailLayout({
  children,
  title,
  preview,
  includeLinkToApp = false,
  ctaText,
  ctaHref,
  noReplyText = "Please do not reply directly to this e-mail.",
}: EmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <style>{`
          @media (min-width: 768px) {
            .email-layout-container {
              padding-left: 80px !important;
              padding-right: 80px !important;
            }
          }
        `}</style>
      </Head>

      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                primary: "#7D262B",
              },
            },
          },
        }}
      >
        <Preview>{preview}</Preview>

        <Body className="bg-gray-100 font-sans text-base">
          <Img
            src={`${env.NEXT_PUBLIC_APP_URL}/logo/wfc-logo.png`}
            width="80"
            height="49"
            alt={`${WFC_LONG_NAME} Logo`}
            className="mx-auto my-10"
          />

          <Container className="email-layout-container bg-white px-4 py-10 mb-10 rounded-md">
            <Heading className="text-3xl my-0 text-center leading-7">{title}</Heading>

            {children}

            {includeLinkToApp && <CtaButton text={ctaText} href={ctaHref} />}

            <Section className="text-center">
              <Text className="text-[10px] text-gray-500 mt-2">{noReplyText}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default EmailLayout

EmailLayout.PreviewProps = {
  title: "{title}",
  preview: "{preview}",
  includeLinkToApp: true,
  ctaText: "{ctaText}",
  ctaHref: "{ctaHref}",
  noReplyText: "{noReplyText}",
}
