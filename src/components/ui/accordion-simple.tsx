"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface AccordionProps {
  items: {
    title: string
    value: string
    content: React.ReactNode
  }[]
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  className?: string
}

export function AccordionSimple({ items, type = "single", defaultValue, className }: AccordionProps) {
  if (type === "multiple") {
    return (
      <Accordion type="multiple" defaultValue={defaultValue as string[]} className={className && "w-full"}>
        {items.map(item => (
          <AccordionItem key={item.value} value={item.value}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  }

  return (
    <Accordion type="single" defaultValue={defaultValue as string} className={className ?? "w-full"} collapsible>
      {items.map(item => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger className="text-sm">{item.title}</AccordionTrigger>
          <AccordionContent className="text-sm">{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
