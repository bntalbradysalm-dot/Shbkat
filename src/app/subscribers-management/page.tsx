'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PlusCircle,
  Trash2,
  Edit,
  Save,
  X,
  Search,
  User,
  CreditCard,
  FileUp,
} from 'lucide-react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Subscriber = {
  id: string; // Card number
  name: string;
};

export default function SubscribersManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const subscribersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'subscribers') : null),
    [firestore]
  );
  const { data: subscribers, isLoading } =
    useCollection<Subscriber>(subscribersCollection);

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkData, setBulkData] = useState('');

  const filteredSubscribers = useMemo(() => {
    if (!subscribers) return [];
    return subscribers.filter(
      (sub) =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.id.includes(searchTerm)
    );
  }, [subscribers, searchTerm]);

  const handleEdit = (subscriber: Subscriber) => {
    setEditingId(subscriber.id);
    setEditingName(subscriber.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSave = (id: string) => {
    if (!firestore || !editingName) return;
    const docRef = doc(firestore, 'subscribers', id);
    setDocumentNonBlocking(docRef, { name: editingName }, { merge: true });
    toast({ title: 'تم الحفظ', description: 'تم تحديث اسم المشترك بنجاح.' });
    handleCancelEdit();
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'subscribers', id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'تم الحذف',
      description: 'تم حذف المشترك بنجاح.',
      variant: 'destructive',
    });
  };

  const handleAddNew = () => {
    if (newName && newCardNumber && firestore) {
      const docRef = doc(firestore, 'subscribers', newCardNumber);
      setDocumentNonBlocking(docRef, { name: newName }, { merge: false });
      setNewName('');
      setNewCardNumber('');
      setIsAdding(false);
      toast({
        title: 'تمت الإضافة',
        description: 'تمت إضافة مشترك جديد بنجاح.',
      });
    } else {
      toast({
        title: 'خطأ',
        description: 'الرجاء تعبئة جميع الحقول.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkData || !firestore) {
      toast({ title: "لا توجد بيانات", description: "الرجاء لصق البيانات أولاً.", variant: "destructive" });
      return;
    }

    const lines = bulkData.trim().split('\n');
    if (lines.length === 0) {
      toast({ title: "بيانات فارغة", description: "مربع النص فارغ.", variant: "destructive" });
      return;
    }

    const batch = writeBatch(firestore);
    let processedCount = 0;
    
    lines.forEach(line => {
      const parts = line.split(/[,\t]/); // Split by comma or tab
      if (parts.length >= 2) {
        const cardNumber = parts[0].trim();
        const name = parts.slice(1).join(' ').trim();
        if (cardNumber && name) {
          const docRef = doc(firestore, 'subscribers', cardNumber);
          batch.set(docRef, { name: name });
          processedCount++;
        }
      }
    });

    if(processedCount === 0) {
      toast({ title: "صيغة غير صحيحة", description: "لم يتم العثور على بيانات صالحة. تأكد من أن كل سطر يحتوي على `رقم الكرت,الاسم`.", variant: "destructive" });
      return;
    }

    try {
      await batch.commit();
      toast({ title: "نجاح", description: `تمت معالجة وإضافة/تحديث ${processedCount} مشترك بنجاح.` });
      setBulkData('');
      setIsBulkUploading(false);
    } catch (error) {
      console.error("Bulk upload failed: ", error);
      toast({ title: "فشل الرفع", description: "حدث خطأ أثناء رفع البيانات.", variant: "destructive" });
    }

  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="إدارة المشتركين" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="البحث بالاسم أو رقم الكرت..."
              className="w-full pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                قائمة المشتركين ({filteredSubscribers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredSubscribers.length > 0 ? (
                filteredSubscribers.map((sub) => (
                  <Card key={sub.id} className="p-4">
                    {editingId === sub.id ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`name-${sub.id}`}>اسم المشترك</Label>
                          <Input
                            id={`name-${sub.id}`}
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="icon" onClick={() => handleSave(sub.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{sub.name}</p>
                          <p className="text-sm text-primary dark:text-primary-foreground">
                            {sub.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(sub)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من رغبتك في حذف المشترك "{sub.name}"؟
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(sub.id)}>
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  لا يوجد مشتركين لعرضهم.
                </p>
              )}
            </CardContent>
          </Card>

          {isAdding && (
            <Card className="p-4 bg-muted/50">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-card" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> رقم الكرت
                  </Label>
                  <Input
                    id="new-card"
                    value={newCardNumber}
                    onChange={(e) => setNewCardNumber(e.target.value)}
                    placeholder="ادخل رقم الكرت"
                  />
                </div>
                <div>
                  <Label htmlFor="new-name" className="flex items-center gap-2">
                    <User className="w-4 h-4" /> اسم المشترك الجديد
                  </Label>
                  <Input
                    id="new-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="ادخل اسم المشترك"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleAddNew}>إضافة</Button>
                </div>
              </div>
            </Card>
          )}

          {isBulkUploading && (
            <Card className="p-4 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-center text-base">رفع دفعة واحدة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground text-center">
                  الصق البيانات هنا. يجب أن يكون كل مشترك في سطر جديد بالصيغة: <br />
                  <code className="bg-background p-1 rounded-md">رقم_الكرت,الاسم</code>
                </p>
                <Textarea
                    value={bulkData}
                    onChange={e => setBulkData(e.target.value)}
                    rows={10}
                    placeholder={`71000001,محمد راضي باشادي\n71000002,علي عبدالله`}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsBulkUploading(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleBulkUpload}>رفع البيانات</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isAdding && !isBulkUploading && (
            <div className="grid grid-cols-2 gap-2">
                <Button className="w-full" onClick={() => setIsAdding(true)}>
                    <PlusCircle className="ml-2 h-4 w-4" />
                    إضافة مشترك
                </Button>
                 <Button className="w-full" variant="outline" onClick={() => setIsBulkUploading(true)}>
                    <FileUp className="ml-2 h-4 w-4" />
                    رفع دفعة واحدة
                </Button>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </>
  );
}

