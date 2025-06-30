# System Patterns v2.5 — КРИТИЧНЫЕ ОБНОВЛЕНИЯ ⚠️

> **ВАЖНО:** Добавлены паттерны TanStack Query v5 + S3 интеграция после завершения миграции Map Templates. 
> Map Templates теперь служит эталонной вертикалью для других сущностей!

Проект построен на основе **гексагональной архитектуры (Ports and Adapters)**, что обеспечивает слабую связанность между доменной логикой и инфраструктурными компонентами, такими как база данных или кэш. Этот подход дополняется элементами **доменно-ориентированного проектирования (DDD)**, с кодом, организованным вокруг бизнес-сущностей (Турнир, Игрок, Семья). Для работы с данными применяется паттерн **Repository**, который абстрагирует логику доступа к данным, и **CQRS-light**, разделяющий операции чтения и записи для оптимизации производительности.

На фронтенде используется модульная архитектура **Container/View/Hook**, разделяющая компоненты на логику, отображение и состояние. Применяется подход **React Server Components (RSC)** для рендеринга на сервере и уменьшения нагрузки на клиент, а также **Server Actions** для обработки форм. Для кэширования реализована многоуровневая стратегия с использованием Redis на сервере и **TanStack Query v5** на клиенте, с абстракцией через **Adapter Pattern** для возможности переключения на in-memory кэш в среде разработки.

Для продакшен-окружения рекомендуется паритет (использование Redis также в разработке) и обеспечение высокой доступности через **Redis Sentinel**.

Безопасность обеспечивается через многоуровневую защиту (**Defense in Depth**), ограничение частоты запросов (**Rate Limiting**) и защиту от CSRF. Для безопасной передачи чувствительных данных в продакшене используется паттерн **Docker Secrets**. Интеграция между сервисами осуществляется через асинхронные паттерны, такие как **Publisher/Subscriber** с использованием Redis Pub/Sub и фоновые задачи на **BullMQ**, которые управляются через механизм **Repeatable Jobs**.

## Паттерны работы с данными

### [АКТИВНЫЙ] Витрина данных (Data Showcase)
- **Сущности**: `PlayerStats`, `FamilyStats`
- **Описание**: Для часто запрашиваемой, но редко изменяемой агрегированной статистики (например, общая статистика игрока за всю карьеру) создается отдельная "витринная" коллекция. Данные в ней обновляются инкрементально после завершения ключевых событий (например, после завершения карты).
- **Преимущества**: Максимально быстрые операции чтения, так как все данные уже посчитаны и лежат в одном документе. Снижение нагрузки на основную базу данных при частых запросах.
- **Недостатки**: Требует дополнительного места для хранения и усложняет логику записи, так как нужно обновлять несколько коллекций.

### [АКТИВНЫЙ] Агрегация на лету с кэшированием (On-the-fly Aggregation with Caching)
- **Сущности**: Статистика турнира (`Tournament Stats`)
- **Описание**: Для статистики, которая нужна в рамках ограниченного контекста (например, лидерборд игроков внутри одного турнира), используется прямой агрегирующий запрос к "сырым" логам (`PlayerMapParticipation`) с помощью MongoDB Aggregation Pipeline. Результат этого сложного запроса агрессивно кэшируется в Redis.
- **Преимущества**: Не требует создания дополнительных "витринных" таблиц. Данные всегда на 100% консистентны с исходными. Гибкость в построении любых отчетов.
- **Недостатки**: Первый запрос (когда кэш пуст) может быть ресурсоемким. Требует хорошо настроенного кэширования.
- **Реализация**: `TournamentRepository.getTournamentStats`.

### [АРХИВ] Лог + Витрина (Log + Showcase) - Устарел
- **Описание**: Исходный паттерн, который предполагал наличие "витрин" для всех уровней статистики. Был заменен на более гибкий гибридный подход.

## Паттерны тестирования

### [АКТИВНЫЙ] Интеграционное тестирование API-маршрутов

Это основной способ тестирования бэкенд-логики, соответствующий стратегии "Тестовый Трофей". Тест проверяет всю вертикаль: от имитации HTTP-запроса до реальной записи в тестовую БД и проверки ответа.

