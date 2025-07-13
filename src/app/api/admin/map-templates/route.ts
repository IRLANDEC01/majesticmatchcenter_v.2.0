import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error.js';
import {
  GetMapTemplatesDto,
  getMapTemplatesSchema,
} from '@/lib/api/schemas/map-templates/map-template-schemas';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { connectToDatabase } from '@/lib/db';
import { authorize } from '@/shared/lib/authorize';

/**
 * Обработчик GET-запроса для получения шаблонов карт.
 * 🛡️ ЗАЩИЩЕНО: Требует право 'manageEntities'
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function GET(request: NextRequest) {
  try {
    // 🛡️ Проверка прав доступа
    const authResult = await authorize('manageEntities');
    if (!authResult.success) {
      return authResult.response;
    }

    // Инициализируем подключение к базе данных
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const params: GetMapTemplatesDto = getMapTemplatesSchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const result = await mapTemplateService.getMapTemplates(params);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)));
  }
} 
