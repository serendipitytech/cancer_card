import type { Metadata, Viewport } from "next";
import { Nunito, Inter, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { CapacitorInit } from "@/components/capacitor-init";
import { VersionFooter } from "@/components/ui/version-footer";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Cancer Card",
  description:
    "Because if you can't laugh at cancer, cancer wins. A support coordination app that makes asking for help fun.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cancer Card",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7C3AED",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <CapacitorInit />
        <ToastProvider>
          {children}
        </ToastProvider>
        <VersionFooter />
      </body>
    </html>
  );
}
