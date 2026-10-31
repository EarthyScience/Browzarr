"use client";

import React from 'react'
import { Button } from '@/components/ui/button-enhanced'
import { QuickTip } from '@/components/widgets/QuickTip'
import { useIsMobile } from '@/hooks'

// Popovers open to the left of the panel on desktop and above it on mobile
export const usePanelSide = (): "left" | "top" => useIsMobile() ? "top" : "left"

type Props = {
    icon: React.ReactNode;
    tooltip: string;
    disabled?: boolean;
} & React.HTMLAttributes<HTMLDivElement>

// Icon trigger shared by every MainPanel entry. Wrapped in a div so it can sit inside a PopoverTrigger.
export const PanelButton = React.forwardRef<HTMLDivElement, Props>(
    ({ icon, tooltip, disabled = false, ...props }, ref) => {
        const side = usePanelSide()
        return (
            <div ref={ref} {...props} style={disabled ? { pointerEvents: 'none' } : undefined}>
                <QuickTip message={tooltip} side={side}>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tooltip}
                        className="size-10 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
                        style={disabled ? { color: 'var(--text-disabled)' } : undefined}
                    >
                        {icon}
                    </Button>
                </QuickTip>
            </div>
        )
    }
)
PanelButton.displayName = 'PanelButton'
