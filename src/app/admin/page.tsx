/**
 * Главная страница админ-панели
 * Next.js 15.3 + TypeScript
 */
import { auth } from '@/../auth';
import { redirect } from 'next/navigation';

interface AdminDashboardPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect('/admin/login?error=unauthorized');
  }
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Панель управления</h1>
      <p className="text-muted-foreground mt-2">
        Обзор ключевых метрик и быстрый доступ к разделам.
      </p>
    </div>
  );
} 