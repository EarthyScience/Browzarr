"use client";

import Link from "next/link";
import { ThemeProvider } from "next-themes";
import { Footer, VersionSelector } from "@/components/ui";
import GithubButton from "@/components/elements/GithubButton";
import HomeButton from "@/components/elements/HomeButton";
import MobileUIHider from "@/components/layout/MobileUIHider";
import ThemeSwitch from "@/components/widgets/ThemeSwitch";
import { BrowZarrPopover } from "@/components/elements/BrowZarrPopover";
import { StoreInitializer } from "@/components/layout/StoreInitializer";

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
			<StoreInitializer />
			<MobileUIHider />
			{/* left menu */}
			<div className="fixed top-2 left-2 z-50 flex items-center gap-2">
				<HomeButton />
				<BrowZarrPopover />
				<Link
					href="https://browzarr.io/docs"
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