**Ключевой принцип:**
Тест имитирует реальный HTTP-запрос, создавая нативный объект `Request`, и передает его напрямую в экспортированный из `route.js` обработчик (`POST`, `GET` и т.д.). Это гарантирует, что код, который выполняется в тесте, максимально приближен к тому, что будет выполняться в production.

**Ключевые инструменты:**
- `Jest`: Среда для запуска тестов.
- `@shelf/jest-mongodb`: Управляет созданием и очисткой тестовой БД.

**Важно:** Для ознакомления с полным каноническим примером кода и детальным описанием анти-паттернов, пожалуйста, обратитесь к основному документу: **`architecture/10-testing-strategy.md`**. Этот документ является единственным источником правды по стратегии тестирования в проекте.

# Системные паттерны и архитектурные решения

> Этот файл содержит ключевые архитектурные паттерны и принципы, используемые в проекте MajesticMatchCenter.

## 🏗️ Архитектурные основы

### Feature-Sliced Design (FSD) — ВНЕДРЕНО ✅
**Статус:** Полностью внедрена современная FSD архитектура (Январь 2025)

**Структура слоев:**
- `app/` — Next.js приложение, роутинг, провайдеры
- `features/` — Бизнес-фичи и пользовательские сценарии  
- `entities/` — Бизнес-сущности и их представления
- `shared/` — Переиспользуемые ресурсы без бизнес-логики

**Правила зависимостей:** 
- app → features → entities → shared
- Каждый слой зависит только от нижележащих

**Преимущества:**
- Четкое разделение ответственности
- Максимальное переиспользование кода
- Контролируемое масштабирование
- Улучшенная тестируемость

### Repository Pattern с синглтонами
```typescript
// Репозитории как синглтоны для централизации логики
class MapTemplateRepository extends BaseRepo<IMapTemplate> {
  constructor() {
    super(MapTemplate, 'map-template');
  }
}

const mapTemplateRepo = new MapTemplateRepository();
export default mapTemplateRepo;
```

### Service Layer с бизнес-логикой
```typescript
// Сервисы инкапсулируют бизнес-правила
class MapTemplateService {
  async archiveMapTemplate(id: string) {
    const template = await mapTemplateRepo.findById(id);
    if (template.isArchived) {
      throw new ConflictError('Шаблон уже архивирован');
    }
    return mapTemplateRepo.archive(id);
  }
}
```

## 🎯 Паттерны валидации

### Defense in Depth (Защита в глубину)
1. **Клиентская валидация** - React Hook Form + Zod
2. **API валидация** - Zod схемы в route handlers (первая линия обороны)
3. **Mongoose валидация** - схемы на уровне БД
4. **Бизнес-правила** - проверки в сервисах
5. **Репозиторная валидация** - проверки ObjectId и базовых параметров

### Fail Fast принцип
- Невалидные запросы отклоняются на границе API
- ConflictError для бизнес-правил
- Подробные сообщения об ошибках

## 🔄 Паттерны данных

### Find-and-Save для обновлений
```typescript
// "Золотой стандарт" для PATCH операций
async updateMapTemplate(id: string, data: UpdateData) {
  const template = await repo.findById(id);  // 1. Найти
  template.name = data.name;                 // 2. Изменить
  return template.save();                    // 3. Сохранить (запускает хуки!)
}
```

### Двухслойная архитектура статистики
- **Сырые данные** - детальные записи событий (PlayerMapParticipation)
- **Витрины данных** - агрегированная статистика (PlayerStats)
- **Асинхронное обновление** - через BullMQ очереди

### Explicit Index Naming
```typescript
// Явные имена индексов предотвращают конфликты
mapTemplateSchema.index(
  { name: 1 },
  { 
    name: 'name_unique_active',
    unique: true,
    partialFilterExpression: { archivedAt: { $eq: null } }
  }
);
```

## 🎨 UI паттерны (FSD)

