import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";
import { AppHeader } from "@/components/ui/AppHeader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });

export const metadata: Metadata = {
  title: "NJ Canna — Live NJ Dispensary Deals",
  description: "Real-time cannabis prices, deals, and strain discovery across every New Jersey dispensary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body className="bg-surface text-white antialiased">
        <main className="max-w-xl mx-auto min-h-screen">
          <AppHeader />
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
