'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from '@/lib/actions/auth';

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await loginAction(formData);
      if (res.ok) {
        toast.success('Signed in');
        const next = search?.get('next');
        router.replace(next && next.startsWith('/') ? next : '/');
        router.refresh();
      } else {
        setErrors(res.errors ?? {});
        toast.error(res.message ?? 'Login failed');
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <Label className="text-xs text-[#424844] mb-1 block">Email address</Label>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@hiddenbhutan.bt"
          defaultValue="admin@trekbhutan.local"
          className="border-[#c2c8c2] h-10 text-sm focus-visible:ring-[#304d3e]"
        />
        {errors.email && <p className="mt-1.5 text-[#93000a] font-medium" style={{ fontSize: '11px' }}>{errors.email}</p>}
      </div>
      <div>
        <Label className="text-xs text-[#424844] mb-1 block">Password</Label>
        <div className="relative">
          <Input
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="border-[#c2c8c2] h-10 text-sm pr-10 focus-visible:ring-[#304d3e]"
          />
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#727973] hover:text-[#424844]"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p className="mt-1.5 text-[#93000a] font-medium" style={{ fontSize: '11px' }}>{errors.password}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full h-10 font-semibold text-sm rounded-lg flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#082619', color: '#ffdea3' }}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
