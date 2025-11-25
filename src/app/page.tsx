import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { BalanceCard } from '@/components/dashboard/balance-card';
import { ServiceGrid } from '@/components/dashboard/service-grid';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 h-full">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20">
        <BalanceCard />
        <ServiceGrid />
      </main>
      <BottomNav />
    </div>
  );
}
