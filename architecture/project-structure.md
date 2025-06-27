# Структура проекта MajesticMatchCenter v2.0

> **Обновлено:** Январь 2025  
> **Архитектура:** Feature-Sliced Design (FSD)  
> **Технологии:** Next.js 15.3, React 19, TypeScript

## 📖 Обзор

MajesticMatchCenter использует современную архитектуру **Feature-Sliced Design (FSD)** для организации кода. Подробности в [11-feature-sliced-design.md](./11-feature-sliced-design.md).

## 🗂️ Корневая структура

```
majesticmatchcenter_v.2.0/
├── 📁 src/                  # Исходный код (FSD архитектура)
├── 📁 architecture/         # Архитектурная документация
├── 📁 memory-bank/          # База знаний для AI Assistant
├── 📁 migrations/           # Миграции базы данных
├── 📁 scripts/              # Скрипты автоматизации
├── 📁 configs/              # Конфигурационные файлы
├── 📁 tests/                # E2E тесты (Playwright)
├── 📁 public/               # Статические файлы
├── 📄 package.json          # Зависимости и скрипты
├── 📄 next.config.mjs       # Конфигурация Next.js
├── 📄 tailwind.config.mjs   # Конфигурация Tailwind CSS
├── 📄 tsconfig.json         # Конфигурация TypeScript
├── 📄 vitest.config.*.mjs   # Конфигурации тестов
└── 📄 docker-compose.yml    # Docker для разработки
```

## 🎯 Исходный код (src/) — FSD архитектура

```
src/
├── 📁 app/                     # Слой приложения (Next.js App Router)
│   ├── 📁 admin/               # Админ-панель
│   │   ├── 📄 layout.tsx       # Layout админки
│   │   ├── 📄 page.tsx         # Главная админки
│   │   └── 📁 map-templates/   # Управление шаблонами карт
│   │       └── 📄 page.tsx     # Страница шаблонов
│   ├── 📁 api/                 # API Routes (RESTful + GraphQL)
│   │   └── 📁 admin/           # Admin API
│   │       ├── 📁 map-templates/
│   │       ├── 📁 tournament-templates/
│   │       ├── 📁 players/
│   │       ├── 📁 families/
│   │       ├── 📁 tournaments/
│   │       ├── 📁 maps/
│   │       └── 📁 search/
│   ├── 📄 layout.tsx           # Корневой layout
│   ├── 📄 page.tsx             # Главная страница
│   └── 📄 globals.css          # Глобальные стили
│
├── 📁 features/                # Слой бизнес-фич
│   └── 📁 map-templates-management/
│       ├── 📄 index.ts         # Public API
│       ├── 📁 api/             # Server Actions
│   │       └── 📄 actions.server.ts
│   │       └── 📁 ui/              # UI фичи
│   │           └── 📄 map-templates-page-content.tsx
│   ├── 📁 entities/                # Слой бизнес-сущностей
│   │   ├── 📁 map-templates/
│   │   │   ├── 📄 index.ts         # Public API
│   │   │   ├── 📁 model/           # Типы и мапперы
│   │   │   │   ├── 📄 index.ts
│   │   │   │   ├── 📄 types.ts     # Frontend типы
│   │   │   │   └── 📄 mappers.ts   # DTO мапперы
│   │   │   │   └── 📁 ui/              # UI сущности
│   │   │   │       ├── 📄 map-template-dialog.tsx
│   │   │   │       └── 📄 map-templates-table.tsx
│   │   │   └── 📁 lib/             # Хуки данных
│   │   │       └── 📄 use-map-templates-data.ts
│   │   ├── 📁 tournament-templates/
│   │   ├── 📁 players/
│   │   ├── 📁 families/
│   │   ├── �� tournaments/
│   │   └── 📁 maps/
│   ├── 📁 shared/                  # Слой переиспользуемых ресурсов
│   │   ├── 📄 index.ts             # Главный public API
│   │   ├── 📁 ui/                  # Базовые UI компоненты
│   │   │   ├── 📄 index.ts         # UI barrel export
│   │   │   ├── 📄 button.tsx       # Базовые компоненты
│   │   │   ├── 📄 input.tsx
│   │   │   ├── 📄 table.tsx
│   │   │   ├── 📄 entity-search.tsx # Переиспользуемые компоненты
│   │   │   └── 📁 layout/          # Layout компоненты
│   │   │       ├── 📄 admin-sidebar.tsx
│   │   │       └── 📄 global-header.tsx
│   │   ├── 📁 hooks/               # Переиспользуемые хуки
│   │   │   ├── �� index.ts
│   │   │   └── 📄 use-search.ts
│   │   ├── 📁 providers/           # React провайдеры
│   │   │   ├── 📄 index.ts
│   │   │   └── 📄 swr-provider.tsx
│   │   └── 📁 admin/               # Админские компоненты
│   │       ├── 📄 index.ts
│   │       ├── 📄 delete-confirmation-dialog.jsx
│   │       ├── 📄 entity-status-toggle.tsx
│   │       └── 📄 entity-table-actions.tsx
│   ├── 📁 lib/                     # Серверная бизнес-логика (не FSD)
│   │   ├── 📁 domain/              # Доменные сервисы
│   │   ├── 📁 repos/               # Репозитории
│   │   ├── 📁 cache/               # Кэширование
│   │   ├── 📁 api/                 # API утилиты
│   │   └── 📁 utils/               # Утилиты
│   ├── 📁 models/                  # Mongoose модели
│   │   ├── 📁 tournament/
│   │   ├── 📁 map/
│   │   ├── 📁 player/
│   │   └── 📁 family/
│   ├── 📁 queues/                  # BullMQ очереди
│   │   ├── 📄 search-queue.ts
│   │   └── 📄 search-worker.ts
│   └── 📁 styles/                  # Дополнительные стили
```

