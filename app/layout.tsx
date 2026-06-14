import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { MetaPixel } from "@/components/MetaPixel";
import { BRAND } from "@/lib/constants";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND} — Custom Photo Lithophanes`,
  description:
    "Turn a favourite photo into a glowing keepsake. Hand-crafted custom photo lithophanes, free shipping across Canada.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-ivory font-sans text-ink antialiased">
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
