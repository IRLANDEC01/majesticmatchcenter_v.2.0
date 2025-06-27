# Feature-Sliced Design (FSD) Архитектура

> **Статус:** ✅ **ПОЛНОСТЬЮ ВНЕДРЕНА** (Январь 2025)  
> **Версия FSD:** v2.0  
> **Технологии:** Next.js 15.3, React 19, TypeScript

## 📖 Обзор

MajesticMatchCenter использует **Feature-Sliced Design (FSD)** — современную методологию архитектуры фронтенда, которая обеспечивает:

- 🎯 **Четкое разделение ответственности** между слоями
- 🔄 **Переиспользование компонентов** на разных уровнях  
- 📈 **Масштабируемость** без архитектурного долга
- 🧪 **Улучшенную тестируемость** благодаря изоляции
- 👥 **Удобство командной разработки** через понятную структуру

## 🏗️ Слоистая архитектура

FSD организует код в следующие слои (от низшего к высшему):

```
app/     ← Инициализация приложения и провайдеры  
├─ features/ ← Бизнес-фичи и пользовательские сценарии
├─ entities/ ← Бизнес-сущности и их представления  
└─ shared/   ← Переиспользуемые ресурсы без бизнес-логики
```

### 🚀 Правило зависимостей

**Каждый слой может зависеть только от нижележащих слоев:**

- `app` → `features` → `entities` → `shared`
- ❌ Нельзя: `shared` → `entities`
- ❌ Нельзя: `entities` → `features`  
- ✅ Можно: `features` → `entities` → `shared`

## 📁 Структура проекта

```
src/
├── app/                     # 🎯 Слой приложения
│   ├── admin/               # Админ-панель
│   │   ├── layout.tsx       # Layout с провайдерами
│   │   ├── page.tsx         # Главная страница админки  
│   │   └── map-templates/   # Страница шаблонов карт
│   │       └── page.tsx     # Композиция фичи
│   ├── api/                 # API Routes (Next.js)
│   ├── layout.tsx           # Корневой layout
│   └── page.tsx             # Главная страница
│
├── features/                # 🎯 Слой фич (бизнес-логика)
│   └── map-templates-management/
│       ├── index.ts         # Public API фичи
│       ├── api/             # Server Actions
│       │   └── actions.server.ts
│       └── ui/              # Составные UI компоненты  
│           └── map-templates-page-content.tsx
│
├── entities/                # 🎯 Слой сущностей  
│   ├── map-templates/
│   │   ├── index.ts         # Public API сущности
│   │   ├── model/           # Типы и мапперы
│   │   │   ├── index.ts
│   │   │   ├── types.ts     # Frontend типы
│   │   │   └── mappers.ts   # DTO преобразования
│   │   ├── ui/              # UI компоненты сущности
│   │   │   ├── map-template-dialog.tsx
│   │   │   └── map-templates-table.tsx  
│   │   └── lib/             # Хуки данных
│   │       └── use-map-templates-data.ts
│   ├── tournament-templates/
│   ├── players/
│   ├── families/
│   ├── tournaments/
│   └── maps/
│
└── shared/                  # 🎯 Слой переиспользуемых ресурсов
    ├── index.ts             # Главный public API
    ├── ui/                  # Базовые UI компоненты
    │   ├── index.ts         # UI barrel export
    │   ├── button.tsx       # Базовые компоненты
    │   ├── input.tsx
    │   ├── table.tsx
    │   ├── entity-search.tsx # Переиспользуемые компоненты
    │   └── layout/          # Layout компоненты
    │       ├── admin-sidebar.tsx
    │       └── global-header.tsx
    ├── hooks/               # Переиспользуемые хуки
    │   ├── index.ts
    │   └── use-search.ts
    ├── providers/           # React провайдеры  
    │   ├── index.ts
    │   └── swr-provider.tsx
    └── admin/               # Админские компоненты
        ├── index.ts
        ├── delete-confirmation-dialog.jsx
        ├── entity-status-toggle.tsx
        └── entity-table-actions.tsx
```

## 🎯 Детальное описание слоев

### Shared — Переиспользуемые ресурсы

**Назначение:** Базовые компоненты, хуки и утилиты без привязки к бизнес-логике

**Содержит:**
- 🧩 **UI компоненты** — Button, Input, Table, Dialog и др.
- 🎣 **Хуки** — useSearch, useDebounce и др. 
- 🔌 **Провайдеры** — SWRProvider, ThemeProvider
- 🛠️ **Утилиты** — форматтеры, валидаторы, хелперы

**Правила:**
- ❌ Не знает о бизнес-сущностях
- ❌ Не содержит бизнес-логику
- ✅ Максимально переиспользуемый код

### Entities — Бизнес-сущности 

**Назначение:** Представление бизнес-сущностей и работа с ними

**Содержит:**
- 📊 **Model** — типы, интерфейсы, мапперы (Mongoose → Frontend)
- 🎨 **UI** — компоненты для отображения конкретной сущности  
- 📡 **Lib** — хуки для получения данных сущности
- 🔄 **API** — методы взаимодействия с API (опционально)

**Пример для `map-templates`:**
```typescript
// entities/map-templates/model/types.ts
export interface MapTemplate {
  id: string;
  name: string;
  description: string;
  mapTemplateImage: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// entities/map-templates/ui/map-template-dialog.tsx  
export function MapTemplateDialog({ template, ... }) {
  // Компонент для создания/редактирования конкретного шаблона
}

// entities/map-templates/lib/use-map-templates-data.ts
export function useMapTemplatesData() {
  // Хук для получения данных шаблонов карт
}
```

