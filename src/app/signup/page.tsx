'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

const locations = [
  'سيئون',
  'شبام',
  'الغرفة',
  'تريم',
  'ساة',
  'القطن',
  'الحوطة',
  'وادي بن علي',
  'العقاد',
  'وادي عمد',
  'وادي العين',
  'بور',
  'تاربة',
  'الخشعة',
];

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 4) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال الاسم الرباعي الكامل.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين.",
      });
      return;
    }
    if (!fullName || !phoneNumber || !location) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة جميع الحقول.",
          });
        return;
    }

    setIsLoading(true);
    try {
      // Using phone number to create an email for Firebase Auth
      const email = `${phoneNumber.trim()}@shabakat.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile with full name
      if (user) {
        await updateProfile(user, {
          displayName: fullName.trim(),
        });

        // Create user document in Firestore
        const userRef = doc(firestore, 'users', user.uid);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        await setDoc(userRef, {
          id: user.uid,
          displayName: fullName.trim(),
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber.trim(),
          email: user.email,
          location: location,
          registrationDate: new Date().toISOString(),
          balance: 0,
        });
      }

      toast({
        title: "نجاح",
        description: "تم إنشاء حسابك بنجاح! جاري توجيهك...",
      });

      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error: any) {
      let errorMessage = "حدث خطأ غير متوقع أثناء إنشاء الحساب.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'رقم الهاتف هذا مستخدم بالفعل.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'رقم الهاتف غير صالح.';
      }
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء الحساب",
        description: errorMessage,
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-screen bg-background text-foreground">
        <SimpleHeader title="سجل الآن" />
        <div className="flex-1 flex flex-col justify-center text-center px-6">
          <div className="mb-8 flex flex-col items-center">
             <Image 
                src="https://i.postimg.cc/XNhdQKqs/44.png" 
                alt="Shabakat Wallet Logo" 
                width={100} 
                height={100} 
                className="object-contain mb-4"
            />
            <h1 className="text-3xl font-bold text-primary">انشاء حساب جديد</h1>
            <p className="text-md text-muted-foreground mt-2">
              ادخل معلوماتك لإنشاء حساب جديد
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الرباعي الكامل</Label>
              <Input
                id="fullName"
                type="text"
                className="bg-muted focus-visible:ring-primary border-border"
                placeholder="ادخل اسمك الكامل"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                className="bg-muted focus-visible:ring-primary border-border text-right"
                placeholder="7xxxxxxxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={9}
                minLength={9}
                required
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تاكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  placeholder="أعد إدخال كلمة المرور"
                  className="bg-muted focus-visible:ring-primary border-border text-right"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {isConfirmPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">موقعك</Label>
              <Select onValueChange={setLocation} value={location} dir="rtl">
                <SelectTrigger className="w-full bg-muted focus:ring-primary border-border">
                  <SelectValue placeholder="اختر موقعك" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full text-lg font-bold h-12 mt-6" disabled={isLoading}>
              {isLoading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
            </Button>
          </form>
        </div>
      </div>
      <Toaster />
    </>
  );
}
