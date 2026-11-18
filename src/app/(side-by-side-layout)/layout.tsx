"use client"

import Image from "next/image"

export default function SideBySideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <Image
        src="/logo/wfc-logo.png"
        alt="logo"
        width={80}
        height={49}
        className="absolute top-6 md:hidden md:top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4"
      />

      <div className="w-full md:w-1/2 h-full p-6 md:p-8 pt-24 md:pt-12 pb-24 md:pb-12 flex flex-col items-center justify-start md:[justify-content:safe_center] overflow-y-auto">
        {children}
      </div>
      <div className="hidden md:flex w-1/2 h-full flex-col items-center justify-center">
        <Image src="/wfc-logocard.jpg" alt="logo" width={420} height={197} className="w-full h-full object-cover" />
      </div>
    </div>
  )
}
