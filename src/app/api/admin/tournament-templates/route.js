import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { tournamentTemplateRepository } from '@/lib/repos/tournament-template-repo';

/**
 * Обработчик GET-запроса для получения всех шаблонов турниров.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const populate = searchParams.get('populate') === 'true';

    const templates = await tournamentTemplateRepository.findAll(populate);
    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    // В реальном приложении здесь будет более детальное логирование
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Обработчик POST-запроса для создания нового шаблона турнира.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    await dbConnect();
    const data = await request.json();

    const newTemplate = await tournamentTemplateRepository.create(data);
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    // Обработка ошибок валидации Mongoose
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message, errors: error.errors }, { status: 400 });
    }
    // Обработка ошибки дублирования ключа
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Шаблон с таким name или slug уже существует.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 