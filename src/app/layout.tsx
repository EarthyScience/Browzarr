import type { Metadata, Viewport } from "next";
import { ThemeProvider } from 'next-themes'
import { Footer } from "@/components/ui";
import "./globals.css";

export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Browzarr",
  description: "A browser-based visualization toolkit for exploring and analyzing Zarr data stores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html suppressHydrationWarning lang="en">
      <body className="antialiased">
        <ThemeProvider attribute="data-theme" enableSystem defaultTheme="system" disableTransitionOnChange>
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
