import { NextResponse } from 'next/server';
import { tournamentTemplateService } from '@/lib/domain/tournament-templates/tournament-template-service';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';

// Схема валидации для создания шаблона турнира
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым.'),
  description: z.string().optional(),
  mapTemplates: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
});

/**
 * @swagger
 * /api/admin/tournament-templates:
 *   get:
 *     summary: Получить все шаблоны турниров
 *     description: Возвращает список всех шаблонов турниров.
 *     tags:
 *       - Tournament Templates (Admin)
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TournamentTemplate'
 *       500:
 *         description: Ошибка сервера
 */
export async function GET() {
  try {
    await connectToDatabase();
    const templates = await tournamentTemplateService.getAllTemplates(true);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to get tournament templates:', error);
    return NextResponse.json({ message: 'Ошибка сервера при получении шаблонов турниров' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/admin/tournament-templates:
 *   post:
 *     summary: Создать новый шаблон турнира
 *     description: Создает новый шаблон турнира с предоставленными данными.
 *     tags:
 *       - Tournament Templates (Admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TournamentTemplateInput'
 *     responses:
 *       201:
 *         description: Шаблон успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TournamentTemplate'
 *       400:
 *         description: Некорректные данные запроса
 *       500:
 *         description: Ошибка сервера
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const json = await request.json();

    // Валидация входных данных с помощью Zod
    const validationResult = createTemplateSchema.safeParse(json);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newTemplate = await tournamentTemplateService.createTemplate(validationResult.data);
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('Failed to create tournament template:', error);
    // Проверяем на ошибки дублирования ключа (slug)
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Шаблон с таким названием уже существует' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Ошибка сервера при создании шаблона турнира' }, { status: 500 });
  }
} 