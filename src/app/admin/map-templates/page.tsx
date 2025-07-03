import { MapTemplatesPageContent } from '@/features/map-templates-management';
import { ErrorBoundary } from '@/shared/ui';

// Next.js 15.3: конфигурация рендеринга для админки
export const dynamic = 'force-dynamic'; // Админка всегда должна быть свежей
export const revalidate = 0; // Отключаем статический кэш для админки

/**
 * Страница управления шаблонами карт (Next.js 15.3 + React 19)
 * 
 * ✅ АРХИТЕКТУРА с permissions:
 * - RSC читает роль администратора из сессии
 * - Передает роль в Client Component через props
 * - ErrorBoundary с встроенным DefaultErrorFallback
 * - Client Component с SWR управляет данными + умные тогглы
 */
export default async function MapTemplatesPage() {
  return (
    <ErrorBoundary>
      <MapTemplatesPageContent />
    </ErrorBoundary>
  );
} 