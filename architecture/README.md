# Документация архитектуры MajesticMatchCenter v2.0

> **Обновлено:** Январь 2025  
> **Архитектура:** Feature-Sliced Design (FSD)

## 📚 Содержание

### 🏛️ Архитектурные основы
1. [Обзор архитектуры](01-overview.md) — общая концепция и принципы
2. [Паттерны программирования](02-patterns.md) — используемые паттерны и practices
3. [Feature-Sliced Design](11-feature-sliced-design.md) — ✨ **современная FSD архитектура**
4. [Структура проекта](project-structure.md) — организация файлов и папок

### 🔧 Технические аспекты  
5. [Стратегия кэширования](03-caching-strategy.md) — Redis, Next.js cache
6. [Асинхронные операции и Real-time](04-async-and-realtime.md) — BullMQ, PubSub
7. [Стратегия тестирования](10-testing-strategy.md) — Vitest, интеграционные тесты

### 🎯 Бизнес-логика
8. [Бизнес-логика](05-business-logic.md) — основные правила и процессы
9. [Призовые фонды](05b-business-logic-prizepool-pattern.md) — паттерн Prize Tiers
10. [Модель результатов](05c-business-logic-outcome-model.md) — система подсчета результатов

### 🎨 Frontend & UI
11. [UI и фронтенд](09-ui-frontend.md) — Next.js, React 19, Tailwind CSS

### 🚀 Infrastructure & DevOps
12. [Инфраструктура](05-infrastructure.md) — MongoDB, Redis, Meilisearch
13. [Файловое хранилище S3](12-file-storage-s3.md) — ✨ **S3 интеграция + изображения**
14. [Сборка и миграции](06-build-and-migrations.md) — Docker, CI/CD
15. [TypeScript миграция](06b-typescript-migration-playbook.md) — плейбук миграции
16. [Production Hardening](08-production-hardening.md) — безопасность, мониторинг

### 📋 Детальная бизнес-логика
17. [Семьи и игроки](business-logic/01-families-and-players.md)
18. [Турниры и шаблоны](business-logic/02-tournaments-and-templates.md)  
19. [Карты и шаблоны](business-logic/03-maps-and-templates.md)

---

## 🔥 Последние обновления (Январь 2025)

### ✅ TanStack Query v5 Migration
- **Полностью завершена** миграция с SWR на TanStack Query v5
- **Map Templates** служат эталонной вертикалью для других сущностей
- **Двойная инвалидация** для гарантированного обновления данных
- **Оптимизированные** настройки для админ-панели

### ✅ S3 File Storage Integration
- **Полная интеграция** S3-совместимого хранилища (Рег.ру)
- **Автоматическое создание** вариантов изображений (icon, medium, original)
- **React Hook Form** + FileDropzone для загрузки файлов
- **Унифицированная ImageSet** схема для всех сущностей

### ✅ Feature-Sliced Design
- **Полностью внедрена** современная FSD архитектура
- **Мигрированы** map-templates на новую структуру
- **Созданы** слои: shared, entities, features, app
- **Устранено** дублирование и архитектурные проблемы

### ✅ TypeScript & качество кода
- **Мигрированы** все компоненты FSD на TypeScript
- **Исправлены** все ESLint ошибки  
- **Добавлены** строгие типы и barrel exports
- **Обновлены** Server Actions на `.server.ts`

### ✅ Тестирование v2.2
- **Vitest** вместо Jest для unit тестов
- **Самодостаточные** интеграционные тесты API
- **Мокирование** только внешних сервисов  
- **Покрытие** переиспользуемых компонентов

---

## 🎯 Рекомендуемый порядок чтения

**Для новых разработчиков:**
1. [01-overview.md](01-overview.md) — понять общую концепцию
2. [11-feature-sliced-design.md](11-feature-sliced-design.md) — изучить FSD
3. [project-structure.md](project-structure.md) — разобраться в структуре
4. [10-testing-strategy.md](10-testing-strategy.md) — понять подход к тестам

**Для work с бизнес-логикой:**
1. [05-business-logic.md](05-business-logic.md) — основные правила
2. [business-logic/](business-logic/) — детали по сущностям
3. [02-patterns.md](02-patterns.md) — используемые паттерны

**Для DevOps/Infrastructure:**
1. [05-infrastructure.md](05-infrastructure.md) — инфраструктура
2. [06-build-and-migrations.md](06-build-and-migrations.md) — сборка
3. [08-production-hardening.md](08-production-hardening.md) — production

---

> **Статус документации:** ✅ Актуальная  
> **Последнее обновление:** Январь 2025  
> **Версия архитектуры:** FSD v2.0 + TypeScript 