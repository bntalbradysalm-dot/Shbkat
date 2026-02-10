'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { PromotionalImage } from '@/components/dashboard/promotional-image';

export const dynamic = 'force-dynamic';

const CustomLoader = () => (
  <div className="bg-card/90 p-4 rounded-3xl shadow-2xl flex items-center justify-center w-24 h-24 animate-in zoom-in-95 border border-white/10">
    <div className="relative w-12 h-12">
      <svg
        viewBox="0 0 50 50"
        className="absolute inset-0 w-full h-full animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        <path
          d="M15 25 A10 10 0 0 0 35 25"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M40 15 A15 15 0 0 1 40 35"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-30"
        />
      </svg>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="fixed inset-0 flex flex-col justify-center items-center z-[100] bg-black/20 backdrop-blur-sm">
    <CustomLoader />
  </div>
);

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/login');
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(firestore, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (!docSnap.exists()) {
        const nameParts = (user.displayName || 'مستخدم جديد').trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        await setDoc(userDocRef, {
          id: user.uid,
          displayName: user.displayName || 'مستخدم جديد',
          firstName: firstName,
          lastName: lastName,
          phoneNumber: user.phoneNumber || 'غير محدد',
          email: user.email,
          location: 'غير محدد',
          registrationDate: new Date().toISOString(),
          balance: 0,
          accountType: 'user',
          photoURL: user.photoURL || `https://i.postimg.cc/SNgTrrW2/default-avatar.jpg`
        });
      }
      
      toast({
        title: "نجاح",
        description: "تم تسجيل الدخول بنجاح عبر Google.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'خطأ في تسجيل الدخول',
        description: 'فشل تسجيل الدخول عبر Google. حاول مرة أخرى.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || (!isUserLoading && user)) {
    return <LoadingSpinner />;
  }

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
              <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <Button type="submit" className="w-full text-lg font-bold h-12 rounded-xl" disabled={isLoading}>
              {isLoading ? 'جاري الدخول...' : 'دخول'}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-6">
            <p className="text-muted-foreground">
              ليس لديك حساب؟{' '}
              <a href="/signup" className="font-bold text-primary hover:underline">
                سجل الآن
              </a>
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">أو سجل عبر Google</span>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="p-3 rounded-full border border-border hover:bg-muted transition-colors shadow-sm disabled:opacity-50"
                title="سجل عبر Google"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="32" height="32">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-10.5-5.373-10.5-12c0-6.627,3.873-12,10.5-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-muted-foreground pb-4 pt-10">
          <p>تم التطوير بواسطة محمد راضي باشادي</p>
        </footer>
      </div>
      {isLoading && <LoadingSpinner />}
      <Toaster />
    </>
  );
}
