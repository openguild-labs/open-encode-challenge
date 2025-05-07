import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/app/providers';
import Navbar from "@/components/navbar"; // Import the Navbar component
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "DOT UI kit - Token Vesting", // Updated title
  description: "Frontend for Token Vesting on Polkadot Asset Hub", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${unbounded.className} bg-background text-foreground`}
      >
        <Providers>
          <Navbar /> {/* Add Navbar here */}
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster /> {/* Add Toaster here for notifications */}
        </Providers>
      </body>
    </html>
  );
}
