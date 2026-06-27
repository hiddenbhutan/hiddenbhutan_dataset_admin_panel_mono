'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

/**
 * Spec layout: fixed 260px sidebar + fixed 64px top bar + scrollable main.
 * Login page renders without chrome via pathname check.
 */
export default function Shell({
  children,
  topBar,
}: {
  children: React.ReactNode;
  topBar: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === '/login') return <>{children}</>;
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-[260px] flex flex-col min-h-screen">
        {topBar}
        {/* spec: container-padding 24px around main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
