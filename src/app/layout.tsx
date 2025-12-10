import type { Metadata, Viewport } from "next";
import ClientRoot from "./ClientRoot";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const viewport: Viewport = {
	viewportFit: "cover",
};

export const metadata: Metadata = {
	title: "Browzarr",
	description:
		"A browser-based visualization toolkit for exploring and analyzing Zarr data stores",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html suppressHydrationWarning lang="en">
			<body className="antialiased">
				<ClientRoot>
					{children}
					<Toaster position="top-center" duration={1500} />
				</ClientRoot>
			</body>
		</html>
	);
}
