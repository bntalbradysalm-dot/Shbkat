
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Wifi, MapPin, Heart, AlertCircle, Building } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

// Unified Network type
type UnifiedNetwork = {
  id: string;
  name: string;
  location: string;
  isFavorited: boolean;
  source: 'baity' | 'local';
  href: string;
};

// Type for BaityNet API response
type BaityNetwork = {
  id: number;
  name: string;
  desc: string;
};

// Type for Firestore Network document
type LocalNetwork = {
  id: string;
  name: string;
  location: string;
  phoneNumber?: string;
  ownerId: string;
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

  // --- Data Fetching ---
  const [baityNetworks, setBaityNetworks] = useState<BaityNetwork[]>([]);
  const [isLoadingBaity, setIsLoadingBaity] = useState(true);
  const [errorBaity, setErrorBaity] = useState<string | null>(null);

  useEffect(() => {
    const fetchBaityNetworks = async () => {
      setIsLoadingBaity(true);
      setErrorBaity(null);
      try {
        const response = await fetch('/services/networks-api');
        if (!response.ok) throw new Error('Failed to fetch BaityNet networks');
        const data = await response.json();
        setBaityNetworks(data);
      } catch (err) {
        setErrorBaity('لا يمكن تحميل شبكات بيتي نت حاليًا.');
        console.error(err);
      } finally {
        setIsLoadingBaity(false);
      }
    };
    fetchBaityNetworks();
  }, []);

  const localNetworksQuery = useMemoFirebase(() => firestore ? collection(firestore, 'networks') : null, [firestore]);
  const { data: localNetworks, isLoading: isLoadingLocal } = useCollection<LocalNetwork>(localNetworksQuery);
  
  const favoritesQuery = useMemoFirebase(() => user ? query(collection(firestore, 'users', user.uid, 'favorites'), where('favoriteType', '==', 'Network')) : null, [firestore, user]);
  const { data: favorites } = useCollection<Favorite>(favoritesQuery);

  // --- Data Processing ---
  const favoriteNetworkIds = useMemo(() => new Set(favorites?.map(f => f.targetId)), [favorites]);

  const unifiedNetworks: UnifiedNetwork[] = useMemo(() => {
    const combined: UnifiedNetwork[] = [];

    // Add BaityNet networks
    baityNetworks.forEach(net => {
      const networkId = `baity-${net.id}`;
      combined.push({
        id: networkId,
        name: net.name,
        location: net.desc,
        isFavorited: favoriteNetworkIds.has(networkId),
        source: 'baity',
        href: `/services/${net.id}?name=${encodeURIComponent(net.name)}`,
      });
    });

    // Add local Firestore networks
    localNetworks?.forEach(net => {
      const networkId = `local-${net.id}`;
      combined.push({
        id: networkId,
        name: net.name,
        location: net.location,
        isFavorited: favoriteNetworkIds.has(networkId),
        source: 'local',
        href: `/network-cards/${net.id}?name=${encodeURIComponent(net.name)}`,
      });
    });

    return combined;
  }, [baityNetworks, localNetworks, favoriteNetworkIds]);

  const filteredNetworks = useMemo(() => {
    if (!unifiedNetworks) return [];
    return unifiedNetworks.filter(net => 
      net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (net.location && net.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [unifiedNetworks, searchTerm]);
  
  const isLoading = isLoadingBaity || isLoadingLocal;

  // --- Event Handlers ---
  const handleFavoriteClick = async (e: React.MouseEvent, network: UnifiedNetwork) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول لاستخدام المفضلة.' });
      return;
    }

    const favoritesCollectionRef = collection(firestore, 'users', user.uid, 'favorites');

    if (network.isFavorited) {
      const favToDelete = favorites?.find(f => f.targetId === network.id);
      if (favToDelete) {
        const docRef = doc(firestore, 'users', user.uid, 'favorites', favToDelete.id);
        deleteDocumentNonBlocking(docRef);
        toast({ title: 'تمت الإزالة', description: `تمت إزالة "${network.name}" من المفضلة.` });
      }
    } else {
      addDocumentNonBlocking(favoritesCollectionRef, {
        userId: user.uid,
        targetId: network.id,
        name: network.name,
        location: network.location,
        favoriteType: 'Network',
      });
      toast({ title: 'تمت الإضافة', description: `تمت إضافة "${network.name}" إلى المفضلة.` });
    }
  };

  // --- Rendering ---
  const renderContent = () => {
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
    
    if (errorBaity && unifiedNetworks.length === 0) {
       return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">حدث خطأ</h3>
          <p className="mt-1 text-sm text-muted-foreground">{errorBaity}</p>
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
        {filteredNetworks.map((network, index) => (
           <Link href={network.href} key={network.id} className="block">
                <Card 
                  className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-colors animate-in fade-in-0 rounded-2xl"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                          {network.source === 'baity' ? <Building className="h-6 w-6 text-white" /> : <Wifi className="h-6 w-6 text-white" />}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold">{network.name}</h4>
                          {network.location && (
                             <p className="text-xs text-primary-foreground/80 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              {network.location}
                            </p>
                          )}
                           <Badge variant="secondary" className="bg-white/20 text-white text-xs mt-1">{network.source === 'baity' ? 'بيتي نت' : 'شبكة محلية'}</Badge>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleFavoriteClick(e, network)}
                        className="p-2 text-primary-foreground/80 hover:text-white transition-colors"
                        aria-label={`إضافة ${network.name} إلى المفضلة`}
                      >
                        <Heart className={cn("h-5 w-5", network.isFavorited && 'fill-red-400 text-red-400')} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
            </Link>
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
