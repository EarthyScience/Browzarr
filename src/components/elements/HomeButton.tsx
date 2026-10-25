"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button-enhanced";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const logoHome = "./bz_logo.svg";

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
						<Image src={logoHome} alt="logoBZ" height={32} width={28} />
					</Button>
				</Link>
			</TooltipTrigger>
			<TooltipContent side="bottom" align="start">
				Home
			</TooltipContent>
		</Tooltip>
	);
}
