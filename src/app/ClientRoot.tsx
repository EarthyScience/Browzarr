"use client";

import { ThemeProvider } from "next-themes";
import MobileUIHider from "@/components/ui/MobileUIHider";
import { Footer } from "@/components/ui";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="data-theme" enableSystem defaultTheme="system" disableTransitionOnChange>
			<MobileUIHider />
			<main className="min-h-screen">
				{children}
			</main>
			<Footer />
		</ThemeProvider>
	);
}
