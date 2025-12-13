"use client";

import Image from "next/image";
import Link from "next/link";
import logoHome from "public/logo-light.svg";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function HomeButton() {
	return (
		<Tooltip delayDuration={500}>
			<TooltipTrigger asChild>
				<Link href="/" aria-label="Home">
					<Button
						variant="ghost"
						size="icon"
						className="cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
					>
						<Image src={logoHome} alt="logoMPI" height={32} />
					</Button>
				</Link>
			</TooltipTrigger>
			<TooltipContent side="bottom" align="start">
				Home
			</TooltipContent>
		</Tooltip>
	);
}
