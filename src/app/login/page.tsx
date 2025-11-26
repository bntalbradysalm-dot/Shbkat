'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

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
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !password) {
      toast({
        variant: 'destructive',
        title: 'خطأ في تسجيل الدخول',
        description: 'الرجاء إدخال رقم الهاتف وكلمة المرور.',
      });
      return;
    }
    
    setIsLoading(true);

    const email = `${phoneNumber.trim()}@shabakat.com`;
    try {
      await signInWithEmailAndPassword(auth, email, password.trim());
      // The onAuthStateChanged listener in the provider will handle the redirect
    } catch (error: any) {
      let description = 'فشل تسجيل الدخول. يرجى التحقق من رقم الهاتف وكلمة المرور.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        description = 'رقم الهاتف أو كلمة المرور غير صحيحة.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'صيغة رقم الهاتف غير صالحة.';
      }
      toast({
        variant: 'destructive',
        title: 'خطأ في تسجيل الدخول',
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || (!isUserLoading && user)) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <>
      <div className="flex flex-col justify-between h-screen bg-background p-6 text-foreground">
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-primary">شبكتي</h1>
            <p className="text-lg text-muted-foreground">محفظتك الرقمية لكل احتياجاتك</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 text-right">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                className="bg-muted focus-visible:ring-primary border-border text-right"
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
                  className="bg-muted focus-visible:ring-primary border-border text-right"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="text-left">
              <a href="#" className="text-sm font-medium text-primary hover:underline">
                نسيت كلمة المرور؟
              </a>
            </div>

            <Button type="submit" className="w-full text-lg font-bold h-12" disabled={isLoading}>
              {isLoading ? 'جاري الدخول...' : 'دخول'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              ليس لديك حساب؟{' '}
              <a href="/signup" className="font-bold text-primary hover:underline">
                سجل الآن
              </a>
            </p>
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
