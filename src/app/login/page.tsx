'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div className="flex flex-col justify-between h-screen bg-background p-6 text-foreground">
      <div className="flex-1 flex flex-col justify-center text-center">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-muted-foreground">أهلاً بك</h2>
          <h1 className="text-4xl font-bold text-foreground">تسجيل الدخول</h1>
        </div>

        <form className="space-y-6 text-right">
          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input id="phone" type="tel" dir="ltr" className="text-center" placeholder="770921811" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Input
                id="password"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="ادخل كلمة المرور"
                className="pr-10"
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

          <Button type="submit" className="w-full text-lg font-bold h-12">
            دخول
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

      <footer className="text-center text-xs text-muted-foreground/80 pb-4">
        <p>تم التطوير بواسطة محمد راضي باشادي</p>
      </footer>
    </div>
  );
}
