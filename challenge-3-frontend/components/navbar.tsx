"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-foreground">
          TokenVesting
        </Link>
        <ConnectButton />
      </div>
    </nav>
  );
}
