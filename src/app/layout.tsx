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
    default: "Hackdex",
    template: "%s | Hackdex",
  },
  description: "Discover and share Pokémon romhack patches.",
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
