"use client";

import Link from "next/link";
import { ThemeProvider } from "next-themes";
import { Footer, VersionSelector } from "@/components/ui";
import GithubButton from "@/components/ui/GithubButton";
import HomeButton from "@/components/ui/HomeButton";
import MobileUIHider from "@/components/ui/MobileUIHider";
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import { BrowZarrPopover } from "./BrowZarrPopover";

export default function ClientRoot({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ThemeProvider
			attribute="data-theme"
			enableSystem
			defaultTheme="system"
			disableTransitionOnChange
		>
			<MobileUIHider />
			{/* left menu */}
			<div className="fixed top-2 left-2 z-50 flex items-center gap-2">
				<HomeButton />
				<BrowZarrPopover />
				<Link
					href="/docs"
					className="text-sm underline sm:inline-block"
					target="_blank"
					rel="noopener noreferrer"
				>
					docs
				</Link>
			</div>
			{/* right menu */}
			<div className="fixed top-2 right-4 z-50 flex items-center gap-2">
				<VersionSelector />
				<GithubButton />
				<ThemeSwitch />
			</div>
			<main className="min-h-screen">{children}</main>
			<Footer />
		</ThemeProvider>
	);
}
