import { BalanceCard } from '@/components/dashboard/balance-card';
import { ServiceGrid } from '@/components/dashboard/service-grid';

export default function Home() {
  return (
    <>
      <BalanceCard />
      <ServiceGrid />
    </>
  );
}
