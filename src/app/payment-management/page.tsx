'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

type PaymentMethod = {
  id: string;
  name: string;
  accountNumber: string;
  logoUrl?: string;
};

export default function PaymentManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const methodsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'paymentMethods') : null),
    [firestore]
  );
  const { data: methods, isLoading } = useCollection<PaymentMethod>(methodsCollection);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newMethod, setNewMethod] = useState({ name: '', accountNumber: '', logoUrl: '' });
  const [editingValues, setEditingValues] = useState<{ [key: string]: Partial<PaymentMethod> }>({});

  const handleEdit = (method: PaymentMethod) => {
    setEditingId(method.id);
    setEditingValues({ ...editingValues, [method.id]: { ...method } });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = (id: string) => {
    if (!firestore || !editingValues[id]) return;
    const { name, accountNumber, logoUrl } = editingValues[id];
    if (!name || !accountNumber) {
      toast({ title: "خطأ", description: "الرجاء تعبئة جميع الحقول.", variant: "destructive" });
      return;
    }
    const docRef = doc(firestore, 'paymentMethods', id);
    updateDocumentNonBlocking(docRef, { name, accountNumber, logoUrl });
    setEditingId(null);
    toast({ title: "تم الحفظ", description: "تم تحديث طريقة الدفع بنجاح." });
  };

  const handleValueChange = (id: string, field: keyof PaymentMethod, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'paymentMethods', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "تم الحذف", description: "تم حذف طريقة الدفع بنجاح.", variant: "destructive" });
  };

  const handleAddNew = () => {
    if (newMethod.name && newMethod.accountNumber && firestore && methodsCollection) {
      addDocumentNonBlocking(methodsCollection, newMethod);
      setNewMethod({ name: '', accountNumber: '', logoUrl: '' });
      setIsAdding(false);
      toast({ title: "تمت الإضافة", description: "تمت إضافة طريقة دفع جديدة بنجاح." });
    } else {
      toast({ title: "خطأ", description: "الرجاء تعبئة اسم الحساب ورقم الحساب.", variant: "destructive" });
    }
  };

  const handleNewValueChange = (field: keyof typeof newMethod, value: string) => {
    setNewMethod(prev => ({ ...prev, [field]: value }));
  };

  const getLogoSrc = (url?: string) => {
    if (url && url.trim() !== '') return url;
    return 'https://placehold.co/40x40/f8f8f9/333333?text=?';
  }

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="إدارة طرق الدفع" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className='text-center'>طرق الدفع المتاحة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
                </div>
              ) : (
                methods?.map((method) => (
                  <Card key={method.id} className="p-4">
                    {editingId === method.id ? (
                      <div className="space-y-4">
                        <Label>اسم الحساب</Label>
                        <Input value={editingValues[method.id]?.name || ''} onChange={(e) => handleValueChange(method.id, 'name', e.target.value)} />
                        <Label>رقم الحساب</Label>
                        <Input value={editingValues[method.id]?.accountNumber || ''} onChange={(e) => handleValueChange(method.id, 'accountNumber', e.target.value)} />
                        <Label>رابط شعار الشركة</Label>
                        <Input value={editingValues[method.id]?.logoUrl || ''} onChange={(e) => handleValueChange(method.id, 'logoUrl', e.target.value)} placeholder="اختياري"/>
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={handleCancelEdit}><X className="h-4 w-4" /></Button>
                          <Button size="icon" onClick={() => handleSave(method.id)}><Save className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <Image src={getLogoSrc(method.logoUrl)} alt={method.name} width={40} height={40} className="rounded-full object-contain" />
                          <div>
                            <p className="font-semibold">{method.name}</p>
                            <p className="text-sm text-primary">{method.accountNumber}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(method)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(method.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
              {isAdding && (
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-4">
                    <Label>اسم الحساب الجديد</Label>
                    <Input value={newMethod.name} onChange={(e) => handleNewValueChange('name', e.target.value)} placeholder="مثال: بنك الكريمي" />
                    <Label>رقم الحساب</Label>
                    <Input value={newMethod.accountNumber} onChange={(e) => handleNewValueChange('accountNumber', e.target.value)} placeholder="مثال: 123456789" />
                    <Label>رابط شعار الشركة (اختياري)</Label>
                    <Input value={newMethod.logoUrl} onChange={(e) => handleNewValueChange('logoUrl', e.target.value)} placeholder="https://example.com/logo.png"/>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}><X className="h-4 w-4" /></Button>
                      <Button onClick={handleAddNew}>إضافة</Button>
                    </div>
                  </div>
                </Card>
              )}
            </CardContent>
          </Card>
          {!isAdding && (
            <Button className="w-full" onClick={() => setIsAdding(true)}>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة طريقة دفع جديدة
            </Button>
          )}
        </div>
      </div>
      <Toaster />
    </>
  );
}
