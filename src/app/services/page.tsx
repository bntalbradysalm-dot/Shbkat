
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Wifi, MapPin, Heart, AlertCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Type for networks from BaityNet API
type ApiNetwork = {
  id: number;
  name: string;
  desc: string; 
  logo?: string;
  urlLogin?: string;
  source: 'api';
};

// Type for networks from Firestore
type FirestoreNetwork = {
  id: string;
  name: string;
  location: string;
  phoneNumber?: string;
  source: 'firestore';
};

// Union type for combined list
type CombinedNetwork = ApiNetwork | FirestoreNetwork;


type Favorite = {
    id: string;
    targetId: string;
};

export default function ServicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [apiNetworks, setApiNetworks] = useState<ApiNetwork[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // 1. Fetch BaityNet networks from API
  useEffect(() => {
    const fetchApiNetworks = async () => {
      setIsLoadingApi(true);
      setApiError(null);
      try {
        const response = await fetch('/services/networks-api');
        if (!response.ok) {
          throw new Error('Failed to fetch networks');
        }
        const data = await response.json();
        const networksWithSource = data.map((net: any) => ({ ...net, source: 'api' }));
        setApiNetworks(networksWithSource);
      } catch (err) {
        setApiError('لا يمكن تحميل قائمة شبكات بيتي نت حاليًا.');
        console.error(err);
      } finally {
        setIsLoadingApi(false);
      }
    };
    fetchApiNetworks();
  }, []);

  // 2. Fetch Firestore networks
  const firestoreNetworksQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'networks'), orderBy('name')) : null, [firestore]);
  const { data: firestoreNetworksData, isLoading: isLoadingFirestore } = useCollection<Omit<FirestoreNetwork, 'source'>>(firestoreNetworksQuery);

  const firestoreNetworks: FirestoreNetwork[] = useMemo(() => 
    firestoreNetworksData?.map(net => ({ ...net, source: 'firestore' })) || [], 
  [firestoreNetworksData]);


  // 3. Fetch user's favorites
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
  
  // 4. Combine and filter networks
  const filteredNetworks = useMemo(() => {
    const combined: CombinedNetwork[] = [...apiNetworks, ...firestoreNetworks];
    if (!combined) return [];
    return combined.filter(net => {
        const name = net.name.toLowerCase();
        const location = net.source === 'api' ? net.desc?.toLowerCase() : net.location?.toLowerCase();
        const term = searchTerm.toLowerCase();
        return name.includes(term) || (location && location.includes(term));
    });
  }, [apiNetworks, firestoreNetworks, searchTerm]);

  const handleFavoriteClick = async (e: React.MouseEvent, network: CombinedNetwork) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول لاستخدام المفضلة.' });
      return;
    }

    const networkId = String(network.id);
    const isFavorited = favoriteNetworkIds.has(networkId);
    const favoritesCollectionRef = collection(firestore, 'users', user.uid, 'favorites');

    if (isFavorited) {
      const favToDelete = favorites?.find(f => f.targetId === networkId);
      if (favToDelete) {
        const docRef = doc(firestore, 'users', user.uid, 'favorites', favToDelete.id);
        deleteDocumentNonBlocking(docRef);
        toast({ title: 'تمت الإزالة', description: `تمت إزالة "${network.name}" من المفضلة.` });
      }
    } else {
      const favoriteData = {
        userId: user.uid,
        targetId: networkId,
        name: network.name,
        location: network.source === 'api' ? network.desc : network.location,
        phoneNumber: network.source === 'firestore' ? network.phoneNumber : undefined,
        favoriteType: 'Network',
      };
      addDocumentNonBlocking(favoritesCollectionRef, favoriteData);
      toast({ title: 'تمت الإضافة', description: `تمت إضافة "${network.name}" إلى المفضلة.` });
    }
  };
  
  const getNetworkLink = (network: CombinedNetwork) => {
    const networkId = String(network.id);
    const encodedName = encodeURIComponent(network.name);
    if (network.source === 'api') {
      return `/services/${networkId}?name=${encodedName}`;
    } else {
      return `/network-cards/${networkId}?name=${encodedName}`;
    }
  };

  const renderContent = () => {
    const isLoading = isLoadingApi || isLoadingFirestore;
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 bg-primary rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg bg-white/30" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-white/30" />
                    <Skeleton className="h-4 w-40 bg-white/30" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6 rounded-full bg-white/30" />
              </div>
            </Card>
          ))}
        </div>
      );
    }
    
    if (apiError) {
       return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">حدث خطأ</h3>
          <p className="mt-1 text-sm text-muted-foreground">{apiError}</p>
        </div>
      );
    }

    if (!filteredNetworks || filteredNetworks.length === 0) {
      return (
        <div className="text-center py-16">
          <Wifi className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">{searchTerm ? 'لا توجد نتائج بحث' : 'لا توجد شبكات متاحة'}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{searchTerm ? 'حاول البحث بكلمة أخرى.' : 'يبدو أنه لا توجد شبكات مضافة حالياً.'}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredNetworks.map((network, index) => {
          const networkIdAsString = String(network.id);
          const isFavorited = favoriteNetworkIds.has(networkIdAsString);
          const location = network.source === 'api' ? network.desc : network.location;
          const link = getNetworkLink(network);

          return (
             <Link href={link} key={`${network.source}-${network.id}`} className="block">
                <Card 
                  className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-colors animate-in fade-in-0 rounded-2xl"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                          <Wifi className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold">{network.name}</h4>
                          {location && (
                             <p className="text-xs text-primary-foreground/80 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              {location}
                            </p>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleFavoriteClick(e, network)}
                        className="p-2 text-primary-foreground/80 hover:text-white transition-colors"
                        aria-label={`إضافة ${network.name} إلى المفضلة`}
                      >
                        <Heart className={cn("h-5 w-5", isFavorited && 'fill-red-400 text-red-400')} />
                      </button>
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
