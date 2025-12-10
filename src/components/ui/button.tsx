"use client";

import * as React from "react";
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive relative overflow-hidden",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
				destructive:
					"bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
				outline:
					"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
				secondary:
					"bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
				ghost:
					"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
				link: "text-primary underline-offset-4 hover:underline",
				pink: "bg-linear-to-tr from-pink-500 to-yellow-500 text-white shadow-lg cursor-pointer",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type RippleInfo = {
	key: number;
	x: number;
	y: number;
	size: number;
};

function Button({
	className,
	variant,
	size,
	asChild = false,
	disabled,
	onPointerDown,
	children,
	// Optional ripple toggle
	disableRipple,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		disableRipple?: boolean;
	}) {
	const Comp = asChild ? SlotPrimitive.Slot : "button";
	const [ripples, setRipples] = React.useState<RippleInfo[]>([]);

	const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
		onPointerDown?.(e);
		if (disableRipple || disabled || e.button === 2) return;

		const target = e.currentTarget;
		const rect = target.getBoundingClientRect();
		const maxDim = Math.max(rect.width, rect.height);
		const size = maxDim * 2;
		const x = e.clientX - rect.left - size / 2;
		const y = e.clientY - rect.top - size / 2;

		const key = Date.now() + Math.random();
		setRipples((prev) => [...prev, { key, x, y, size }]);
	};

	const removeRipple = (key: number) => {
		setRipples((prev) => prev.filter((r) => r.key !== key));
	};

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			onPointerDown={handlePointerDown}
			disabled={disabled}
			{...props}
		>
			{/* Ripple layer */}
			{!disableRipple && (
				<span aria-hidden className="pointer-events-none absolute inset-0 z-0">
					{ripples.map((r) => (
						<RippleCircle key={r.key} info={r} onDone={removeRipple} />
					))}
				</span>
			)}
			{/* Content layer */}
			<span className="relative z-10 inline-flex items-center gap-2">
				{children}
			</span>
		</Comp>
	);
}

function RippleCircle({
	info,
	onDone,
}: {
	info: RippleInfo;
	onDone: (key: number) => void;
}) {
	const { x, y, size, key } = info;
	const [active, setActive] = React.useState(false);
	React.useEffect(() => {
		const id = requestAnimationFrame(() => setActive(true));
		return () => cancelAnimationFrame(id);
	}, []);

	const handleTransitionEnd = () => onDone(key);

	return (
		<span
			className={"absolute rounded-full"}
			style={{
				left: x,
				top: y,
				width: size,
				height: size,
				backgroundColor: "currentColor",
				opacity: active ? 0 : 0.25,
				transform: active ? "scale(2)" : "scale(0)",
				transition: "transform 450ms ease-out, opacity 600ms ease-out",
			}}
			onTransitionEnd={handleTransitionEnd}
		/>
	);
}

export { Button, buttonVariants };
