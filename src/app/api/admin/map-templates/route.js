import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { mapTemplateRepository } from '@/lib/repos/map-template-repo';

/**
 * Обработчик GET-запроса для получения всех шаблонов карт.
 * @returns {Promise<NextResponse>}
 */
export async function GET() {
  try {
    await dbConnect();
    const templates = await mapTemplateRepository.findAll();
    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Обработчик POST-запроса для создания нового шаблона карты.
 * @param {Request} request - Входящий запрос.
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    await dbConnect();
    const data = await request.json();

    // TODO: Добавить валидацию данных с помощью Zod

    const newTemplate = await mapTemplateRepository.create(data);
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message, errors: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Шаблон с таким name или slug уже существует.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 