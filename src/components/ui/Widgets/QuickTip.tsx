import React from 'react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type Side = "right" | "top" | "bottom" | "left" | undefined

export const QuickTip = ({
    children,
    message,
    side = 'right',
    delay = 500,
    ...props
}: {
    children: React.ReactNode;
    message: string;
    side?: Side;
    delay?: number;
} & React.ComponentPropsWithoutRef<typeof TooltipTrigger>) => {
  return (
    <Tooltip 
        delayDuration={delay}>
        <TooltipTrigger asChild {...props}>
            {children}
        </TooltipTrigger>
        <TooltipContent side={side} align="start">
            {message}
        </TooltipContent>
    </Tooltip>
  )
}


