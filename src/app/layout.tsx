import type { Metadata, Viewport } from "next";
import ClientRoot from "./ClientRoot";
import { Toaster } from "@/components/ui/widgets/toaster"
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
          <Toaster richColors expand={true} position="top-center" duration={5000}/>
        </ClientRoot>
      </body>
    </html>
  );
}
