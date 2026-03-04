import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1A1A1A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "WikiGraph — Explore Knowledge Visually",
  description:
    "Search any topic and explore it as an interactive force-directed graph of connected concepts. Powered by Wikipedia.",
  openGraph: {
    title: "WikiGraph — Explore Knowledge Visually",
    description:
      "Search any topic and explore it as an interactive force-directed graph of connected concepts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
