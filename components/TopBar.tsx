import { Bell, HelpCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getCurrentAdminUserOrNull } from '@/lib/auth';
import TopBarUserMenu from './TopBarUserMenu';
import TopBarTitle from './TopBarTitle';

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Spec-matching TopBar:
 *   h-64px · sticky · surface-container-low background · outline-variant border-b
 *   Left:  active section title (derived from pathname) + global search
 *   Right: notifications · help · divider · user menu (avatar + name + role)
 */
export default async function TopBar() {
  const user = await getCurrentAdminUserOrNull();

  return (
    <header
      className="h-16 sticky top-0 z-40 flex items-center justify-between px-6 flex-shrink-0 border-b border-outline-variant bg-surface-container-low"
    >
      <div className="flex items-center gap-6 min-w-0">
        <TopBarTitle />
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={15} />
          <Input
            placeholder="Search routes, birds, places… (⌘K)"
            className="pl-10 h-9 border border-outline-variant rounded-lg bg-surface-container-highest focus-visible:ring-2 focus-visible:ring-on-primary-fixed-variant"
            style={{ fontSize: '13px', lineHeight: '18px' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-on-surface-variant hover:bg-surface-container hover:text-primary">
          <Bell size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-on-surface-variant hover:bg-surface-container hover:text-primary">
          <HelpCircle size={16} />
        </Button>
        <div className="w-px h-6 bg-outline-variant" />
        {user && (
          <TopBarUserMenu
            name={user.full_name}
            email={user.email}
            role={user.role}
            initials={initialsFor(user.full_name)}
          />
        )}
      </div>
    </header>
  );
}
