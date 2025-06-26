import { connectToDatabase, disconnectFromDatabase } from '../src/lib/db';
import searchService from '../src/lib/domain/search/search-service';

// Явный импорт моделей для их регистрации в Mongoose
import '../src/models/map/MapTemplate';
import '../src/models/tournament/TournamentTemplate';

/**
 * Функция-обертка для запуска полной переиндексации из командной строки.
 * Управляет подключением к БД, вызывает сервис и завершает процесс.
 */
async function runReindexFromCLI() {
  console.log('🌱 Запуск полной переиндексации MeiliSearch из CLI...');
  try {
    await connectToDatabase();
    await searchService.reindexAll();
    console.log('✅ Переиндексация успешно поставлена в очередь.');
  } catch (error) {
    console.error('❌ Ошибка во время запуска переиндексации:', error);
    process.exit(1);
  } finally {
    // Даем немного времени на отправку задач в Redis перед отключением
    setTimeout(async () => {
      await disconnectFromDatabase();
      console.log('🔌 Отключено от базы данных.');
      process.exit(0);
    }, 2000);
  }
}

// Этот блок выполняется, только если скрипт запущен напрямую, а не импортирован
if (require.main === module) {
  runReindexFromCLI();
} 