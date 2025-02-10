# Sigpass Kit

## Installation

Copy and paste the code in `sigpasskit.tsx` into your project.

## Usage

Create a `app/providers.tsx` file in your project and add the code in the [`providers.tsx`](../app/providers.tsx) file in this repo.

Go on https://cloud.reown.com/, sign up and create a project.

Substitute the `projectId` in the `providers.tsx` file with your projectId from Reown like below.

![Reown projectId](/public/reown-projectId.png)

Wrap your root layout with the `Providers` component like below in the `app/layout.tsx` file.

```tsx
import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/app/providers';

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})

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
    <html lang="en">
      <body
        className={unbounded.className}
      >
        <Providers>
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
```

Go to `next.config.mjs` and add the following to the `webpack` config:

```tsx
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
```

Import the component into your `app/page.tsx` file like below.

```tsx
import SigpassKit from '@/components/sigpasskit';

// ...

<SigpassKit />
```

You can see an example of how to use the component in the [`app/wallet/page.tsx`](../app/wallet/page.tsx) file in this repo.

## Understanding the code

`SigpassKit` is a drop in component that you can use to quickly add Connect Wallet functionality to your dapp project.

It is built on top of the `sigpass` library and `rainbowkit`.

There are 2 main parts to the component:

1. Create/Get wallet (using `sigpass` library)
2. Connect wallet (using `rainbowkit`)


