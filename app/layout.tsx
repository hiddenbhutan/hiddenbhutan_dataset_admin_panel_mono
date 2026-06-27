import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import Shell from '@/components/Shell';
import TopBar from '@/components/TopBar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    template: '%s — HiddenBhutan Admin',
    default: 'Dashboard — HiddenBhutan Admin',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased" style={{ fontFamily: 'Inter, sans-serif' }}>
        <TooltipProvider>
          {/* TopBar is async server-rendered; Shell is client for usePathname. */}
          <Shell topBar={<TopBar />}>{children}</Shell>
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
