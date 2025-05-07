import TokenVestingComponent from '@/components/token-vesting';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 lg:p-12 bg-background text-foreground">
      <div className="w-full max-w-3xl"> {/* You can adjust max-width as needed */}
        <TokenVestingComponent />
      </div>
    </main>
  );
}
