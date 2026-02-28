
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
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Eye, EyeOff, User, Phone, Lock, MapPin, Crown, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const locations = [
  'سيئون', 'شبام', 'الغرفة', 'تريم', 'ساة', 'القطن', 'الحوطة', 
  'وادي بن علي', 'العقاد', 'وادي عمد', 'وادي العين', 'بور', 'تاربة', 'الخشعة'
];

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('');
  const [accountType, setAccountType] = useState('user');
  const [networkName, setNetworkName] = useState('');
  const [networkLocation, setNetworkLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 4) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال الاسم الرباعي الكامل." });
      return;
    }

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "خطأ", description: "كلمتا المرور غير متطابقتين." });
      return;
    }

    setIsLoading(true);
    try {
      const email = `${phoneNumber.trim()}@shabakat.com`;
      const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
      const user = userCredential.user;

      if (user) {
        await updateProfile(user, { displayName: fullName.trim() });
        const batch = writeBatch(firestore!);
        const userRef = doc(firestore!, 'users', user.uid);
        
        batch.set(userRef, {
          id: user.uid,
          displayName: fullName.trim(),
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' '),
          phoneNumber: phoneNumber.trim(),
          email: user.email,
          location: location,
          registrationDate: new Date().toISOString(),
          balance: 0,
          accountType: accountType,
          photoURL: `https://i.postimg.cc/SNgTrrW2/default-avatar.jpg`
        });
        
        if (accountType === 'network-owner') {
          const networkRef = doc(collection(firestore!, 'networks'));
          batch.set(networkRef, {
            name: networkName,
            location: networkLocation,
            ownerId: user.uid,
            phoneNumber: phoneNumber.trim()
          });
        }
        await batch.commit();
      }

      toast({ title: "تم إنشاء الحساب", description: "مرحباً بك في ستار موبايل!" });
      setTimeout(() => router.push('/'), 1500);
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ", description: error.message || "فشل إنشاء الحساب." });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-mesh-gradient text-white pb-10">
        
        <header className="p-4 flex items-center justify-between animate-in fade-in duration-500">
            <Link href="/" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <ChevronRight className="h-5 w-5" />
            </Link>
            <h1 className="font-black text-base text-white">انشاء حساب</h1>
            <div className="w-9" />
        </header>

        <div className="px-6 flex flex-col items-center">
          <div className="my-6 text-center animate-in zoom-in duration-700">
             <div className="relative w-16 h-16 mx-auto mb-3">
                <div className="relative w-full h-full overflow-hidden rounded-[24px] border-4 border-white/30 shadow-2xl bg-white p-1">
                    <Image src="https://i.postimg.cc/VvxBNG2N/Untitled-1.jpg" alt="Logo" fill className="object-cover" />
                </div>
             </div>
            <h2 className="text-lg font-black text-white">ابدأ رحلتك معنا</h2>
            <p className="text-white/70 text-[10px] font-bold mt-1">سجل بياناتك للانضمام لعائلة ستار موبايل</p>
          </div>

          <form onSubmit={handleSignup} className="w-full space-y-3.5 animate-in slide-in-from-bottom-8 duration-1000">
            
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black mr-3 text-white uppercase">الاسم الرباعي الكامل</Label>
              <div className="relative group">
                <Input
                  className="h-11 bg-white/10 border-white/20 text-white rounded-[18px] focus-visible:ring-white/40 pr-11 text-sm"
                  placeholder="محمد علي حسن أحمد"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 group-focus-within:text-white transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black mr-3 text-white uppercase">رقم الهاتف</Label>
              <div className="relative group">
                <Input
                  type="tel"
                  className="h-11 bg-white/10 border-white/20 text-white rounded-[18px] focus-visible:ring-white/40 pr-11 text-center font-bold text-sm"
                  placeholder="7xxxxxxxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={9}
                  required
                />
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 group-focus-within:text-white transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black mr-3 text-white uppercase">كلمة المرور</Label>
                    <div className="relative group">
                        <Input
                            type={isPasswordVisible ? 'text' : 'password'}
                            className="h-11 bg-white/10 border-white/20 text-white rounded-[18px] focus-visible:ring-white/40 pr-4 pl-4 text-sm"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black mr-3 text-white uppercase">تأكيد المرور</Label>
                    <div className="relative group">
                        <Input
                            type={isPasswordVisible ? 'text' : 'password'}
                            className="h-11 bg-white/10 border-white/20 text-white rounded-[18px] focus-visible:ring-white/40 pr-4 pl-4 text-sm"
                            placeholder="********"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black mr-3 text-white uppercase">الموقع</Label>
              <Select onValueChange={setLocation} value={location} dir="rtl">
                <SelectTrigger className="h-11 bg-white/10 border-white/20 text-white rounded-[18px] focus:ring-white/40 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-white/60" />
                    <SelectValue placeholder="اختر مدينتك" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc} className="rounded-xl">{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black mr-3 text-white uppercase">نوع الحساب</Label>
              <Select onValueChange={setAccountType} value={accountType} dir="rtl">
                <SelectTrigger className="h-11 bg-white/10 border-white/20 text-white rounded-[18px] focus:ring-white/40 text-sm">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-white/60" />
                    <SelectValue placeholder="اختر نوع الحساب" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="user" className="rounded-xl">مستخدم عادي</SelectItem>
                  <SelectItem value="network-owner" className="rounded-xl">صاحب شبكة واي فاي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {accountType === 'network-owner' && (
              <div className="space-y-3 pt-2 animate-in fade-in duration-500 bg-white/5 p-4 rounded-[24px] border border-white/10">
                 <div className="space-y-1.5">
                    <Label className="text-[9px] font-black mr-3 text-white">اسم شبكتك التجارية</Label>
                    <Input className="h-10 bg-white/10 border-white/10 text-white rounded-xl text-sm" value={networkName} onChange={(e) => setNetworkName(e.target.value)} placeholder="مثال: شبكة الخير" />
                 </div>
                 <div className="space-y-1.5">
                    <Label className="text-[9px] font-black mr-3 text-white">موقع الشبكة</Label>
                    <Input className="h-10 bg-white/10 border-white/10 text-white rounded-xl text-sm" value={networkLocation} onChange={(e) => setNetworkLocation(e.target.value)} placeholder="مثال: سيئون - السوق" />
                 </div>
              </div>
            )}

            <div className="pt-2">
                <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-black bg-white text-primary hover:bg-white/90 rounded-[20px] shadow-xl transition-all active:scale-95" 
                    disabled={isLoading}
                >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'إنشاء حساب جديد'}
                </Button>
            </div>
          </form>
        </div>
      </div>
      <Toaster />
    </>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
