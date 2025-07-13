import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { handleApiError } from '@/lib/api/handle-api-error';
import { authorize } from '@/shared/lib/authorize';

/**
 * GET /api/admin/map-templates/{id}
 * 🛡️ ЗАЩИЩЕНО: Требует право 'manageEntities'
 * Возвращает шаблон карты по ID.
 * @param {Request} request  - Объект запроса (не используется).
 * @param {RouteContext} context - Контекст с параметрами маршрута.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 🛡️ Проверка прав доступа
    const authResult = await authorize('manageEntities');
    if (!authResult.success) {
      return authResult.response;
    }

    await connectToDatabase();
    
    const { id } = await params;
    const mapTemplate = await mapTemplateService.getMapTemplateById(id);
    return NextResponse.json({ data: mapTemplate });
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)));
  }
}

// Обновления с файлами должны идти только через Server Actions
// Это исключает дублирование логики и проблемы с файлами 