'use client';

import { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Send } from 'lucide-react';

export default function SendNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSend = async () => {
    if (!title || !message || !firestore) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال عنوان ورسالة للإشعار.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const notificationsCollection = collection(firestore, 'notifications');
      await addDocumentNonBlocking(notificationsCollection, {
        title,
        body: message,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "نجاح",
        description: "تم إرسال الإشعار بنجاح.",
      });
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error("Error sending notification: ", error);
      toast({
        variant: "destructive",
        title: "خطأ في الإرسال",
        description: "لم يتم إرسال الإشعار. الرجاء المحاولة مرة أخرى.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="إرسال إشعارات" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">إنشاء إشعار جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان الإشعار</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: عرض جديد!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">نص الإشعار</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب محتوى رسالة الإشعار هنا..."
                  rows={5}
                />
              </div>
              <Button onClick={handleSend} disabled={isLoading} className="w-full">
                {isLoading ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                <Send className="mr-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster />
    </>
  );
}
