import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NAUDEA Pricing",
  description: "Sistema de Control Financiero y Pricing de NAUDEA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 text-zinc-900`}
      >
        <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
          <div className="print:hidden">
            <Sidebar />
          </div>
          <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
            <div className="max-w-6xl mx-auto print:max-w-none">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
