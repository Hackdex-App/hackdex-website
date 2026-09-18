import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BaseRomProvider } from "@/contexts/BaseRomContext";
import { AuthProvider } from "@/contexts/AuthContext";
import NoticeBanner from "@/components/NoticeBanner";
import AppToaster from "@/components/AppToaster";
import MobileTabs from "@/components/MobileTabs";
import { themeInitScript } from "@/components/ThemeToggle";

/** One family. Body at full width; headings use the width axis (see `font-display` in globals.css). */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Hackdex | Discover and download Pokémon rom hacks",
    template: "%s | Hackdex",
  },
  description: "Use our built-in patcher to download and play Pokémon romhacks for Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${archivo.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <BaseRomProvider>
            <NoticeBanner />
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
            <MobileTabs />
          </BaseRomProvider>
        </AuthProvider>
        <AppToaster />
        <Analytics />
      </body>
    </html>
  );
}
