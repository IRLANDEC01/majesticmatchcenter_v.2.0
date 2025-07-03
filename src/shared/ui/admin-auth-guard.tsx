'use client';

import { useSession } from 'next-auth/react';
import { Skeleton } from './skeleton';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Клиентский guard, который показывает скелетон загрузки,
 * пока проверяется сессия администратора.
 */
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 flex gap-12" data-testid="admin-auth-guard-skeleton">
        {/* Скелетон для сайдбара */}
        <aside className="w-64 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-full" />
            </div>
            <div className="pt-4 space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
            </div>
          </div>
        </aside>

        {/* Скелетон для основного контента */}
        <main className="flex-1 py-8">
          <div className="max-w-7xl">
            <Skeleton className="h-10 w-1/3 mb-6" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  // Когда статус 'authenticated' или 'unauthenticated', просто рендерим children.
  // Middleware уже обработал редирект для неавторизованных пользователей.
  return <>{children}</>;
} 