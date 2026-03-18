"use client"

import * as React from "react"
import { Button as BaseButton, buttonVariants } from "@/components/ui/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Extend only the NEW variants — shadcn owns the rest
const enhancedVariants = cva("", {
  variants: {
    variant: {
      pink: "bg-linear-to-tr from-pink-500 to-yellow-500 text-white shadow-lg",
    },
  },
})

type RippleInfo = { key: number; x: number; y: number; size: number }

function RippleCircle({ info, onDone }: { info: RippleInfo; onDone: (key: number) => void }) {
  const [active, setActive] = React.useState(false)
  React.useEffect(() => { const id = requestAnimationFrame(() => setActive(true)); return () => cancelAnimationFrame(id) }, [])
  return (
    <span className="absolute rounded-full" style={{ left: info.x, top: info.y, width: info.size, height: info.size, backgroundColor: "currentColor", opacity: active ? 0 : 0.25, transform: active ? "scale(2)" : "scale(0)", transition: "transform 450ms ease-out, opacity 600ms ease-out" }} onTransitionEnd={() => onDone(info.key)} />
  )
}

const rippleKey = { current: 0 }  // stable counter, no collision risk

type ExtendedVariant = React.ComponentProps<typeof BaseButton>["variant"] | "pink"

function Button({ className, variant, disableRipple, onPointerDown, children, ...props }:
  Omit<React.ComponentProps<typeof BaseButton>, "variant"> & {
    variant?: ExtendedVariant
    disableRipple?: boolean
  }) {
  const [ripples, setRipples] = React.useState<RippleInfo[]>([])
  const isExtended = variant === "pink"

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(e)
    if (disableRipple || props.disabled || e.button === 2) return
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    setRipples(prev => [...prev, { key: rippleKey.current++, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size }])
  }

  return (
    <BaseButton
      className={cn(
        "relative overflow-hidden",
        isExtended && enhancedVariants({ variant: variant as "pink" }),
        className
      )}
      variant={isExtended ? "default" : variant}  // shadcn gets a valid variant as fallback
      onPointerDown={handlePointerDown}
      {...props}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {ripples.map(r => <RippleCircle key={r.key} info={r} onDone={k => setRipples(p => p.filter(r => r.key !== k))} />)}
      </span>
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </BaseButton>
  )
}

export { Button, buttonVariants }