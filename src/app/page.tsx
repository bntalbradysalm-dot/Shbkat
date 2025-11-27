import { BalanceCard } from '@/components/dashboard/balance-card';
import { PromotionalImage } from '@/components/dashboard/promotional-image';
import { ServiceGrid } from '@/components/dashboard/service-grid';
import { Header } from '@/components/layout/header';

export default function Home() {
  return (
    <>
      <Header />
      <div className="p-4 space-y-4">
        <BalanceCard />
        <PromotionalImage />
      </div>
      <ServiceGrid />
    </>
  );
}
