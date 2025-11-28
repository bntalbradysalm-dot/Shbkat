'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Wifi, MapPin, Phone, Heart } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';


type Network = {
  id: string;
  name: string;
  location: string;
  phoneNumber?: string;
};

type Favorite = {
    id: string;
    targetId: string;
};

export default function ServicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch networks
  const networksCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'networks') : null),
    [firestore]
  );
  const { data: networks, isLoading } = useCollection<Network>(networksCollection);

  // Fetch user's favorites
  const favoritesQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'favorites'),
            where('favoriteType', '==', 'Network')
          )
        : null,
    [firestore, user]
  );
  const { data: favorites } = useCollection<Favorite>(favoritesQuery);

  const favoriteNetworkIds = useMemo(() => new Set(favorites?.map(f => f.targetId)), [favorites]);

  const filteredNetworks = useMemo(() => {
    if (!networks) return [];
    return networks.filter(net => 
      net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      net.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [networks, searchTerm]);

  const handleFavoriteClick = async (e: React.MouseEvent, network: Network) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب تسجيل الدخول لاستخدام المفضلة.',
      });
      return;
    }

    const isFavorited = favoriteNetworkIds.has(network.id);
    const favoritesCollectionRef = collection(firestore, 'users', user.uid, 'favorites');

    if (isFavorited) {
      // Find the favorite document to delete
      const favToDelete = favorites?.find(f => f.targetId === network.id);
      if (favToDelete) {
        const docRef = doc(firestore, 'users', user.uid, 'favorites', favToDelete.id);
        deleteDocumentNonBlocking(docRef);
        toast({
          title: 'تمت الإزالة',
          description: `تمت إزالة "${network.name}" من المفضلة.`,
        });
      }
    } else {
      // Add to favorites
      const favoriteData = {
        userId: user.uid,
        targetId: network.id,
        name: network.name,
        location: network.location,
        phoneNumber: network.phoneNumber || '',
        favoriteType: 'Network',
      };
      addDocumentNonBlocking(favoritesCollectionRef, favoriteData);
      toast({
        title: 'تمت الإضافة',
        description: `تمت إضافة "${network.name}" إلى المفضلة.`,
      });
    }
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
        {filteredNetworks.map((network, index) => {
          const isFavorited = favoriteNetworkIds.has(network.id);
          return (
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
                    onClick={(e) => handleFavoriteClick(e, network)}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label={`إضافة ${network.name} إلى المفضلة`}
                  >
                    <Heart className={cn("h-5 w-5", isFavorited && 'fill-red-500 text-red-500')} />
                  </button>
                </div>
              </CardContent>
            </Card>
          )
        })}
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
