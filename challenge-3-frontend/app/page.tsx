import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[5px_0.5fr_5px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <p className="self-center text-xl font-bold">Get started by checking out the demoRs</p>
        <div className="flex flex-col w-full gap-12">
          <div className="grid grid-cols-3 min-w-10 max-w-[1024px] items-start justify-center gap-4 flex-wrap">
            <div className="flex flex-col items-center justify-center w-full h-full gap-4">
              <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
                <li className="mb-2">
                  <Link href="/faucet">Faucet</Link>
                </li>
                <li className="mb-2">
                  <Link href="/token-vesting">Add / Remove whitelistes</Link>
                </li>
                <li className="mb-2">
                  <Link href="/token-vesting">Add / Remove whitelisted token (Optional)</Link>
                </li>
                <li className="mb-2">
                  <Link href="/mint-redeem-lst-bifrost">Create vesting schedule</Link>
                </li>
                <li className="mb-2">
                  <Link href="/mint-redeem-lst-bifrost">Claim vested tokens</Link>
                </li>
                <li className="mb-2">
                  <Link href="/mint-redeem-lst-bifrost">Revoke vesting</Link>
                </li>
                <li className="mb-2">
                  <Link href="/mint-redeem-lst-bifrost">Emergency pause (Optional)</Link>
                </li>
              </ol>
            </div>
            <div className="flex flex-col items-center justify-center w-full h-full gap-4">
              <Image
                src="/og-logo.png"
                alt="OpenGuild logo"
                width={180}
                height={38}
                priority
              />
            </div>
            <div className="flex flex-col items-center justify-center w-full h-full gap-4">
              <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
                <li className="mb-2">
                  <Link href="/faucet">Faucet</Link>
                </li>
                <li className="mb-2">
                  <Link href="/yield-farming">Stake your token</Link>
                </li>
                <li className="mb-2">
                  <Link href="/yield-farming">Claim your rewards</Link>
                </li>
                <li className="mb-2">
                  <Link href="/yield-farming">Withdraw your staked token</Link>
                </li>
                <li className="mb-2">
                  <Link href="/yield-farming">Emergency Withdraw (Optional)</Link>
                </li>
                <li className="mb-2">
                  <Link href="/yield-farming">Update reward rate (Optional)</Link>
                </li>
              </ol>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center min-w-10 justify-center gap-4">
            <div className="flex flex-col items-center justify-center gap-4">
              <a
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                href="/token-vesting"
              >
                Your Token Vesting
              </a>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
              <a
                className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
                href="https://github.com/0xharryriddle/open-encode-challenge/tree/main/challenge-3-frontend"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read our docs
              </a>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
              <a
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                href="/yield-farming"
              >
                Yield Farming
              </a>
            </div>
          </div>
        </div>

      </div>
      <footer className="row-start-3 flex flex-col justify-center items-center gap-4">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://openguild.wtf"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="https://avatars.githubusercontent.com/u/116719081?s=200&v=4"
            alt="openguild Logo"
            width={16}
            height={16}
          />
          Go to openguild.wtf →
        </a>
        <div className="text-sm text-muted-foreground">
          Builded based on template from <a className="underline underline-offset-4" href="https://buildstation.org" target="_blank" rel="noopener noreferrer">buildstation.org</a> with support from <a className="underline underline-offset-4" href="https://openguild.wtf" target="_blank" rel="noopener noreferrer">OpenGuild</a>
        </div>
      </footer>
    </div >
  );
}
