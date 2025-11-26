"use client";

import { ThemeProvider } from "next-themes";
import MobileUIHider from "@/components/ui/MobileUIHider";
import { Footer } from "@/components/ui";
import { BrowZarrPopover } from "./BrowZarrPopover";
import { VersionSelector } from "@/components/ui";
import Link from "next/link";
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import HomeButton from "@/components/ui/HomeButton";
export default function ClientRoot({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="data-theme" enableSystem defaultTheme="system" disableTransitionOnChange>
			<MobileUIHider />
			<HomeButton />
			<div className="fixed top-2 right-2 z-50 flex items-center gap-0">
				<VersionSelector />
				<ThemeSwitch />
				<Link href="/docs" className="ml-2 mr-2 text-sm underline sm:inline-block">
					docs
				</Link>
				<BrowZarrPopover />
			</div>
			<main className="min-h-screen">
				{children}
			</main>
			<Footer />
		</ThemeProvider>
	);
}
