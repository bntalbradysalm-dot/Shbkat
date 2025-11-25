'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';

const initialRenewalOptions = [
  { id: 1, title: 'تجديد شهرين', price: 3000 },
  { id: 2, title: 'تجديد 4 شهور', price: 6000 },
  { id: 3, title: 'تجديد 6 شهور', price: 9000 },
  { id: 4, title: 'تجديد سنة', price: 15000 },
];

export default function AlwadiManagementPage() {
  const [options, setOptions] = useState(initialRenewalOptions);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const handleEdit = (option: typeof initialRenewalOptions[0]) => {
    setEditingId(option.id);
    setCurrentTitle(option.title);
    setCurrentPrice(option.price.toString());
  };

  const handleCancel = () => {
    setEditingId(null);
    setCurrentTitle('');
    setCurrentPrice('');
  };

  const handleSave = (id: number) => {
    setOptions(
      options.map((opt) =>
        opt.id === id ? { ...opt, title: currentTitle, price: Number(currentPrice) } : opt
      )
    );
    handleCancel();
  };

  const handleDelete = (id: number) => {
    setOptions(options.filter((opt) => opt.id !== id));
  };
  
  const handleAddNew = () => {
    if (newTitle && newPrice) {
      const newOption = {
        id: Math.max(...options.map(o => o.id), 0) + 1,
        title: newTitle,
        price: Number(newPrice),
      };
      setOptions([...options, newOption]);
      setNewTitle('');
      setNewPrice('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="إدارة منظومة الوادي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className='text-center'>خيارات التجديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.map((option) => (
              <Card key={option.id} className="p-4">
                {editingId === option.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`title-${option.id}`}>اسم الخيار</Label>
                      <Input
                        id={`title-${option.id}`}
                        value={currentTitle}
                        onChange={(e) => setCurrentTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`price-${option.id}`}>السعر</Label>
                      <Input
                        id={`price-${option.id}`}
                        type="number"
                        value={currentPrice}
                        onChange={(e) => setCurrentPrice(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="icon" onClick={() => handleSave(option.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{option.title}</p>
                      <p className="text-sm text-primary">{option.price.toLocaleString('en-US')} ريال</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(option)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(option.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
             {isAdding && (
              <Card className="p-4 bg-muted/50">
                 <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-title">اسم الخيار الجديد</Label>
                      <Input
                        id="new-title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="مثال: تجديد 3 شهور"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-price">السعر</Label>
                      <Input
                        id="new-price"
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="مثال: 4500"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleAddNew}>
                        إضافة
                      </Button>
                    </div>
                  </div>
              </Card>
            )}
          </CardContent>
        </Card>
        
        {!isAdding && (
            <Button className="w-full" onClick={() => setIsAdding(true)}>
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة خيار جديد
            </Button>
        )}
      </div>
    </div>
  );
}
