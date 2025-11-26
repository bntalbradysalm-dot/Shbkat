'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();


  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "خطأ في تسجيل الدخول",
        description: "الرجاء إدخال البريد الإلكتروني وكلمة المرور.",
      });
      return;
    }
    initiateEmailSignIn(auth, email, password);
  };

  if (isUserLoading || (!isUserLoading && user)) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <>
    <div className="flex flex-col justify-between h-screen bg-primary p-6 text-primary-foreground">
      <div className="flex-1 flex flex-col justify-center text-center">
        <div className="mb-10">
          <h1 className="text-4xl font-bold">شبكتي</h1>
          <p className="text-lg text-primary-foreground/80">محفظتك الرقمية لكل احتياجاتك</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 text-right">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input 
              id="email" 
              type="email" 
              dir="ltr" 
              className="text-center bg-background/20 text-white placeholder:text-white/60 border-0 focus-visible:ring-white" 
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Input
                id="password"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="ادخل كلمة المرور"
                dir="ltr"
                className="text-center bg-background/20 text-white placeholder:text-white/60 border-0 focus-visible:ring-white pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
              >
                {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="text-left">
            <a href="#" className="text-sm font-medium text-white hover:underline">
              نسيت كلمة المرور؟
            </a>
          </div>

          <Button type="submit" className="w-full text-lg font-bold h-12 bg-white text-primary hover:bg-white/90">
            دخول
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-white/80">
            ليس لديك حساب؟{' '}
            <a href="/signup" className="font-bold text-white hover:underline">
              سجل الآن
            </a>
          </p>
        </div>
      </div>

      <footer className="text-center text-xs text-primary-foreground/80 pb-4">
        <p>تم التطوير بواسطة محمد راضي باشادي</p>
      </footer>
    </div>
    <Toaster />
    </>
  );
}
