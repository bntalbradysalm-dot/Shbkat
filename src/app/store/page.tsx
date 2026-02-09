
'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Search, Tag, MapPin, CheckCircle, Wallet, Loader2, Package } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, writeBatch, increment, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category?: string;
};

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

export default function StorePage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [address, setAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products'), orderBy('name')) : null),
    [firestore]
  );
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handlePurchase = async () => {
    if (!selectedProduct || !address || !user || !userProfile || !userDocRef || !firestore) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال العنوان وتأكد من رصيدك.' });
      return;
    }

    if ((userProfile.balance ?? 0) < selectedProduct.price) {
      toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لشراء هذا المنتج.' });
      return;
    }

    setIsProcessing(true);
    const batch = writeBatch(firestore);
    const now = new Date().toISOString();

    try {
      // 1. Deduct balance
      batch.update(userDocRef, { balance: increment(-selectedProduct.price) });

      // 2. Create order record
      const orderRef = doc(collection(firestore, 'storeOrders'));
      batch.set(orderRef, {
        userId: user.uid,
        userName: userProfile.displayName,
        userPhone: userProfile.phoneNumber,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        amount: selectedProduct.price,
        address: address,
        status: 'pending',
        timestamp: now
      });

      // 3. Create transaction log
      const txRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      batch.set(txRef, {
        userId: user.uid,
        transactionDate: now,
        amount: selectedProduct.price,
        transactionType: 'شراء منتج من المتجر',
        notes: `منتج: ${selectedProduct.name} - العنوان: ${address}`
      });

      await batch.commit();
      setShowSuccess(true);
      setSelectedProduct(null);
      setAddress('');
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'فشلت العملية', description: 'حدث خطأ أثناء معالجة الطلب.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري معالجة طلب الشراء..." />;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
          <CardContent className="p-6 space-y-4">
            <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">تم الشراء بنجاح!</h2>
            <p className="text-muted-foreground text-sm">سيتم التواصل معك قريباً لتوصيل الطلب.</p>
            <Button className="w-full" onClick={() => setShowSuccess(false)}>العودة للمتجر</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="متجر ستار ميديا" />
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        
        {/* Balance Card */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6" />
              <div>
                <p className="text-xs opacity-80">رصيدك المتوفر</p>
                <p className="text-xl font-bold">{(userProfile?.balance ?? 0).toLocaleString()} ريال</p>
              </div>
            </div>
            <ShoppingBag className="h-8 w-8 opacity-20" />
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن منتج..." 
            className="pr-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Products Grid */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-60 w-full rounded-2xl" />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>لا توجد منتجات متوفرة حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <Card key={product.id} className="overflow-hidden border-none shadow-md group">
                <div className="relative aspect-square">
                  <Image 
                    src={product.imageUrl} 
                    alt={product.name} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-primary/90 backdrop-blur-sm">{product.price.toLocaleString()} ريال</Badge>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-bold text-sm truncate">{product.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 h-8">{product.description}</p>
                  <Button size="sm" className="w-full rounded-lg text-xs" onClick={() => setSelectedProduct(product)}>
                    شراء الآن
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>تأكيد طلب الشراء</DialogTitle>
            <DialogDescription>أدخل عنوان التوصيل لإتمام عملية الشراء من رصيدك.</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 bg-muted p-3 rounded-xl">
                <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0">
                  <Image src={selectedProduct.imageUrl} alt={selectedProduct.name} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{selectedProduct.name}</p>
                  <p className="text-primary font-bold text-lg">{selectedProduct.price.toLocaleString()} ريال</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  عنوان التوصيل (المدينة - الشارع)
                </Label>
                <Input 
                  id="address" 
                  placeholder="مثال: سيئون - حي الوحدة" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSelectedProduct(null)}>إلغاء</Button>
            <Button className="flex-1" onClick={handlePurchase} disabled={!address}>تأكيد وخصم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
