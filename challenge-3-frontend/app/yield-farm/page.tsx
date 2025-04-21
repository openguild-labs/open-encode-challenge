import Navbar from "@/components/navbar";
import SigpassKit from "@/components/sigpasskit";
import YieldFarm from "@/components/yield-farm";

export default function YieldFarmPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <SigpassKit />
      <Navbar />
      <h1 className="text-2xl font-bold">Yield Farming UI</h1>
      <YieldFarm />
    </div>
  );
}
