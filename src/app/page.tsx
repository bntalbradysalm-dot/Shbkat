
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { PromotionalImage } from '@/components/dashboard/promotional-image';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

const CustomLoader = () => (
  <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-700">
    <div className="relative w-28 h-28 overflow-hidden rounded-[32px] border-4 border-white/30 shadow-2xl bg-white p-1">
        <Image 
            src="https://i.postimg.cc/VvxBNG2N/Untitled-1.jpg" 
            alt="Star Mobile Logo" 
            fill
            className="object-cover"
            priority
        />
    </div>
    <div className="mt-8">
        <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
    </div>
  </div>
);

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ في الاتصال', 
        description: 'تحذير: لم يتم اكتشاف إعدادات Firebase. تأكد من ضبط الـ Env Variables في Vercel.' 
      });
      return;
    }

    if (!phoneNumber || !password) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال رقم الهاتف وكلمة المرور.' });
      return;
    }
    
    setIsLoading(true);
    const email = `${phoneNumber.trim()}@shabakat.com`;
    try {
      await signInWithEmailAndPassword(auth, email, password.trim());
    } catch (error: any) {
      console.error("Login error:", error);
      toast({ variant: 'destructive', title: 'فشل الدخول', description: 'رقم الهاتف أو كلمة المرور غير صحيحة.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || user) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-mesh-gradient z-[9999]">
      <CustomLoader />
    </div>
  );

  return (
    <>
      <div className="flex flex-col justify-between h-screen bg-background p-6 text-foreground">
        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-8">
             <PromotionalImage disableLink />
              <div className="text-center mt-6">
                <h1 className="text-2xl font-bold">أهلاً بك</h1>
                <p className="text-muted-foreground">سجل دخولك للبدء</p>
              </div>
          </div>

          {!auth && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl mb-6 text-destructive text-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>تحذير: لم يتم اكتشاف إعدادات Firebase. تأكد من ضبط الـ Env Variables في Vercel.</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 text-right">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                className="bg-muted focus-visible:ring-primary border-border text-right rounded-xl"
                placeholder="7xxxxxxxx"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  placeholder="ادخل كلمة المرور"
                  className="bg-muted focus-visible:ring-primary border-border text-right rounded-xl"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full text-lg font-bold h-12 rounded-xl" disabled={isLoading}>
              {isLoading ? 'جاري الدخول...' : 'دخول'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">ليس لديك حساب؟ <Link href="/signup" className="font-bold text-primary hover:underline">سجل الآن</Link></p>
          </div>
        </div>
        <footer className="text-center text-xs text-muted-foreground pb-4">
          <p>تم التطوير بواسطة محمد راضي باشادي</p>
        </footer>
      </div>
      <Toaster />
    </>
  );
}
