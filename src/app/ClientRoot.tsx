"use client";

import { ThemeProvider } from "next-themes";
import MobileUIHider from "@/components/ui/MobileUIHider";
import { Footer } from "@/components/ui";
import { BrowZarrPopover } from "./BrowZarrPopover";
import { VersionSelector } from "@/components/ui";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="data-theme" enableSystem defaultTheme="system" disableTransitionOnChange>
			<MobileUIHider />
			<div className="fixed top-2 right-2 z-50 flex items-center gap-0">
				<VersionSelector />
				<BrowZarrPopover />
			</div>
			<main className="min-h-screen">
				{children}
			</main>
			<Footer />
		</ThemeProvider>
	);
}