### Shared слой
- **UI компоненты** - Button, Input, Table, Dialog, ErrorBoundary
- **Хуки** - useSearch, useDebounce
- **Провайдеры** - SWRProvider, ThemeProvider
- **Правило** - не знает о бизнес-сущностях

### Entities слой  
- **Model** - типы, мапперы (Mongoose → Frontend)
- **UI** - "глупые" компоненты принимающие props и колбэки
- **Lib** - хуки данных (useMapTemplatesData) и форм (useMapTemplateForm)
- **Правило** - представляет одну бизнес-сущность, НЕ знает о Server Actions

### Features слой
- **UI** - "умные" контейнеры управляющие состоянием и бизнес-логикой
- **API** - Server Actions для мутаций
- **Правило** - реализует пользовательские сценарии, импортирует Server Actions

### App слой
- **Pages** - композиция фич с ErrorBoundary
- **Layouts** - макеты и провайдеры
- **Routing** - Next.js App Router

## 🔥 **НОВЫЕ ПАТТЕРНЫ v2.5 (Январь 2025)**

### TanStack Query v5 Migration — ЭТАЛОН ✅
**Статус:** Map Templates полностью мигрированы, готовы как reference implementation

**Архитектура Query хуков:**
```typescript
// entities/lib/use-map-templates-query.ts
export function useMapTemplatesQuery(searchTerm: string) {
  return useQuery({
    queryKey: ['admin-search', 'mapTemplates', searchTerm],
    queryFn: () => searchMapTemplates(searchTerm),
    enabled: searchTerm.length >= MIN_SEARCH_LENGTH,
    staleTime: 0, // Мгновенное обновление для админки
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
```

**Архитектура Mutation хуков:**
```typescript
// entities/lib/use-map-template-mutations.ts
export function useCreateMapTemplateMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMapTemplateAction,
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ['admin-search', 'mapTemplates'] 
      });
    }
  });
}
```

### Универсальный хук виртуализации — ВНЕДРЕН ✅
**Статус:** Создан переиспользуемый хук для ЛЮБЫХ таблиц проекта

**Принцип "Умной" виртуализации:**
```typescript
// shared/hooks/use-maybe-virtualizer.ts  
export function useMaybeVirtualizer<T>(rows: T[], config: VirtualizerConfig = {}) {
  const enableVirtual = !config.disabled && rows.length > (config.threshold || 100);
  
  return {
    enableVirtual,
    virtualizer: enableVirtual ? useVirtualizer({...}) : null,
    containerRef
  };
}
```

**Готовые пресеты:**
```typescript
VirtualizerPresets.admin         // threshold: 100, для админ-таблиц
VirtualizerPresets.publicRatings // threshold: 50, для публичных рейтингов  
VirtualizerPresets.withImages    // threshold: 30, для тяжелых строк
VirtualizerPresets.mobile        // threshold: 50, оптимизация для мобильных
VirtualizerPresets.always        // threshold: 1, принудительно
VirtualizerPresets.never         // disabled: true, отключено
```

**Переиспользование между сущностями:**
```typescript
// Любая таблица автоматически получает виртуализацию
const { enableVirtual, virtualizer } = useMaybeVirtualizer(players);     // Player[]
const { enableVirtual, virtualizer } = useMaybeVirtualizer(tournaments); // Tournament[] 
const { enableVirtual, virtualizer } = useMaybeVirtualizer(families);    // Family[]
const { enableVirtual, virtualizer } = useMaybeVirtualizer(templates);   // MapTemplate[]
```

**Преимущества:**
- Автоматическое включение/выключение по порогу
- 100% переиспользуемость между сущностями
- TypeScript типизация для любых данных
- Готовые пресеты под разные сценарии
- Устранение дублирования компонентов

**Двойная инвалидация для гарантированного обновления:**
```typescript
// features/ui/page-content.tsx
const { mutateAsync } = useCreateMapTemplateMutation();
const { refetch } = useMapTemplatesQuery(searchTerm);

const handleCreate = async (formData) => {
  await mutateAsync(formData);
  await refetch(); // Дублируем для гарантии
};
```

