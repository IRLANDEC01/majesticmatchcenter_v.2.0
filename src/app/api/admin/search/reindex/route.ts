import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import searchService from '@/lib/domain/search/search-service';
import { connectToDatabase } from '@/lib/db';

/**
 * @swagger
 * /api/admin/search/reindex:
 *   post:
 *     summary: Запускает полную переиндексацию всех сущностей в MeiliSearch.
 *     description: |
 *       Этот эндпоинт инициирует процесс полной переиндексации данных.
 *       Он добавляет задачи для каждой сущности (игроки, семьи и т.д.) в очередь для асинхронной обработки.
 *       **Требует прав администратора.**
 *     tags:
 *       - Search
 *       - Admin
 *     responses:
 *       '202':
 *         description: 'Accepted. Процесс переиндексации успешно запущен.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Процесс переиндексации запущен. В очередь добавлено 150 задач.'
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalJobs:
 *                       type: integer
 *                       example: 150
 *       '500':
 *         description: 'Internal Server Error. Ошибка на сервере при запуске процесса.'
 */
export async function POST() {
  try {
    // TODO: Добавить проверку прав администратора (когда будет готова система аутентификации)

    // Убеждаемся, что подключение к MongoDB установлено
    await connectToDatabase();

    const { totalJobs } = await searchService.reindexAll();

    return NextResponse.json(
      {
        message: `Процесс переиндексации запущен. В очередь добавлено ${totalJobs} задач.`,
        data: { totalJobs },
      },
      { status: 202 } // 202 Accepted - запрос принят, но обработка еще не завершена
    );
  } catch (error: any) {
    return handleApiError(error);
  }
} 