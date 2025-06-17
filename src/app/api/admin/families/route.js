import { NextResponse } from 'next/server';
import { familyService } from '@/lib/domain/families/family-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

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
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    const families = await familyService.getAllFamilies({ includeArchived });
    return NextResponse.json(families);
  } catch (error) {
    console.error('Failed to get families:', error);
    return NextResponse.json({ message: 'Ошибка сервера при получении семей' }, { status: 500 });
  }
}

/**
 * POST /api/admin/families
 * Создает новую семью.
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const json = await request.json();

    const validationResult = createFamilySchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newFamily = await familyService.createFamily(validationResult.data);
    return NextResponse.json(newFamily, { status: 201 });
  } catch (error) {
    console.error('Failed to create family:', error);
    if (error.code === 11000) {
      // Ошибка дублирующегося ключа (name)
      return NextResponse.json({ message: 'Семья с таким названием уже существует' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Ошибка сервера при создании семьи' }, { status: 500 });
  }
} 