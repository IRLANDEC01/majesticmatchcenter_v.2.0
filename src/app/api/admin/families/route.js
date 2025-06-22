import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import familyService from '@/lib/domain/families/family-service.js';
import { handleApiError } from '@/lib/api/handle-api-error.js';
import { createFamilySchema, getFamiliesQuerySchema } from '@/lib/api/schemas/families/family-schemas.js';

/**
 * GET /api/admin/families
 * Возвращает список семей с пагинацией и фильтрацией.
 * @param {Request} request
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Валидируем и получаем параметры запроса
    const { page, limit, q, status } = getFamiliesQuerySchema.parse(queryParams);

    // Формируем корректный объект опций для сервиса
    const options = {
      page,
      limit,
      q,
      status,
    };

    const result = await familyService.getFamilies(options);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Не удалось получить список семей');
  }
}

/**
 * POST /api/admin/families
 * Создает новую семью.
 * @param {Request} request
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const validatedData = createFamilySchema.parse(body);

    const newFamily = await familyService.createFamily(validatedData);

    revalidatePath('/admin/families');

    return NextResponse.json(newFamily, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Не удалось создать семью');
  }
}