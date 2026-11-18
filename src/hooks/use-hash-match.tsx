import { usePathname } from "next/navigation"
import { useState } from "react"
import { useEffect } from "react"

export function useHashMatch(hash: string) {
  const [matches, setMatches] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkHash = () => {
      setMatches(window.location.hash === hash)
    }

    checkHash()
    window.addEventListener("hashchange", checkHash)
    return () => window.removeEventListener("hashchange", checkHash)
  }, [pathname, hash])

  const clearHash = () => {
    window.location.hash = ""
  }

  return { matches, clearHash }
}
