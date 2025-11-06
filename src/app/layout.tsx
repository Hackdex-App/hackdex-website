import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileFooterSpacer from "@/components/MobileFooterSpacer";
import { BaseRomProvider } from "@/contexts/BaseRomContext";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <BaseRomProvider>
            <div className="fixed inset-0 -z-10">
              <div className="aurora" />
            </div>
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
            <MobileFooterSpacer />
          </BaseRomProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
