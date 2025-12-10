"use client";

import { HiHomeModern } from "react-icons/hi2";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePathname } from "next/navigation";

export default function HomeButton() {
	const pathname = usePathname();
	// Don't show Home button on home page
	if (pathname === "/") {
		return null;
	}
	return (
		<Tooltip delayDuration={500}>
			<TooltipTrigger asChild>
				<Link href="/" aria-label="Home">
					<Button
						variant="ghost"
						size="icon"
						className="cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
					>
						<HiHomeModern className="size-6" />
					</Button>
				</Link>
			</TooltipTrigger>
			<TooltipContent side="bottom" align="start">
				Home
			</TooltipContent>
		</Tooltip>
	);
}
