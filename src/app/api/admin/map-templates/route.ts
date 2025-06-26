import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import {
  CreateMapTemplateDto,
  createMapTemplateSchema,
  GetMapTemplatesDto,
  getMapTemplatesSchema,
} from '@/lib/api/schemas/map-templates/map-template-schemas';
import mapTemplateService from '@/lib/domain/map-templates/map-template-service';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';

/**
 * Обработчик GET-запроса для получения шаблонов карт.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function GET(request: NextRequest) {
  try {
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

/**
 * Обработчик POST-запроса для создания нового шаблона карты.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function POST(request: NextRequest) {
  try {
    // Инициализируем подключение к базе данных
    await connectToDatabase();
    
    const body: CreateMapTemplateDto = await request.json();
    const data = createMapTemplateSchema.parse(body);
    const newTemplate = await mapTemplateService.createMapTemplate(data);

    revalidatePath('/admin/map-templates');

    return NextResponse.json({ data: newTemplate }, { status: 201 });
  } catch (error) {
    return handleApiError(error instanceof Error ? error : new Error(String(error)));
  }
} 