'use client';

import { ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutAction } from '@/lib/actions/auth';

export default function TopBarUserMenu({
  name, email, role, initials,
}: {
  name: string;
  email: string;
  role: string;
  initials: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-surface-container px-2 py-1.5 rounded-lg transition-colors">
        <Avatar className="h-8 w-8 border border-outline-variant">
          <AvatarFallback
            className="bg-tertiary-fixed text-on-tertiary-fixed font-bold"
            style={{ fontSize: '12px' }}
          >
            {initials || 'A'}
          </AvatarFallback>
        </Avatar>
        <div className="text-left hidden sm:block">
          <p className="font-semibold leading-tight text-on-surface" style={{ fontSize: '13px' }}>
            {name}
          </p>
          <p className="text-on-surface-variant uppercase"
            style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
            {role}
          </p>
        </div>
        <ChevronDown size={14} className="text-on-surface-variant" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-3 py-2">
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>My profile</DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left px-2 py-1.5 text-sm hover:bg-surface-container text-destructive rounded-sm"
          >
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
