import { NextResponse } from 'next/server';
import { familyService } from '@/lib/domain/families/family-service';
import { connectToDatabase } from '@/lib/db';
import { handleApiError } from '@/lib/api/handle-api-error';
import { createFamilySchema, getFamiliesSchema } from '@/lib/api/schemas/families/family-schemas';

/**
 * GET /api/admin/families
 * Возвращает все семьи.
 * Поддерживает query-параметр `include_archived=true` для включения архивированных.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { include_archived } = getFamiliesSchema.parse(queryParams);

    const families = await familyService.getAllFamilies({ includeArchived: include_archived });
    return NextResponse.json(families);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/families
 * Создает новую семью.
 */
export async function POST(request) {
  try {
    await connectToDatabase(); // Убедимся, что соединение с БД установлено
    const body = await request.json();
    const validatedData = createFamilySchema.parse(body);

    const newFamily = await familyService.createFamily(validatedData);

    return NextResponse.json(newFamily, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
} 