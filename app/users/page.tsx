import type { Metadata } from 'next';
import { getAdminUsers, getAdminUserCounts } from '@/lib/db';
import type { AdminRole } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';

export const metadata: Metadata = { title: 'Users' };

const ROLE_BADGE: Record<AdminRole, { label: string; bg: string; color: string }> = {
  admin:     { label: 'Admin',     bg: '#ffdea3', color: '#261900' },
  publisher: { label: 'Publisher', bg: '#c9ead6', color: '#1a4d2a' },
  reviewer:  { label: 'Reviewer',  bg: '#fdefd8', color: '#7a4a10' },
  editor:    { label: 'Editor',    bg: '#d6e8f0', color: '#2c5a70' },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1)          return 'Just now';
  if (diffMin < 60)         return `${diffMin}m ago`;
  if (diffMin < 60 * 24)    return `${Math.round(diffMin / 60)}h ago`;
  if (diffMin < 60 * 24 * 7) return `${Math.round(diffMin / 60 / 24)}d ago`;
  return d.toISOString().slice(0, 10);
}

export default async function UsersPage() {
  const [users, counts] = await Promise.all([
    getAdminUsers(),
    getAdminUserCounts(),
  ]);

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-bold text-[#1d1c15]" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>Users</h1>
          <p className="text-[#424844] mt-1" style={{ fontSize: '14px' }}>
            {counts.total} member{counts.total === 1 ? '' : 's'} · {counts.active} active · {counts.admin} admin · {counts.publisher} publisher · {counts.reviewer} reviewer · {counts.editor} editor
          </p>
        </div>
        <Button disabled title="User CRUD action layer not wired yet"
          className="gap-2 opacity-50 cursor-not-allowed"
          style={{ backgroundColor: '#304d3e', color: '#ffdea3', border: 'none' }}>
          <Plus size={15} /> Invite user
        </Button>
      </div>

      {/* Stub note — be honest about what's wired. */}
      <div className="rounded p-3 border border-[#c2c8c2]" style={{ backgroundColor: '#fff8e8' }}>
        <p className="text-[#7a4a10]" style={{ fontSize: '12px' }}>
          Read-only view. Invite / change-role / deactivate / delete need an action layer
          (writes to <code>admin.users</code> + password-hashing). For now manage users via
          the database directly.
        </p>
      </div>

      <Card className="border-[#c2c8c2] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead style={{ backgroundColor: '#ede8dd' }}>
              <tr className="border-b border-[#c2c8c2]">
                {['User', 'Role', 'Status', 'Last login', 'Joined'].map(h => (
                  <th key={h} className="px-5 py-3 font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e2d7]">
              {users.map(user => {
                const role = ROLE_BADGE[user.role];
                return (
                  <tr key={user.id} className="hover:bg-[#f3ede2] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: '#f3ede2', color: '#304d3e' }}>
                            {initials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-[#1d1c15]" style={{ fontSize: '14px' }}>{user.full_name}</p>
                          <p className="text-[#727973]" style={{ fontSize: '12px' }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: role.bg, color: role.color, fontSize: '10px' }}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {user.is_active ? (
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#c9ead6', color: '#1a4d2a', fontSize: '10px' }}>Active</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#e8d6d6', color: '#7a1a1a', fontSize: '10px' }}>Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#424844]" style={{ fontSize: '13px' }}>{formatLastLogin(user.last_login_at)}</td>
                    <td className="px-5 py-3 text-[#424844] font-mono" style={{ fontSize: '12px' }}>{formatDate(user.created_at)}</td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-[#727973]" style={{ fontSize: '14px' }}>
                  admin.users is empty. Insert at least one user via the database to enable login.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
