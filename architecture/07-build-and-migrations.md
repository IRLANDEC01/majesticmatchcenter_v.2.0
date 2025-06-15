# Сборка, Dockerfile и миграции

## 1. Сборка приложения

### 1.1 Основной Dockerfile

Процесс сборки разделен на несколько стадий для оптимизации размера конечного образа и безопасности.

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 1. Стадия 'deps': установка зависимостей
# Устанавливаются все зависимости, включая dev-зависимости, 
# если они нужны для сборки.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Стадия 'builder': сборка приложения
# Копируются зависимости и исходный код, выполняется команда `npm run build`.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# 3. Стадия 'runner': рабочий образ
# Используется чистый образ, куда копируются только необходимые 
# для запуска артефакты из 'builder'.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Создается специальный пользователь без root-прав для запуска приложения.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Копируются только необходимые для запуска файлы
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Приложение запускается от имени пользователя без привилегий.
USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "start"]
```

### 1.2 Dockerfile для планировщика

Планировщик — это легковесный образ, содержащий только скрипт для регистрации задач в BullMQ.

```dockerfile
# Dockerfile.scheduler
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# Устанавливаются только production-зависимости
RUN npm ci --omit=dev

# Копируются только скрипт и необходимые ему модули
COPY scripts/scheduler.js ./scripts/
COPY src/lib ./src/lib/
COPY src/models ./src/models/

# Устанавливается лимит по памяти для Node.js
ENV NODE_OPTIONS="--max-old-space-size=512"

# Запускается скрипт регистрации задач
CMD ["node", "scripts/scheduler.js"]
```

## 2. Миграции базы данных

Для управления изменениями схемы MongoDB используется **`migrate-mongo`**. Это позволяет версионировать изменения, применять их контролируемо и откатывать в случае проблем, что является критически важным для поддержания целостности данных в продакшен-среде.

### Процесс работы с миграциями

1.  **Настройка**: В проекте создается файл `migrate-mongo-config.js`, который указывает `migrate-mongo` как подключаться к базе данных и где хранить файлы миграций.
2.  **Создание миграции**: Разработчик выполняет команду `migrate-mongo create <migration_name>`, например, `migrate-mongo create add_indexes_to_tournaments`.
3.  **Написание миграции**: В созданном файле описываются две функции:
    *   `up(db)`: Содержит логику для применения изменений (например, `db.collection('tournaments').createIndex(...)`).
    *   `down(db)`: Содержит логику для отката изменений (например, `db.collection('tournaments').dropIndex(...)`).
4.  **Применение миграций**: В CI/CD пайплайне перед запуском новой версии приложения автоматически выполняется команда `npm run migrate`, которая применяет все новые, еще не выполненные миграции. `migrate-mongo` отслеживает выполненные миграции в специальной коллекции в базе данных. 