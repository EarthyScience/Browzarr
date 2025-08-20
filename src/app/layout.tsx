import type { Metadata, Viewport } from "next";
import ClientRoot from "./ClientRoot";
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
        <ClientRoot>
          {children}
        </ClientRoot>
      </body>
    </html>
  );
}
