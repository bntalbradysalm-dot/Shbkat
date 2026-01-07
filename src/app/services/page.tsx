'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Wifi, Heart, AlertCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// From BaityNet API
type Network = {
  id: number;
  name: string;
  desc: string; 
};

// From local Firestore
type LocalNetwork = {
    id: string;
    name: string;
    location: string;
    phoneNumber?: string;
    ownerId: string;
};

type CombinedNetwork = {
    id: string;
    name: string;
    location: string;
    phoneNumber?: string;
    isLocal: boolean;
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
  
  // State for combined networks
  const [combinedNetworks, setCombinedNetworks] = useState<CombinedNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch local networks from Firestore
  const localNetworksQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'networks') : null),
    [firestore]
  );
  const { data: localNetworks, isLoading: isLoadingLocal } = useCollection<LocalNetwork>(localNetworksQuery);

  useEffect(() => {
    const fetchAndCombineNetworks = async () => {
      setIsLoading(true);
      setError(null);
      
      const local: CombinedNetwork[] = (localNetworks || []).map(n => ({
        id: n.id,
        name: n.name,
        location: n.location,
        phoneNumber: n.phoneNumber,
        isLocal: true,
      }));

      let external: CombinedNetwork[] = [];
      try {
        const response = await fetch('/services/networks-api');
        if (!response.ok) {
          // Don't throw, just log and continue with local networks
          console.error('Failed to fetch external networks');
        } else {
          const data: Network[] = await response.json();
          external = data.map(n => ({
            id: String(n.id),
            name: n.name,
            location: n.desc || 'غير محدد',
            isLocal: false,
          }));
        }
      } catch (err) {
        console.error('Error fetching external networks:', err);
        setError('لا يمكن تحميل قائمة الشبكات الخارجية حاليًا.');
      }
      
      // Show external networks first, then local ones
      setCombinedNetworks([...external, ...local]);
      setIsLoading(false);
    };

    if (!isLoadingLocal) {
        fetchAndCombineNetworks();
    }
  }, [localNetworks, isLoadingLocal]);

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
    return combinedNetworks.filter(net => 
      net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      net.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [combinedNetworks, searchTerm]);

  const handleFavoriteClick = async (
    e: React.MouseEvent,
    network: CombinedNetwork
  ) => {
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

    const networkIdAsString = String(network.id);
    const isFavorited = favoriteNetworkIds.has(networkIdAsString);
    const favoritesCollectionRef = collection(
      firestore,
      'users',
      user.uid,
      'favorites'
    );

    if (isFavorited) {
      const favToDelete = favorites?.find(f => f.targetId === networkIdAsString);
      if (favToDelete) {
        const docRef = doc(
          firestore,
          'users',
          user.uid,
          'favorites',
          favToDelete.id
        );
        deleteDocumentNonBlocking(docRef);
        toast({
          title: 'تمت الإزالة',
          description: `تمت إزالة "${network.name}" من المفضلة.`,
        });
      }
    } else {
      const favoriteData: any = {
        userId: user.uid,
        targetId: networkIdAsString,
        name: network.name,
        location: network.location || 'غير محدد',
        favoriteType: 'Network',
      };
      
      if (network.isLocal && network.phoneNumber) {
        favoriteData.phoneNumber = network.phoneNumber;
      }
      
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
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 bg-primary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg bg-white/20" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-white/20" />
                    <Skeleton className="h-4 w-40 bg-white/20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6 rounded-full bg-white/20" />
              </div>
            </Card>
          ))}
        </div>
      );
    }
    
    if (error && filteredNetworks.length === 0) {
       return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">حدث خطأ</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error}
          </p>
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
            {searchTerm ? 'حاول البحث بكلمة أخرى.' : 'يبدو أنه لا توجد شبكات مضافة حالياً.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredNetworks.map((network, index) => {
          const networkIdAsString = String(network.id);
          const isFavorited = favoriteNetworkIds.has(networkIdAsString);
          const linkHref = network.isLocal 
            ? `/network-cards/${networkIdAsString}?name=${encodeURIComponent(network.name)}` 
            : `/services/${networkIdAsString}?name=${encodeURIComponent(network.name)}`;

          return (
             <Link href={linkHref} key={network.id} className="block">
                <Card 
                  className="bg-primary cursor-pointer text-primary-foreground hover:bg-primary/90 transition-colors rounded-2xl animate-in fade-in-0"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                        <button 
                          onClick={(e) => handleFavoriteClick(e, network)}
                          className="p-2 text-primary-foreground/80 hover:text-white transition-colors"
                          aria-label={`إضافة ${network.name} إلى المفضلة`}
                        >
                          <Heart className={cn("h-6 w-6", isFavorited && 'fill-white text-white')} />
                        </button>
                        <div className="flex-1 text-right mr-4 space-y-1">
                          <h4 className="font-bold">{network.name}</h4>
                          <p className="text-xs text-primary-foreground/80 text-right">
                            {network.location}
                          </p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-lg">
                           <Wifi className="h-6 w-6 text-white" />
                        </div>
                    </div>
                  </CardContent>
                </Card>
            </Link>
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
