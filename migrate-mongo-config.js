// migrate-mongo-config.js

/**
 * Загружает переменные окружения из файла .env.local для использования вне Docker.
 * Внутри Docker-контейнера переменные уже будут доступны.
 */
require('dotenv').config({ path: '.env.local' });

const config = {
  mongodb: {
    /**
     * URL для подключения к MongoDB.
     * Берется из переменной окружения MONGODB_URI.
     * "mongodb://mongodb:27017" - это значение по умолчанию для работы внутри Docker-сети.
     */
    url: process.env.MONGODB_URI || "mongodb://mongodb:27017",

    /**
     * Имя базы данных.
     * НЕ УКАЗЫВАЕТСЯ ЯВНО. Оно должно быть частью `url` для консистентности.
     * Mongoose и драйвер MongoDB автоматически извлекут имя базы данных из строки подключения.
     * Это гарантирует, что и приложение, и мигратор используют одну и ту же БД.
     */
    // databaseName: process.env.MONGODB_DB_NAME || "majesticmatchcenter",

    options: {
      useNewUrlParser: true, // Рекомендуется для обратной совместимости
      useUnifiedTopology: true, // Использует новый движок управления подключениями
    }
  },

  // Директория для хранения файлов миграций.
  migrationsDir: "migrations",

  // Название коллекции для хранения истории примененных миграций.
  changelogCollectionName: "changelog",

  // Расширение файлов миграций.
  migrationFileExtension: ".js",

  // Отключаем использование хешей файлов для определения изменений.
  useFileHash: false,

  // Указываем, что проект использует CommonJS.
  moduleSystem: 'commonjs',
};

module.exports = config; 