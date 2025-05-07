"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet as WalletIcon,
  Send,
  PenLine,
  Coins,
  Boxes,
  ChevronDown,
  Menu,
  Sparkles,
  Shield,
  LockKeyhole,
  ArrowRight,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import SigpassKit from "@/components/sigpasskit";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import CreateWalletDialog from "@/components/create-wallet-dialog";

const primaryNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/vesting", label: "Vesting", icon: Boxes },
];

export default function Navbar() {
  const pathname = usePathname();
  const [walletDrawerOpen, setWalletDrawerOpen] = useState(false);

  return (
    <>
      <header className="bg-gradient-to-r from-purple-600/90 to-blue-500/90 text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"
          >
            <WalletIcon className="h-5 w-5 text-white" />
            <span>Open&nbsp;Encode Challenge</span>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 lg:flex">
            {primaryNav.map(({ href, label, icon: Icon }) => (
              <NavItem key={href} href={href} active={pathname === href}>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavItem>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* Wallet drawer */}
            <Drawer open={walletDrawerOpen} onOpenChange={setWalletDrawerOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="inline-flex items-center gap-1 bg-white/20 text-white hover:bg-white/30"
                >
                  <WalletIcon className="h-4 w-4" />
                  Wallet
                </Button>
              </DrawerTrigger>

              <DrawerContent
                onClick={(e) => {
                  // Close the wallet drawer whenever any button inside is clicked
                  const target = e.target as HTMLElement;
                  if (target.closest("button")) setWalletDrawerOpen(false);
                }}
                className="border-0 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden p-0"
              >
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-500 pt-8 pb-12 px-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-4">
                      <div className="bg-white/20 p-3 rounded-xl">
                        <LockKeyhole className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-center mb-2">
                      Secure Wallet
                    </h2>
                    <p className="max-w-sm mx-auto text-center text-sm text-white/80">
                      Create or connect a passkey wallet
                    </p>
                  </div>
                </div>

                {/* Main content with negative margin to overlap with header */}
                <div className="mx-auto -mt-6 w-full max-w-md px-6 pb-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-purple-100 dark:border-purple-900">
                    <SigpassKit />
                  </div>

                  <DrawerClose asChild>
                    <Button
                      variant="outline"
                      className="w-full border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      Close
                    </Button>
                  </DrawerClose>
                </div>

                {/* Footer attribution */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-purple-100 dark:border-purple-900/30">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Powered by the Polkadot ecosystem
                  </p>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Mobile menu */}
            <MobileMenu pathname={pathname} />
          </div>
        </div>
      </header>

      {/* Mount the global create-wallet dialog once, outside the header */}
      <CreateWalletDialog />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Helper components                            */
/* -------------------------------------------------------------------------- */

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1 text-sm font-medium transition-colors hover:text-white/80",
        active ? "bg-white/20 text-white px-3 py-2 rounded-md" : "text-white/90"
      )}
    >
      {children}
    </Link>
  );
}

function DropdownLink({
  href,
  external = false,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const common =
    "flex items-center rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground";
  return external ? (
    <DropdownMenu.Item className={common} asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    </DropdownMenu.Item>
  ) : (
    <DropdownMenu.Item className={common} asChild>
      <Link href={href}>{children}</Link>
    </DropdownMenu.Item>
  );
}

function MobileMenu({ pathname }: { pathname: string | null }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-md p-2 text-white hover:bg-white/20 lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        sideOffset={8}
        className="w-56 rounded-md border bg-gradient-to-br from-purple-600 to-blue-500 p-2 text-white shadow-lg"
      >
        {primaryNav.map(({ href, label }) => (
          <DropdownLink key={href} href={href}>
            {label}
          </DropdownLink>
        ))}
        <DropdownMenu.Separator className="my-1 h-px bg-white/20" />
        <DropdownLink href="/mint-redeem-lst-bifrost">
          Mint&nbsp;/&nbsp;Redeem&nbsp;Bifrost
        </DropdownLink>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
