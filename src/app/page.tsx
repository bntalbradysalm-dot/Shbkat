'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LoadingSpinner = () => (
  <div className="flex flex-col justify-center items-center h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <Image
        src="https://i.postimg.cc/XNhdQKqs/44.png"
        alt="logo"
        width={160}
        height={160}
        className="object-contain"
      />
      <Loader2 className="h-6 w-6 animate-spin text-black dark:text-white" />
    </div>
  </div>
);

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricUser, setBiometricUser] = useState<{ phone: string, name: string } | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    // Check for user who enabled biometric login on this device
    const bioUserPhone = localStorage.getItem('biometricUserPhone');
    const bioUserName = localStorage.getItem('biometricUserName');
    if (bioUserPhone && bioUserName) {
      setBiometricUser({ phone: bioUserPhone, name: bioUserName });
    }
  }, []);

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

  const handleBiometricLogin = () => {
    // This is a simulation. A real implementation would use WebAuthn's
    // navigator.credentials.get() and verify the result on a server.
    if (biometricUser) {
        setShowBiometricPrompt(true);
    }
  };

  const handleBiometricConfirm = () => {
     if (biometricUser) {
        // Simulate a successful login by filling the fields and logging in
        setPhoneNumber(biometricUser.phone);
        // We can't know the password, so we show a message.
        // In a real app, the biometric assertion would be sent to a server
        // which would log the user in without a password.
        setShowBiometricPrompt(false);
        toast({
            title: "محاكاة ناجحة",
            description: "في التطبيق الحقيقي، سيتم تسجيل دخولك الآن. لأغراض العرض، يرجى إدخال كلمة المرور.",
        });
     }
  };

  if (isUserLoading || (!isUserLoading && user)) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className="flex flex-col justify-between h-screen bg-background p-6 text-foreground">
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="mb-10 flex flex-col items-center">
             <Image 
                  src="https://i.postimg.cc/XNhdQKqs/44.png" 
                  alt="Shabakat Wallet Logo" 
                  width={140} 
                  height={140} 
                  className="object-contain"
                  priority
              />
              <div className="text-center mt-4">
                <h1 className="text-2xl font-bold">أهلاً بك</h1>
                <p className="text-muted-foreground">تسجيل الدخول</p>
              </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 text-right">
            {biometricUser && (
                <Button type="button" variant="outline" className="w-full h-12" onClick={handleBiometricLogin}>
                    <Fingerprint className="ml-2 h-5 w-5 text-primary" />
                    الدخول باستخدام البصمة
                </Button>
            )}

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

      <AlertDialog open={showBiometricPrompt} onOpenChange={setShowBiometricPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-center">
            <Fingerprint className="h-16 w-16 text-primary" />
            <AlertDialogTitle>تسجيل الدخول بالبصمة</AlertDialogTitle>
            <AlertDialogDescription>
              الرجاء استخدام بصمة الإصبع للدخول كـ {biometricUser?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-center">
            {/* In a real app, this would be handled by browser APIs. We simulate a success button. */}
            <AlertDialogAction onClick={handleBiometricConfirm}>محاكاة بصمة ناجحة</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
