'use client';

import { ReactNode } from 'react';
import { AdminSidebar, AdminAuthGuard, AuthErrorBoundary } from '@/shared/ui';
import { QueryProvider } from '@/shared/providers';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Лейаут админ-панели с сайдбаром и защитой авторизации
 * Next.js 15.3 + TypeScript + NextAuth.js v5
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <QueryProvider>
      <AuthErrorBoundary>
        <AdminAuthGuard>
          <div className="container mx-auto px-4 flex gap-12">
            <AdminSidebar />
            <main className="flex-1 py-8">
              <div className="max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </AdminAuthGuard>
      </AuthErrorBoundary>
    </QueryProvider>
  );
} 