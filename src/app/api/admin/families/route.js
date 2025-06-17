import { NextResponse } from 'next/server';
import { familyService } from '@/lib/domain/families/family-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/handle-api-error';

// Схема для создания семьи.
const createFamilySchema = z.object({
  name: z.string().trim().min(1, 'Название семьи обязательно.'),
  displayLastName: z.string().trim().min(1, 'Отображаемая фамилия обязательна.'),
  description: z.string().trim().max(5000).optional(),
  logo: z.string().url('Некорректный URL логотипа.').optional(),
  banner: z.string().url('Некорректный URL баннера.').optional(),
});

/**
 * GET /api/admin/families
 * Возвращает все семьи.
 * Поддерживает query-параметр `include_archived=true` для включения архивированных.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    const families = await familyService.getAllFamilies({ includeArchived });
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
    const data = await request.json();
    const newFamily = await familyService.createFamily(data);
    return NextResponse.json(newFamily, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
} 