'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Wifi, MapPin, Phone, Heart } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

type Network = {
  id: string;
  name: string;
  location: string;
  phoneNumber?: string;
};

export default function ServicesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const networksCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'networks') : null),
    [firestore]
  );
  const { data: networks, isLoading } = useCollection<Network>(networksCollection);

  const filteredNetworks = useMemo(() => {
    if (!networks) return [];
    return networks.filter(net => 
      net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      net.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [networks, searchTerm]);

  const handleFavoriteClick = (e: React.MouseEvent, networkName: string) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: 'قيد التطوير',
      description: `سيتم إضافة شبكة "${networkName}" للمفضلة قريبًا.`,
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (!filteredNetworks || filteredNetworks.length === 0) {
      return (
        <div className="text-center py-16">
          <Wifi className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">
            {searchTerm ? 'لا توجد نتائج بحث' : 'لا توجد شبكات متاحة'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm ? 'حاول البحث بكلمة أخرى.' : 'لم يقم المسؤول بإضافة أي شبكات بعد.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredNetworks.map((network, index) => (
          <Card 
            key={network.id} 
            className="cursor-pointer hover:border-primary transition-colors animate-in fade-in-0"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Wifi className="h-6 w-6 text-primary dark:text-primary-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold">{network.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {network.location}
                    </p>
                    {network.phoneNumber && (
                       <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {network.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={(e) => handleFavoriteClick(e, network.name)}
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                  aria-label={`إضافة ${network.name} إلى المفضلة`}
                >
                  <Heart className="h-5 w-5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="الشبكات" />
        <div className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="البحث باسم الشبكة أو الموقع..."
              className="w-full pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {renderContent()}
        </div>
      </div>
      <Toaster />
    </>
  );
}
