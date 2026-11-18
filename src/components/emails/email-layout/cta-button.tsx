import { Button, Link, Section, Text } from "@react-email/components"
import { ExternalLink } from "lucide-react"

import { env } from "@/env"

interface CtaButtonProps {
  href?: string
  text?: string
}

export function CtaButton({ href = `${env.NEXT_PUBLIC_APP_URL}/dashboard`, text = "Open the App" }: CtaButtonProps) {
  return (
    <>
      <Section className="text-center">
        <Button
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto flex items-center w-fit rounded-lg bg-primary px-4 py-3 text-white"
        >
          {text} <ExternalLink className="w-4 h-4" />
        </Button>
      </Section>

      <Section className="text-center">
        <Text className="text-[10px] text-gray-500 mt-0">
          Having issues with the above button?{" "}
          <Link href={href} target="_blank" rel="noopener noreferrer">
            Click here
          </Link>
          .
        </Text>
      </Section>
    </>
  )
}