### Features — Бизнес-фичи

**Назначение:** Реализация пользовательских сценариев и бизнес-процессов

**Содержит:**
- 🎯 **UI** — составные компоненты, реализующие полную фичу
- ⚡ **API** — Server Actions для мутаций данных  
- 🧠 **Model** — бизнес-логика фичи (редко)

**Пример для `map-templates-management`:**
```typescript
// features/map-templates-management/ui/map-templates-page-content.tsx
export function MapTemplatesPageContent() {
  // Полная страница управления шаблонами:
  // - поиск, фильтры
  // - таблица с действиями  
  // - диалоги создания/редактирования
}

// features/map-templates-management/api/actions.server.ts
export async function createMapTemplateAction(formData) {
  // Server Action для создания шаблона
}
```

### App — Инициализация приложения

**Назначение:** Композиция фич, роутинг, провайдеры, точки входа

**Содержит:**
- 🚀 **Pages** — страницы Next.js (композиция фич)
- 🛣️ **Routing** — маршрутизация App Router
- 🔌 **Providers** — глобальные провайдеры  
- 📱 **Layouts** — макеты страниц

## 📋 Naming Conventions

### Файлы и папки
- **kebab-case** для папок: `map-templates/`, `admin-panel/`
- **kebab-case** для файлов: `map-template-dialog.tsx`, `use-search.ts`
- **PascalCase** для React компонентов: `MapTemplateDialog`, `EntitySearch`

### TypeScript
- **Интерфейсы:** `MapTemplate`, `EntitySearchProps`
- **Типы:** `SearchEntity`, `EntityStatus`  
- **Хуки:** `useMapTemplatesData`, `useSearch`
- **Server Actions:** суффикс `.server.ts`

### Export/Import паттерны
```typescript
// ✅ Barrel exports в index.ts
export { MapTemplate } from './types';
export { mapTemplateToDto } from './mappers';

// ✅ Named exports предпочтительнее
export function MapTemplateDialog() { }

// ✅ Импорты через barrel
import { MapTemplate, useMapTemplatesData } from '@/entities/map-templates';
import { Button, EntitySearch } from '@/shared/ui';
```

## 🔄 Паттерны интеграции слоев

### Entity → Shared
```typescript
// entities/map-templates/ui/map-template-dialog.tsx
import { Button, Dialog, Input } from '@/shared/ui';
import { useSearch } from '@/shared/hooks';
```

### Feature → Entity + Shared  
```typescript
// features/map-templates-management/ui/map-templates-page-content.tsx
import { MapTemplateDialog, useMapTemplatesData } from '@/entities/map-templates';
import { EntitySearch, Button } from '@/shared/ui';
```

### App → Feature
```typescript
// app/admin/map-templates/page.tsx
import { MapTemplatesPageContent } from '@/features/map-templates-management';

export default function MapTemplatesPage() {
  return <MapTemplatesPageContent />;
}
```

## 🧪 Тестирование в FSD

### Стратегия тестирования
- **Shared:** Unit тесты для хуков и утилит
- **Entities:** Компонентные тесты для UI, unit для model
- **Features:** Интеграционные тесты для полных сценариев
- **App:** E2E тесты для критических путей

### Примеры тестов  
```typescript
// shared/hooks/use-search.test.ts - Unit тест
test('should debounce search term', () => { });

// entities/map-templates/ui/map-template-dialog.test.tsx - Component тест  
test('should validate form fields', () => { });

// features/map-templates-management/api/actions.test.ts - Integration тест
test('should create map template via Server Action', () => { });
```

## 🎯 Преимущества внедрения FSD

### ✅ До рефакторинга (проблемы)
- 🔄 Дублирование компонентов и логики
- 🍝 Спагетти-код в `src/components/`
- 🐛 Сложно найти и исправить баги
- 📈 Неконтролируемый рост сложности
- 👥 Конфликты при командной разработке

### ✅ После внедрения FSD (решения)  
- 🎯 Четкая структура и ответственность
- ♻️ Максимальное переиспользование кода
- 🔍 Легко найти нужный код
- 📏 Контролируемое масштабирование
- 👥 Изолированная командная работа
- 🧪 Улучшенное покрытие тестами
- 📚 Самодокументируемый код

## 🔧 Инструменты и настройки

### TypeScript
```json
// tsconfig.json - Path mapping
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@/shared/*": ["src/shared/*"],
      "@/entities/*": ["src/entities/*"], 
      "@/features/*": ["src/features/*"]
    }
  }
}
```

### ESLint
```javascript
// .eslintrc.js - FSD правила
{
  "rules": {
    "import/no-restricted-paths": ["error", {
      "zones": [
        { "target": "./src/shared", "from": "./src/entities" },
        { "target": "./src/shared", "from": "./src/features" },
        { "target": "./src/entities", "from": "./src/features" }
      ]
    }]
  }
}
```

## 📚 Дополнительные ресурсы

- 📖 [Официальная документация FSD](https://feature-sliced.design/)
- 🎯 [FSD v2.0 спецификация](https://feature-sliced.design/docs/about/understanding/naming)
- 🛠️ [Best Practices for React + TypeScript](https://feature-sliced.design/docs/guides/tech/with-react)

---

> **Последнее обновление:** Январь 2025  
> **Автор изменений:** AI Assistant  
> **Статус архитектуры:** Production Ready ✅ 