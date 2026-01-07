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
      title: 'تمت الإزالة',
      description: `تمت إزالة "${networkName}" من المفضلة.`,
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 bg-card rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-muted" />
                    <Skeleton className="h-4 w-40 bg-muted" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6 rounded-full bg-muted" />
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
           <Link href={`/services/${fav.targetId}?name=${encodeURIComponent(fav.name)}`} key={fav.id} className="block">
              <Card 
                className="cursor-pointer bg-card text-card-foreground hover:bg-muted/50 transition-colors animate-in fade-in-0 rounded-2xl"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Wifi className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold">{fav.name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          {fav.location}
                        </p>
                        {fav.phoneNumber && (
                           <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            {fav.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleRemoveFavorite(e, fav.id, fav.name)}
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                      aria-label={`إزالة ${fav.name} من المفضلة`}
                    >
                      <Heart className={cn("h-5 w-5 fill-red-400 text-red-500")} />
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
