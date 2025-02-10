import { useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

export default function PortfolioCard() {
  const { data: balance, refetch } = useBalance();
  return (
    <div>
      <h1>Balance</h1>
      <p>{balance?.value ? formatEther(balance.value) : '0'}</p>
      <Button size="icon" onClick={() => refetch()}>
        <RefreshCcw />
      </Button>
    </div>
  )
}