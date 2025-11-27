'use client';

import React, { useState, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

type Advertisement = {
  id: string;
  imageUrl: string;
  linkUrl?: string;
};

export default function AdsManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // We'll manage a single ad with a fixed ID "promo-banner" for simplicity
  const adId = "promo-banner";

  const adsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'advertisements') : null),
    [firestore]
  );
  
  // Fetch all ads, then find the one we care about.
  const { data: ads, isLoading } = useCollection<Advertisement>(adsCollection);

  const ad = ads?.find(a => a.id === adId);

  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (ad) {
      setImageUrl(ad.imageUrl || '');
      setLinkUrl(ad.linkUrl || '');
    }
  }, [ad]);

  const handleSave = () => {
    if (!imageUrl) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال رابط الصورة على الأقل.",
      });
      return;
    }
    
    if (!firestore) return;

    setIsSaving(true);
    
    const adDocRef = doc(firestore, 'advertisements', adId);
    const adData = {
      imageUrl,
      linkUrl,
    };

    try {
      // Use set with merge to create or update the document
      setDocumentNonBlocking(adDocRef, adData, { merge: true });
      
      toast({
        title: "تم الحفظ",
        description: "تم تحديث الإعلان بنجاح.",
      });
    } catch (error) {
       console.error("Error saving advertisement: ", error);
       toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الإعلان.",
      });
    } finally {
        setIsSaving(false);
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
        return (
            <CardContent>
                <div className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </CardContent>
        )
    }

    return (
        <CardContent className="space-y-6">
            <div className="space-y-2">
            <Label htmlFor="imageUrl" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                رابط الصورة
            </Label>
            <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                dir="ltr"
            />
            </div>
            <div className="space-y-2">
            <Label htmlFor="linkUrl" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                رابط الانتقال (اختياري)
            </Label>
            <Input
                id="linkUrl"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/top-up"
                dir="ltr"
            />
            </div>

            {imageUrl && (
                <div className="space-y-2">
                    <Label>معاينة الصورة</Label>
                    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border">
                        <Image src={imageUrl} alt="معاينة الإعلان" fill className="object-cover" />
                    </div>
                </div>
            )}

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
                <Save className="ml-2 h-4 w-4" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
        </CardContent>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="إدارة الإعلانات" />
        <div className="flex-1 overflow-y-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">تعديل الإعلان الترويجي</CardTitle>
            </CardHeader>
            {renderContent()}
          </Card>
        </div>
      </div>
      <Toaster />
    </>
  );
}
