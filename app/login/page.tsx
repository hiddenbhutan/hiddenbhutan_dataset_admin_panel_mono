import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#f5efe4', backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(199,154,58,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(47,96,64,0.06) 0%, transparent 50%)' }}
    >
      <Card className="w-[400px] border-[#c2c8c2] shadow-xl bg-white">
        <CardContent className="p-8">
          <div className="text-center mb-7">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style={{ backgroundColor: '#082619' }}
            >
              <span className="text-[#ffdea3] font-bold" style={{ fontSize: '18px' }}>H</span>
            </div>
            <h1 className="font-bold text-[#1d1c15]" style={{ fontSize: '20px', lineHeight: '28px' }}>HiddenBhutan</h1>
            <p className="text-[#424844] font-semibold" style={{ fontSize: '13px' }}>Admin Panel</p>
            <p className="text-[#727973] mt-1" style={{ fontSize: '14px' }}>Sign in to your account</p>
          </div>

          <Suspense fallback={<div className="h-[220px]" aria-hidden />}>
            <LoginForm />
          </Suspense>

          <div className="border-t border-[#e8e2d7] mt-6 pt-5 text-center">
            <button className="font-medium hover:underline" style={{ color: '#c79a3a', fontSize: '13px' }}>
              Forgot your password?
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
