import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Button } from '@/shared/ui/button';

/**
 * Глобальный хедер для всех страниц
 * Next.js 15.3 + TypeScript
 */
const GlobalHeader = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <span className="font-bold">Majestic Match Center</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center">
            <Button asChild variant="ghost">
              <Link href="/admin">
                админ-панель
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader; 