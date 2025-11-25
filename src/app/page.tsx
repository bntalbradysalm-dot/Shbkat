import { BalanceCard } from '@/components/dashboard/balance-card';
import { ServiceGrid } from '@/components/dashboard/service-grid';
import { Header } from '@/components/layout/header';

export default function Home() {
  return (
    <>
      <Header />
      <BalanceCard />
      <ServiceGrid />
    </>
  );
}
