import { redirect } from 'next/navigation';
import { auth } from '@/../auth';
import { can, type Role } from '@/shared/lib/permissions';
import { MapTemplatesPageContent } from '@/features/map-templates-management';
import { ErrorBoundary } from '@/shared/ui';

// Next.js 15.3: конфигурация рендеринга для админки
export const dynamic = 'force-dynamic'; // Админка всегда должна быть свежей
export const revalidate = 0; // Отключаем статический кэш для админки

/**
 * Страница управления шаблонами карт (Next.js 15.3 + React 19)
 * 
 * ✅ АРХИТЕКТУРА с permissions:
 * - 🛡️ RSC проверяет права доступа на сервере
 * - Редирект при отсутствии прав
 * - ErrorBoundary с встроенным DefaultErrorFallback
 * - Client Component с защищенным UI
 */
export default async function MapTemplatesPage() {
  // 🛡️ Проверка прав доступа на уровне RSC
  const session = await auth();
  
  // Проверка наличия права manageEntities
  if (!session?.user || !can(session.user.role as Role, 'manageEntities')) {
    redirect('/admin/login?error=unauthorized');
  }

  return (
    <ErrorBoundary>
      <MapTemplatesPageContent />
    </ErrorBoundary>
  );
} 