**Преимущества TanStack Query v5:**
- ✅ Лучший DevTools для отладки
- ✅ Меньше boilerplate кода
- ✅ Встроенная поддержка Server Actions
- ✅ Более предсказуемое поведение cache invalidation

### S3 File Storage Integration — ГОТОВО ✅
**Статус:** Полная интеграция S3 для изображений завершена

**Архитектура загрузки файлов:**
```typescript
// lib/s3/upload.ts
export async function uploadImageVariants(
  file: File,
  entityType: string,
  entityId?: string
): Promise<UploadResult> {
  // 1. Валидация файла
  const inputBuffer = await validateAndPrepareImage(file, MAX_SIZE);
  
  // 2. Создание вариантов (icon, medium, original)
  const variants = await makeVariants(inputBuffer, getVariantSpecs(entityType));
  
  // 3. Параллельная загрузка с public-read ACL
  await Promise.all(variants.map(variant => 
    s3Client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: generateS3Key(entityType, variant.name, uuid),
      Body: variant.buffer,
      ContentType: 'image/webp',
      ACL: 'public-read', // Критично для публичного доступа
    }))
  ));
  
  return { keys, urls, metadata };
}
```

**ImageSet Schema для унификации:**
```typescript
// models/shared/image-set-schema.ts
export interface IImageSet {
  icon: string;     // 64x64px для таблиц
  medium: string;   // 640px для карточек  
  original: string; // 1920px для детального просмотра
}

// Использование в моделях
const mapTemplateSchema = new Schema({
  imageUrls: { type: imageSetSchema, required: false },
  imageKeys: { type: imageKeysSchema, required: false }, // Для удаления
});
```

**React Hook Form + FileDropzone интеграция:**
```typescript
// shared/ui/file-dropzone.tsx
export function FileDropzone({ value, onChange, onRemove }) {
  const handleDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) onChange(file);
  }, [onChange]);
  
  // Адаптивный preview с правильными размерами
  return (
    <div className="border-2 border-dashed rounded-lg p-6">
      {value ? (
        <div className="relative w-full max-w-[280px] h-[200px]">
          <Image 
            src={URL.createObjectURL(value)}
            alt="Preview"
            fill
            className="object-contain rounded"
          />
        </div>
      ) : (
        <DropzoneArea onDrop={handleDrop} />
      )}
    </div>
  );
}
```

**Next.js Image Configuration:**
```javascript
// next.config.mjs
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.regru.cloud',
        pathname: '/majesticmatchcenter/**',
      },
    ],
  },
};
```

### Map Templates как Reference Implementation
**Что копировать в другие сущности:**

1. **Query хуки** - паттерн `useEntityQuery` с правильными настройками
2. **Mutation хуки** - паттерн `useEntityMutations` с инвалидацией
3. **Form интеграция** - React Hook Form + FileDropzone для файлов
4. **Table UI** - отображение иконок через `imageUrls.icon`
5. **Dialog UI** - универсальный create/edit паттерн
6. **Server Actions** - типизированные с S3 интеграцией

**Миграционный чеклист для других сущностей:**
- [ ] Создать TanStack Query хуки по образцу map-templates
- [ ] Добавить S3 поля в схему (если нужны изображения)
- [ ] Мигрировать UI компоненты на новые хуки
- [ ] Обновить Server Actions для работы с S3
- [ ] Добавить тесты по образцу map-templates

## 🧪 Паттерны тестирования

### Тестовый Трофей v2.2
- **Интеграционные тесты API** (90%) - основа уверенности
- **Unit тесты** (5%) - только для сложной логики
- **E2E тесты** (5%) - критические пути
- **Статический анализ** - ESLint, TypeScript

### Самодостаточные тесты
```typescript
// Каждый тест управляет своим lifecycle
describe('API Route', () => {
  beforeAll(async () => {
    await connectToTestDB();
  });
  
  beforeEach(async () => {
    await clearTestDB();        // Чистое состояние
    vi.clearAllMocks();
  });
  
  afterAll(async () => {
    await disconnectFromTestDB();
  });
});
```

