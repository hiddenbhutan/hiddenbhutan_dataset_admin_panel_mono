import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getCurrentAdminUserOrNull } from '@/lib/auth';

export const metadata: Metadata = { title: 'Settings' };

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  admin:     { label: 'Admin',     bg: '#ffdea3', color: '#261900' },
  publisher: { label: 'Publisher', bg: '#c9ead6', color: '#1a4d2a' },
  reviewer:  { label: 'Reviewer',  bg: '#fdefd8', color: '#7a4a10' },
  editor:    { label: 'Editor',    bg: '#d6e8f0', color: '#2c5a70' },
};

export default async function SettingsPage() {
  const me = await getCurrentAdminUserOrNull();
  if (!me) redirect('/login');
  const role = ROLE_BADGE[me.role] ?? ROLE_BADGE.editor;

  const env = process.env.NODE_ENV ?? 'unknown';
  const dbUrlHost = (() => {
    try { return process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : null; }
    catch { return null; }
  })();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-bold text-[#1d1c15]" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>Settings</h1>
        <p className="text-[#424844] mt-1" style={{ fontSize: '14px' }}>Account &amp; environment</p>
      </div>

      {/* My account — wired to the actually signed-in admin user */}
      <Card className="border-[#c2c8c2] bg-white">
        <CardHeader className="pb-3">
          <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>My account</CardTitle>
          <p className="text-[#727973]" style={{ fontSize: '12px' }}>Read from admin.users for the signed-in session.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-[#424844] mb-1 block">Display name</Label>
            <Input readOnly value={me.full_name} className="bg-[#f9f3e8] border-[#c2c8c2] h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-[#424844] mb-1 block">Email</Label>
            <Input readOnly value={me.email} className="bg-[#f9f3e8] border-[#c2c8c2] h-9 text-sm font-mono" />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-[#424844]">Role</Label>
            <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: role.bg, color: role.color, fontSize: '10px' }}>
              {role.label}
            </span>
            <span className="text-[#727973]" style={{ fontSize: '11px' }}>admin.users.id = {me.id}</span>
          </div>
          <Separator />
          <div className="rounded p-3 border border-dashed border-[#c79a3a]" style={{ backgroundColor: '#fff8e8' }}>
            <p className="font-semibold text-[#7a4a10]" style={{ fontSize: '12px' }}>Profile edits aren&apos;t wired yet</p>
            <p className="text-[#7a4a10] mt-1" style={{ fontSize: '11px' }}>
              Display-name and password-change actions need an action layer on top of
              <code className="ml-1">admin.users</code> (with bcrypt hashing for passwords).
              Until then, update the row in Postgres directly.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Environment — surface real process env */}
      <Card className="border-[#c2c8c2] bg-white">
        <CardHeader className="pb-3">
          <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-[#424844]">NODE_ENV</Label>
            <span className="px-2 py-0.5 rounded font-bold uppercase font-mono"
              style={{
                backgroundColor: env === 'production' ? '#c9ead6' : env === 'development' ? '#fdefd8' : '#e8e2d7',
                color:           env === 'production' ? '#1a4d2a' : env === 'development' ? '#7a4a10' : '#424844',
                fontSize: '10px',
              }}>
              {env}
            </span>
          </div>
          {dbUrlHost && (
            <div>
              <Label className="text-xs text-[#424844] mb-1 block">Database host</Label>
              <Input readOnly value={dbUrlHost} className="bg-[#f9f3e8] border-[#c2c8c2] h-9 text-sm font-mono" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature flags — out of scope */}
      <Card className="border-[#c2c8c2] bg-white">
        <CardHeader className="pb-3">
          <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Feature flags</CardTitle>
          <p className="text-[#727973]" style={{ fontSize: '12px' }}>Schema has no settings table — out of scope here.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded p-3 border border-dashed border-[#c2c8c2]" style={{ backgroundColor: '#f9f3e8' }}>
            <p className="text-[#727973]" style={{ fontSize: '12px' }}>
              Feature flags would need a dedicated <code>admin.feature_flag</code> table
              (or equivalent) plus an action layer to toggle them. Add the table in a
              future migration if/when product needs it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
