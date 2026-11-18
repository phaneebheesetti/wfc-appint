import { type Metadata } from "next"

export const metadata: Metadata = {
  title: "Magic Signin",
}

export default function MagicSigninLayout({ children }: { children: React.ReactNode }) {
  return children
}
