"use client";

import { FaGithub } from "react-icons/fa";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function GithubButton() {
	return (
		<Tooltip delayDuration={500}>
			<TooltipTrigger asChild>
				<Link
					href="https://github.com/EarthyScience/Browzarr"
					aria-label="github"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Button
						variant="ghost"
						size="icon"
						className="cursor-pointer hover:scale-90 transition-transform duration-100 ease-out"
					>
						<FaGithub className="size-6" />
					</Button>
				</Link>
			</TooltipTrigger>
			<TooltipContent side="bottom" align="start">
				github
			</TooltipContent>
		</Tooltip>
	);
}
