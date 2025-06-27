import { ReactNode } from 'react';
import AdminSidebar from '@/shared/ui/layout/admin-sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Лейаут админ-панели с сайдбаром
 * Next.js 15.3 + TypeScript
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="container mx-auto px-4 flex gap-12">
      <AdminSidebar />
      <main className="flex-1 py-8">
        <div className="max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
} 