## 🗂️ Архитектурная документация

```
architecture/
├── 📄 README.md                    # Содержание документации
├── 📄 01-overview.md               # Обзор архитектуры
├── 📄 02-patterns.md               # Паттерны программирования
├── 📄 03-caching-strategy.md       # Стратегия кэширования
├── 📄 04-async-and-realtime.md     # Асинхронность и realtime
├── 📄 05-business-logic.md         # Бизнес-логика
├── 📄 05b-business-logic-prizepool-pattern.md
├── 📄 05c-business-logic-outcome-model.md
├── 📄 05-infrastructure.md         # Инфраструктура
├── 📄 06-build-and-migrations.md   # Сборка и миграции
├── 📄 06b-typescript-migration-playbook.md
├── 📄 07-build-and-migrations.md   # Дублирует 06 (требует очистки)
├── 📄 08-production-hardening.md   # Production готовность
├── 📄 09-ui-frontend.md            # UI и фронтенд
├── 📄 10-testing-strategy.md       # Стратегия тестирования
├── 📄 11-feature-sliced-design.md  # ✨ FSD архитектура
├── 📄 project-structure.md         # Структура проекта (этот файл)
└── 📁 business-logic/              # Детали бизнес-логики
    ├── 📄 01-families-and-players.md
    ├── 📄 02-tournaments-and-templates.md
    └── 📄 03-maps-and-templates.md
```

## 🧠 Memory Bank (база знаний для AI)

```
memory-bank/
├── 📄 projectbrief.md          # Краткое описание проекта
├── 📄 productContext.md        # Контекст продукта
├── 📄 systemPatterns.md        # Системные паттерны
├── 📄 techContext.md           # Технический контекст
├── 📄 activeContext.md         # Активный контекст
└── 📄 progress.md              # Прогресс разработки
```

## 🔧 Скрипты и автоматизация

```
scripts/
├── 📄 seed-db.ts               # Наполнение БД тестовыми данными
├── 📄 seed-meilisearch.ts      # Наполнение поискового индекса
├── 📄 clear-search-queue.ts    # Очистка очереди поиска
├── 📄 run-queue-monitor.ts     # Мониторинг очередей
├── 📄 run-search-worker.ts     # Воркер поискового индекса
└── 📁 shims/                   # Shims для Node.js окружения
    └── 📄 server-only.ts
```

## 🧪 Тестирование

```
tests/                          # E2E тесты (Playwright)
└── 📄 admin-dashboard.spec.js  # Тест админ-панели

# Unit/Integration тесты находятся рядом с кодом:
src/**/*.test.ts               # Vitest тесты
src/**/*.test.tsx              # React компонентные тесты
```

## 🐳 Docker и развертывание

```
docker-compose.yml              # Основной Docker Compose
Dockerfile                     # Образ приложения
.dockerignore                  # Исключения для Docker
```

## ⚙️ Конфигурации

```
📄 next.config.mjs              # Next.js конфигурация
📄 tailwind.config.mjs          # Tailwind CSS
📄 tsconfig.json                # TypeScript (основной)
📄 tsconfig.scripts.json        # TypeScript для скриптов
📄 tsconfig.test.json           # TypeScript для тестов
📄 vitest.config.client.mjs     # Vitest для клиента
📄 vitest.config.server.mjs     # Vitest для сервера
📄 eslint.config.mjs            # ESLint
📄 playwright.config.js         # Playwright E2E
📄 jest.config.mjs              # Jest (устаревший)
📄 components.json              # shadcn/ui компоненты
📄 postcss.config.mjs           # PostCSS
📄 migrate-mongo-config.js      # Миграции MongoDB
```

## 🌍 Environment файлы

```
📄 .env.local                   # Локальная разработка
📄 .env.example                 # Пример переменных
📄 .env.production.sample       # Пример для production
```

## 📦 Менеджер пакетов

```
📄 package.json                 # Зависимости и скрипты
📄 package-lock.json            # Заблокированные версии
```

---

## 🎯 Ключевые изменения в архитектуре

### ✅ Внедрение Feature-Sliced Design
- **Старая структура:** `src/components/` — плоская структура без разделения ответственности
- **Новая структура:** `src/{shared,entities,features,app}` — четкая слоистая архитектура
- **Преимущества:** Масштабируемость, переиспользование, тестируемость

### ✅ TypeScript миграция
- **Прогресс:** Вся новая архитектура на TypeScript
- **Статус:** Старый код мигрируется постепенно
- **Цель:** 100% TypeScript покрытие к середине 2025

### ✅ Современные инструменты
- **Тесты:** Vitest вместо Jest
- **Линтинг:** ESLint Flat Config
- **Стили:** Tailwind CSS + shadcn/ui
- **Формы:** React Hook Form + Zod
- **State:** SWR для кэширования

## 📚 Связанные документы

- **Детали FSD:** [11-feature-sliced-design.md](./11-feature-sliced-design.md)
- **Паттерны:** [02-patterns.md](./02-patterns.md)
- **Тестирование:** [10-testing-strategy.md](./10-testing-strategy.md)
- **UI/Frontend:** [09-ui-frontend.md](./09-ui-frontend.md)

---

> **Последнее обновление:** Январь 2025  
> **Статус:** Production Ready ✅  
> **Следующий этап:** Миграция остальных сущностей на FSD 