import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { handleApiError } from '@/lib/api/handle-api-error';

/**
 * GET /api/admin/map-templates/{id}
 * Возвращает шаблон карты по ID.
 * @param {Request} request  - Объект запроса (не используется).
 * @param {RouteContext} context - Контекст с параметрами маршрута.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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