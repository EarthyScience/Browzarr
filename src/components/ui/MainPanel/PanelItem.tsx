"use client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/widgets/popover"
import { Button } from "@/components/ui/widgets/button"
import { ReactNode } from "react"

export function PanelItem({ children, options }: { children: ReactNode; options: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="panel-item">
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2">
        {options}
      </PopoverContent>
    </Popover>
  )
}