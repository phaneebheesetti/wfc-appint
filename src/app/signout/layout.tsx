import { type Metadata } from "next"

export const metadata: Metadata = {
  title: "Signout",
}

export default function SignoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