### Селективное мокирование
- ✅ Мокируем внешние сервисы (Meilisearch, S3)
- ❌ НЕ мокируем внутренние сервисы/репозитории
- ✅ Используем реальную тестовую БД

## ⚡ Кэширование

### Многослойная стратегия
1. **SWR** - клиентское кэширование
2. **Next.js Cache** - серверное кэширование с тегами
3. **Redis** - распределенное кэширование
4. **Memory** - in-memory для тестов

### Cache Invalidation
```typescript
// Инвалидация через теги
await revalidateTag('map-templates');
// + инвалидация SWR на клиенте
mutate('/api/admin/map-templates');
```

## 🔍 Поиск и индексирование

### Meilisearch интеграция
- **Синхронная индексация** - немедленное появление в поиске
- **Асинхронная оптимизация** - через BullMQ очереди
- **Универсальный API** - `/api/search?entities=mapTemplates,players`

### Селективная индексация
```typescript
// Индексируем только активные документы
if (!document.isArchived) {
  await searchService.syncDocument('update', 'MapTemplate', document.id);
}
```

## 🔧 TypeScript паттерны

### Строгая типизация
- **Интерфейсы** - для структур данных
- **Types** - для union types
- **DTO мапперы** - разделение Mongoose и Frontend типов

### Path mapping
```json
{
  "paths": {
    "@/shared/*": ["src/shared/*"],
    "@/entities/*": ["src/entities/*"], 
    "@/features/*": ["src/features/*"]
  }
}
```

## 📈 Производительность

### Server Components приоритет
- Максимальное использование RSC
- Минимальная клиентская гидратация
- Оптимизация bundle size

### Lazy loading
- Динамические импорты для тяжелых компонентов
- Code splitting по route-уровню

## 🛡️ **БУДУЩИЕ УЛУЧШЕНИЯ СИСТЕМЫ ПРАВ ДОСТУПА**

> Планы развития текущей архитектуры permissions для повышения безопасности и гибкости

### Эволюция авторизации (Приоритет: СРЕДНИЙ)

#### 🎯 **От env к сессиям**
- **NextAuth.js интеграция** - замена `process.env.ADMIN_ROLE` на сессии пользователей
- **Middleware защита** - автоматическая проверка доступа ко всем admin routes
- **Серверные компоненты** - получение роли из сессии в layout компонентах

#### 🗄️ **Централизация в БД**
- **RolePermissions модель** - вынос конфигурации прав из кода в базу данных
- **Динамическое управление** - создание/редактирование ролей через админ-панель  
- **Redis кэширование** - быстрый доступ к правам с инвалидацией при изменениях

#### 🔒 **Middleware автоматизация**
```typescript
// withAuth wrapper для автоматической проверки
export function withAuth(requiredPermissions: Permission[]) {
  return async (handler) => {
    const hasAccess = await checkPermissions(req, requiredPermissions);
    if (!hasAccess) return res.status(403).json({error: 'Forbidden'});
    return handler(req, res);
  };
}
```

#### 👥 **Расширенная ролевая модель**
- **Новые роли:** `moderator`, `viewer`, `operator` для детального управления
- **Гранулярные права:** разделение по сущностям (canEditPlayers, canViewTournaments)
- **Временные права:** роли с ограниченным сроком действия  
- **Контекстные права:** права в рамках конкретного турнира/семьи

### Технические улучшения

#### ⚡ **Производительность**
- **Мемоизация прав** - кэширование результатов проверки
- **Batch проверки** - групповая проверка множественных прав
- **Prefetch ролей** - предзагрузка для улучшения UX

#### 🧪 **Тестирование**  
- **Mock ролей** - удобная подмена ролей в unit-тестах
- **E2E тесты прав** - автоматическая проверка доступа по ролям
- **Матрица прав** - документация всех комбинаций ролей и прав

#### 🔍 **Мониторинг**
- **Dashboard прав** - визуализация использования ролей
- **Алерты безопасности** - уведомления о подозрительной активности
- **Аудит доступа** - отчеты по использованию прав администраторами

**Обновлено:** Январь 2025  
**Статус:** Production Ready с FSD архитектурой ✅