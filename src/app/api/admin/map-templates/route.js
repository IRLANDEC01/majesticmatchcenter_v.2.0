import { NextResponse } from 'next/server';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.'),
  description: z.string().optional(),
  mapImage: z.string().url().optional(),
});

/**
 * Обработчик GET-запроса для получения всех шаблонов карт.
 * @returns {Promise<NextResponse>}
 */
export async function GET() {
  try {
    await connectToDatabase();
    const templates = await mapTemplateService.getAllMapTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to get map templates:', error);
    return NextResponse.json({ message: 'Ошибка сервера при получении шаблонов карт' }, { status: 500 });
  }
}

/**
 * Обработчик POST-запроса для создания нового шаблона карты.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const json = await request.json();

    const validationResult = createTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newTemplate = await mapTemplateService.createMapTemplate(validationResult.data);
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Шаблон карты с таким названием уже существует' }, { status: 409 });
    }
    console.error('Failed to create map template:', error);
    return NextResponse.json({ message: 'Ошибка сервера при создании шаблона карты' }, { status: 500 });
  }
} 