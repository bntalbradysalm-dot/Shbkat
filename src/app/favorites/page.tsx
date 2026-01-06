
'use client';

import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, MapPin, Phone, Star, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Favorite = {
  id: string;
  userId: string;
  targetId: string; // Network ID
  name: string;
  location: string;
  phoneNumber?: string;
  favoriteType: 'Network';
};

export default function FavoritesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

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

  const { data: favorites, isLoading } = useCollection<Favorite>(favoritesQuery);

  const handleRemoveFavorite = (e: React.MouseEvent, favoriteId: string, networkName: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !firestore) return;
    const docRef = doc(firestore, 'users', user.uid, 'favorites', favoriteId);
    deleteDocumentNonBlocking(docRef);
    toast({
      variant: 'destructive',
      title: 'تمت الإزالة',
      description: `تمت إزالة "${networkName}" من المفضلة.`,
    });
  };
  
  const getNetworkLink = (fav: Favorite) => {
    // Assuming API networks have numeric IDs and Firestore networks have string IDs
    const isApiNetwork = /^\d+$/.test(fav.targetId);
    const encodedName = encodeURIComponent(fav.name);
    
    if (isApiNetwork) {
      return `/services/${fav.targetId}?name=${encodedName}`;
    } else {
      return `/network-cards/${fav.targetId}?name=${encodedName}`;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
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

    if (!favorites || favorites.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <Star className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">لا توجد شبكات مفضلة</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            اضف شبكتك المفضلة هنا للوصول إليها بسرعة
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {favorites.map((fav, index) => (
           <Link href={getNetworkLink(fav)} key={fav.id} className="block">
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
                        <h4 className="font-bold">{fav.name}</h4>
                        <p className="text-xs text-primary-foreground/80 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          {fav.location}
                        </p>
                        {fav.phoneNumber && (
                           <p className="text-xs text-primary-foreground/80 flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            {fav.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleRemoveFavorite(e, fav.id, fav.name)}
                      className="p-2 text-primary-foreground/80 hover:text-white transition-colors"
                      aria-label={`إزالة ${fav.name} من المفضلة`}
                    >
                      <Heart className={cn("h-5 w-5 fill-red-400 text-red-400")} />
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
        <SimpleHeader title="المفضلة" />
        <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
      </div>
      <Toaster />
    </>
  );
}
