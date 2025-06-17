import { NextResponse } from 'next/server';
import { familyService } from '@/lib/domain/families/family-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import mongoose from 'mongoose';

const MongooseID = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Некорректный ID.',
});

const updateFamilySchema = z.object({
  name: z.string().trim().min(1, 'Название семьи обязательно.').optional(),
  displayLastName: z.string().trim().min(1, 'Отображаемая фамилия обязательна.').optional(),
  description: z.string().trim().max(5000).optional(),
  logo: z.string().url('Некорректный URL логотипа.').optional(),
  banner: z.string().url('Некорректный URL баннера.').optional(),
});

/**
 * GET /api/admin/families/[id]
 * Получает семью по ID.
 */
export async function GET(request, { params }) {
  try {
    const idValidation = MongooseID.safeParse(params.id);
    if (!idValidation.success) {
      return NextResponse.json({ message: 'Некорректный ID семьи' }, { status: 400 });
    }

    await connectToDatabase();
    const family = await familyService.getFamilyById(params.id);

    if (!family) {
      return NextResponse.json({ message: 'Семья не найдена' }, { status: 404 });
    }
    return NextResponse.json(family);
  } catch (error) {
    console.error(`Failed to get family ${params.id}:`, error);
    return NextResponse.json({ message: 'Ошибка сервера при получении семьи' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/families/[id]
 * Обновляет семью.
 */
export async function PUT(request, { params }) {
  try {
    const idValidation = MongooseID.safeParse(params.id);
    if (!idValidation.success) {
      return NextResponse.json({ message: 'Некорректный ID семьи' }, { status: 400 });
    }
    
    await connectToDatabase();
    const json = await request.json();

    const validationResult = updateFamilySchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const updatedFamily = await familyService.updateFamily(params.id, validationResult.data);
    if (!updatedFamily) {
      return NextResponse.json({ message: 'Семья не найдена' }, { status: 404 });
    }

    return NextResponse.json(updatedFamily);
  } catch (error) {
    if (error.code !== 11000) console.error(`Failed to update family ${params.id}:`, error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Семья с таким названием уже существует' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Ошибка сервера при обновлении семьи' }, { status: 500 });
  }
} 