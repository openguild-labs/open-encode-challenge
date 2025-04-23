"use client";

import Link from "next/link";
import {
  ArrowRight,
  Github,
  Layers,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                 Page View                                  */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Hero />

      <EcosystemStats />

      <FeatureShowcase />

      <WhyPolkadot />

      <GetStartedSteps />

      <CallToAction />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Hero                                     */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate flex flex-col items-center justify-center gap-8 px-6 py-32 text-center overflow-hidden">
      {/* background blur rings */}
      <div
        className="absolute inset-0 -z-10 animate-spin-slow"
        style={{
          background:
            "radial-gradient(closest-side, rgba(230,0,122,0.35), transparent 70%)",
          maskImage:
            "radial-gradient(circle at center, black 40%, transparent 70%)",
        }}
      />
      <div className="absolute -bottom-48 -right-48 size-[600px] rounded-full bg-gradient-to-br from-violet-500/40 via-fuchsia-500/40 to-pink-500/40 blur-3xl -z-20" />

      <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent drop-shadow-lg">
        Build Polkadot&nbsp;DApps at&nbsp;Warp&nbsp;Speed
      </h1>

      <p className="max-w-2xl text-lg md:text-xl text-muted-foreground">
        Production-ready React &amp; Next.js components—staking, vesting, yield
        farming, wallets&nbsp;&amp;&nbsp;more—crafted for the multi-chain
        future of the&nbsp;Polkadot ecosystem.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg" variant="polkadot">
          <Link href="/yield-farm" className="flex items-center gap-2">
            Get&nbsp;Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link
            href="https://github.com/syntaxsurge/open-encode-challenge"
            target="_blank"
            className="flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            GitHub
          </Link>
        </Button>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Ecosystem Statistics                           */
/* -------------------------------------------------------------------------- */

function EcosystemStats() {
  const stats = [
    { label: "Parachains", value: "50+" },
    { label: "Active Wallets", value: "1.2 M" },
    { label: "Daily TXs", value: "3.5 M" },
    { label: "Relay Chain TPS", value: "10k+" },
  ];

  return (
    <section className="border-y bg-muted/20">
      <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4 gap-6 py-16 px-6 text-center">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-3xl md:text-4xl font-extrabold">{value}</span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Feature Showcase                               */
/* -------------------------------------------------------------------------- */

function FeatureShowcase() {
  const features = [
    {
      title: "Passkey Wallets",
      emoji: "🔑",
      description:
        "Password-less SigpassKit lets users create secure, on-device wallets in seconds.",
    },
    {
      title: "One-click Staking",
      emoji: "📈",
      description:
        "Stake LP tokens and watch rewards accrue with lightning-fast updates.",
    },
    {
      title: "Token Vesting",
      emoji: "⏳",
      description:
        "Schedule releases with cliffs &amp; durations—no back-end required.",
    },
    {
      title: "Gas-less Send",
      emoji: "🚀",
      description:
        "Smart UX with pending, confirming &amp; confirmed states out of the box.",
    },
    {
      title: "Contract Studio",
      emoji: "📝",
      description:
        "Read &amp; write any smart contract instantly through auto-generated forms.",
    },
    {
      title: "Responsive Design",
      emoji: "💎",
      description:
        "Tailwind&nbsp;+&nbsp;Radix ensure crystal-clear visuals on every device.",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          title="Everything You Need"
          subtitle="Drop-in components that cover the full DApp lifecycle."
        />

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  emoji,
  description,
}: {
  title: string;
  emoji: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-6 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      <span className="text-4xl">{emoji}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Why Polkadot                                 */
/* -------------------------------------------------------------------------- */

function WhyPolkadot() {
  const perks = [
    {
      icon: Layers,
      title: "True Interoperability",
      body: "Seamlessly connect multiple blockchains and unlock cross-chain applications.",
    },
    {
      icon: Shield,
      title: "Shared Security",
      body: "Relay-chain validators secure every parachain so you can focus on UX.",
    },
    {
      icon: Zap,
      title: "Instant Upgradeability",
      body: "Upgrade your runtime without hard forks and stay ahead of the curve.",
    },
  ];

  return (
    <section className="bg-gradient-to-br from-violet-950 via-fuchsia-900 to-pink-900 text-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          title="Why Polkadot?"
          subtitle="A relay-chain architecture purpose-built for a multi-chain world."
          invert
        />
        <div className="mt-12 grid gap-12 md:grid-cols-3">
          {perks.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-4">
              <Icon className="w-10 h-10 text-pink-400" />
              <h4 className="text-xl font-semibold">{title}</h4>
              <p className="text-sm/relaxed text-white/80">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Get Started Timeline                            */
/* -------------------------------------------------------------------------- */

function GetStartedSteps() {
  const steps = [
    {
      title: "Install",
      body: "Clone the repo &amp; run <code>pnpm install</code> to fetch dependencies.",
    },
    {
      title: "Configure",
      body: "Edit <code>app/providers.tsx</code> with your WalletConnect&nbsp;ID.",
    },
    {
      title: "Ship",
      body: "Deploy to Vercel, IPFS, or your favorite infra—zero extra setup.",
    },
  ];

  return (
    <section className="py-24 border-t">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeader
          title="Launch in Minutes"
          subtitle="Three simple steps to your first Polkadot DApp."
        />
        <ol className="mt-12 space-y-8 relative">
          {steps.map((s, i) => (
            <li key={s.title} className="relative pl-10">
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full font-bold",
                  i === steps.length - 1
                    ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                    : "border-2 border-primary text-primary"
                )}
              >
                {i + 1}
              </span>
              <h5 className="text-lg font-semibold">{s.title}</h5>
              <p
                className="mt-1 text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: s.body }}
              />
            </li>
          ))}
          {/* connecting line */}
          <div className="absolute left-3 top-7 bottom-7 w-px bg-border" />
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Call to Action                               */
/* -------------------------------------------------------------------------- */

function CallToAction() {
  return (
    <section className="relative isolate flex flex-col items-center gap-6 py-24 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white text-center overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] pointer-events-none -z-10" />
      <h2 className="text-4xl md:text-5xl font-extrabold max-w-3xl">
        Ready to craft the next killer Polkadot&nbsp;DApp?
      </h2>
      <p className="max-w-xl text-lg/relaxed text-white/90">
        Fork the kit, drop in your chain config, and ship to mainnet today.
      </p>
      <Button asChild size="lg" variant="secondary" className="text-primary">
        <Link href="/yield-farm" className="flex items-center gap-2">
          Start&nbsp;Building <ChevronRight className="w-4 h-4" />
        </Link>
      </Button>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Reusable Helpers                               */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  title,
  subtitle,
  invert = false,
}: {
  title: string;
  subtitle: string;
  invert?: boolean;
}) {
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <h2
        className={cn(
          "text-3xl md:text-4xl font-extrabold tracking-tight",
          invert &&
            "bg-gradient-to-r from-pink-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent"
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "max-w-2xl text-muted-foreground",
          invert && "text-white/80"
        )}
      >
        {subtitle}
      </p>
    </header>
  );
}