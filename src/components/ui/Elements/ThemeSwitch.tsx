"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { BsMoonStarsFill, BsSunFill } from "react-icons/bs";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const ThemeSwitch = () => {
	const [mounted, setMounted] = useState(false);
	const { resolvedTheme, setTheme } = useTheme();

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		setTimeout(() => {
			setMounted(true);
		}, 0);
	}, []);

	if (!mounted) return null;

	return (
		<Tooltip delayDuration={500}>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="cursor-pointer"
					onClick={() =>
						setTheme(resolvedTheme === "light" ? "dark" : "light")
					}
				>
					{resolvedTheme === "light" ? (
						<BsMoonStarsFill className="size-6" />
					) : (
						<BsSunFill className="size-6" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom" align="start">
				{resolvedTheme === "dark" ? (
					<span>Switch to Light Mode</span>
				) : (
					<span>Switch to Dark Mode</span>
				)}
			</TooltipContent>
		</Tooltip>
	);
};

export default ThemeSwitch;
