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

/* -------------------------------------------------------------------------- */
/*                               Primary routes                               */
/* -------------------------------------------------------------------------- */

const primaryNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/yield-farm", label: "Yield Farm", icon: Coins },
  { href: "/vesting", label: "Vesting", icon: Boxes },
  { href: "/send-transaction", label: "Send Tx", icon: Send },
  { href: "/write-contract", label: "Write", icon: PenLine },
];

/* -------------------------------------------------------------------------- */
/*                                   Navbar                                   */
/* -------------------------------------------------------------------------- */

export default function Navbar() {
  const pathname = usePathname();
  const [walletDrawerOpen, setWalletDrawerOpen] = useState(false);

  /* -------------------------------- render -------------------------------- */
  return (
    <>
      <header className="sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <WalletIcon className="h-5 w-5 text-primary" />
            <span>Open&nbsp;Encode</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 lg:flex">
            {primaryNav.map(({ href, label, icon: Icon }) => (
              <NavItem key={href} href={href} active={pathname === href}>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavItem>
            ))}

            {/* More */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-foreground/80">
                  <Menu className="h-4 w-4" />
                  More
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                sideOffset={8}
                className="min-w-[10rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
              >
                <DropdownLink href="/mint-redeem-lst-bifrost">
                  Mint&nbsp;/&nbsp;Redeem&nbsp;Bifrost
                </DropdownLink>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </nav>

          {/* Wallet actions */}
          <div className="flex items-center gap-4">
            {/* Wallet drawer */}
            <Drawer
              open={walletDrawerOpen}
              onOpenChange={setWalletDrawerOpen}
            >
              <DrawerTrigger asChild>
                <Button
                  variant="polkadot"
                  size="sm"
                  className="inline-flex items-center gap-1"
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
                className="border-0 bg-gradient-to-br from-pink-500 via-fuchsia-600 to-violet-600 text-white shadow-2xl"
              >
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 py-10">
                  <Sparkles className="h-10 w-10 text-white/80" />
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    Polkadot&nbsp;Wallet
                  </h2>
                  <p className="max-w-sm text-center text-sm text-white/80">
                    Create or connect a passkey wallet to unlock the multichain
                    power of the&nbsp;Polkadot ecosystem.
                  </p>

                  <SigpassKit />

                  <DrawerClose asChild>
                    <Button
                      variant="ghost"
                      className="mt-8 w-full bg-white/10 text-white hover:bg-white/20"
                    >
                      Close
                    </Button>
                  </DrawerClose>
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
        "flex items-center gap-1 text-sm font-medium transition-colors hover:text-foreground/80",
        active && "text-primary"
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
        <button className="rounded-md p-2 hover:bg-accent lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        sideOffset={8}
        className="w-56 rounded-md border bg-popover p-2 text-popover-foreground shadow-lg"
      >
        {primaryNav.map(({ href, label }) => (
          <DropdownLink key={href} href={href}>
            {label}
          </DropdownLink>
        ))}
        <DropdownMenu.Separator className="my-1 h-px bg-muted" />
        <DropdownLink href="/mint-redeem-lst-bifrost">
          Mint&nbsp;/&nbsp;Redeem&nbsp;Bifrost
        </DropdownLink>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
