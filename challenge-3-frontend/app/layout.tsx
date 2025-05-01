import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "@/app/providers";
import Navbar from "@/components/navbar";

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DOT UI kit",
  description: "a UI kit for Polkadot DApps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={unbounded.className}>
        <Providers>
          <Navbar />
          <main className="flex flex-col min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
