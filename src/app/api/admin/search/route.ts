import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/handle-api-error';
import searchService from '@/lib/domain/search/search-service';

// Next.js 15: Отключаем кэширование для поиска (всегда свежие результаты)
export const revalidate = 0;

const searchSchema = z.object({
  q: z.string().min(1, 'Поисковый запрос должен содержать хотя бы 1 символ.'),
  entities: z.string().min(1, 'Необходимо указать хотя бы одну сущность для поиска.'),
  status: z.enum(['active', 'archived', 'all']).optional().default('active'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Валидация query-параметров
    const validation = searchSchema.safeParse({
      q: searchParams.get('q'),
      entities: searchParams.get('entities'),
      status: searchParams.get('status'),
    });

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { q, entities, status } = validation.data;
    const entityList = entities.split(',');

    // ✅ Передаем фильтры в сервис поиска
    const results = await searchService.search(q, entityList, { status });

    return NextResponse.json({ data: results });
  } catch (error) {
    if (error instanceof Error) {
      return handleApiError(error);
    }
    // Если это не объект Error, создаем новый для стандартизации
    return handleApiError(new Error(`Неизвестная ошибка: ${String(error)}`));
  }
} 