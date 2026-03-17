import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Fraunces, Lora, Oxanium } from "next/font/google";

const oxanium = Oxanium({
  variable: "--font-display",
  subsets: ["latin"],
});

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SlabHub CRM | Vendor & Inventory Manager",
  description: "Manage your TCG inventory and sales with professional seller tools.",
};

import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${fraunces.variable} ${lora.variable} ${oxanium.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="slabhub-theme"
          disableTransitionOnChange
          value={{
            light: "theme-light",
            dark: "theme-dark",
            cyberpunk: "theme-cyberpunk",
          }}
        >
          <AuthProvider>
            {children}
            <Toaster position="top-center" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
