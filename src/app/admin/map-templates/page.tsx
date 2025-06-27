import { MapTemplatesPageContent } from '@/features/map-templates-management';

// Next.js 15.3: конфигурация рендеринга для админки
export const dynamic = 'force-dynamic'; // Админка всегда должна быть свежей
export const revalidate = 0; // Отключаем статический кэш для админки

/**
 * Страница управления шаблонами карт (Next.js 15.3 + React 19)
 * Использует Server Components с динамическим рендерингом для админки
 */
export default function MapTemplatesPage() {
  return <MapTemplatesPageContent />;
} 