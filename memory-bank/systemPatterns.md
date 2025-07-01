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

> Версия 2.3 — обновлено 01.07.2025

---

## 1. Data Access Layer (Repositories)

### Базовые принципы
- Все репозитории наследуют от `BaseRepo`
- Методы `find*`, `create`, `update`, `archive` стандартизированы
- Audit trail через `_logAction(entity, entityId, action, adminId, changes)`
- Soft deletion через `{ isArchived: true }`

### Паттерн использования
```typescript
// Всегда передаем adminId для audit trail
await mapTemplateRepo.archive(templateId, adminId);
// База автоматически создаст запись в audit_logs
```

---

## 2. Service Layer Business Logic

### Принципы
- Сервисы инкапсулируют бизнес-логику и валидацию
- Один сервис на доменную область (families, players, tournaments)
- Композиция через dependency injection репозиториев
- Транзакционность через session parameter

### RBAC в сервисах
```typescript
// Сервисы получают adminId для audit trail
async archiveMapTemplate(templateId: string, adminId: ObjectId) {
  const template = await this.mapTemplateRepo.findById(templateId);
  if (!template) throw new NotFoundError('MapTemplate not found');
  
  return await this.mapTemplateRepo.archive(templateId, adminId);
}
```

---

## 3. API Layer & Error Handling

### Стандартные коды ответов
- `200 OK` — успешная операция
- `201 Created` — создание ресурса
- `400 Bad Request` — валидация не прошла
- `401 Unauthorized` — не авторизован
- `403 Forbidden` — нет прав доступа
- `404 Not Found` — ресурс не найден
- `500 Internal Server Error` — серверная ошибка

### Паттерн защищенного API route
```typescript
export async function POST(request: Request, { params }: { params: { id: string }}) {
  try {
    // 1. Authorization check
    const authCheck = await authorize(request, 'unarchive');
    if ('error' in authCheck) return authCheck;
    
    // 2. Business logic
    await mapTemplateService.restoreMapTemplate(params.id, authCheck.adminId);
    
    // 3. Success response
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 4. TanStack Query Patterns

### Стандартные хуки
```typescript
// Query для списка с поиском
const { data: templates, isLoading } = useMapTemplatesQuery({
  searchTerm: debouncedSearch,
  status: selectedStatus,
});

// Мутации с оптимистичными обновлениями
const archiveMutation = useArchiveMapTemplateMutation();
```

### Cache Invalidation
```typescript
// После мутации инвалидируем связанные запросы
queryClient.invalidateQueries(['mapTemplates']);
queryClient.invalidateQueries(['mapTemplate', templateId]);
```

---

## 5. Form Patterns (React Hook Form + Zod)

### Стандартная схема формы
```typescript
const MapTemplateSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  // ... другие поля
});

type MapTemplateFormData = z.infer<typeof MapTemplateSchema>;
```

### Универсальный useServerErrors хук
```typescript
// ✅ ПАТТЕРН: Установка server-side ошибок
const { setServerErrors } = useServerErrors<MapTemplateFormData>(form);

// В обработчике мутации
if (!result.success && result.errors) {
  setServerErrors(result.errors, ['general']); // исключаем 'general'
}
```

---

## 6. Caching Strategy (Redis + Next.js)

### Слоистый кэш
1. **Browser Cache** (TanStack Query v5) — 30s stale-while-revalidate
2. **Next.js Cache** — ISR + on-demand revalidation
3. **Redis Cache** — 5min hot data, 1h warm data
4. **MongoDB** — источник правды

### Паттерн инвалидации
```typescript
// После изменения данных
await cache.invalidateByTags(['map-templates', 'map-template:123']);
revalidatePath('/admin/map-templates');
```

---

## 7. Testing Patterns

### Интеграционные тесты API
```typescript
describe('POST /api/admin/map-templates', () => {
  beforeEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });

  it('должен создать новый шаблон карты', async () => {
    const payload = { name: 'Test Template' };
    const { req, res } = createMocks({ method: 'POST', body: payload });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    // ... проверки
  });
});
```

### Настройка изоляции
```bash
# Обязательно для стабильности
cross-env CACHE_DRIVER=memory node node_modules/jest/bin/jest.js --runInBand
```

---

## 8. ✅ NEW: Auth.js v5 Patterns

### 8.1 OAuth Configuration Pattern
```typescript
// auth.ts - централизованная конфигурация
export const { handlers, auth } = NextAuth({
  adapter: createRedisAdapter(redis, { 
    database: 2,  // отдельная БД для сессий
    keyPrefix: 'auth:',
  }),
  providers: [
    Yandex({
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'database',
    maxAge: 48 * 60 * 60, // 48 часов
    updateAge: 30 * 60,   // обновление каждые 30 мин
  },
  callbacks: {
    async jwt({ token, profile }) {
      // Получаем роль из БД при авторизации
      if (profile) {
        const admin = await adminUserRepo.findOne({ yandexId: profile.sub });
        token.role = admin?.role ?? 'pending';
        token.adminId = admin?._id?.toString();
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as Role;
      session.user.adminId = token.adminId as string;
      return session;
    },
  },
});
```

### 8.2 RBAC Authorization Pattern
```typescript
// shared/lib/permissions.ts - матрица прав
export type Role = 'super' | 'admin' | 'moderator' | 'pending';
export type Permission = 'viewArchived' | 'unarchive' | 'viewAudit' | 'manageEntities' | 'manageNews';

const RBAC_MATRIX: Record<Role, Record<Permission, boolean>> = {
  super:     { viewArchived: true,  unarchive: true,  viewAudit: true,  manageEntities: true,  manageNews: true },
  admin:     { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: true,  manageNews: false },
  moderator: { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: false, manageNews: true },
  pending:   { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: false, manageNews: false },
};

export const can = (role: Role, permission: Permission): boolean => 
  RBAC_MATRIX[role]?.[permission] ?? false;
```

### 8.3 Server-side Authorization Guard
```typescript
// shared/lib/authorize.ts - серверная авторизация
export async function authorize(
  request: Request, 
  requiredPermission: Permission
): Promise<{ adminId: string; role: Role } | NextResponse> {
  const session = await auth(); // server-side session
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!can(session.user.role, requiredPermission)) {
    return NextResponse.json({ 
      error: 'Forbidden', 
      required: requiredPermission,
      userRole: session.user.role 
    }, { status: 403 });
  }
  
  return { 
    adminId: session.user.adminId, 
    role: session.user.role 
  };
}
```

### 8.4 Client-side Permission Hook
```typescript
// shared/hooks/use-permissions.ts - клиентские права
export function usePermissions() {
  const { data: session, status } = useSession();
  
  return {
    role: session?.user?.role ?? 'pending',
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    can: (permission: Permission) => 
      session?.user?.role ? can(session.user.role, permission) : false,
  };
}

// Использование в компонентах
const { can, isAuthenticated } = usePermissions();

return (
  <>
    {can('viewArchived') && <ArchiveToggle />}
    {can('unarchive') && <RestoreButton />}
    {isAuthenticated && <AdminPanel />}
  </>
);
```

### 8.5 Redis Session Storage Pattern
```typescript
// lib/auth/redis-adapter.ts - custom adapter
export function createRedisAdapter(redis: Redis, options: RedisAdapterOptions = {}) {
  const keyPrefix = options.keyPrefix ?? 'auth:';
  const database = options.database ?? 2;
  
  return {
    async createSession(session: AdapterSession) {
      const pipeline = redis.pipeline();
      pipeline.select(database);
      pipeline.setex(
        `${keyPrefix}session:${session.sessionToken}`,
        session.expires.getTime() / 1000,
        JSON.stringify(session)
      );
      await pipeline.exec();
      return session;
    },
    
    async getSessionAndUser(sessionToken: string) {
      const pipeline = redis.pipeline();
      pipeline.select(database);
      pipeline.get(`${keyPrefix}session:${sessionToken}`);
      pipeline.get(`${keyPrefix}user:${userId}`);
      const results = await pipeline.exec();
      
      // Parsing и validation...
      return { session, user };
    },
    
    // ... другие методы
  };
}
```

### 8.6 Audit Trail Pattern
```typescript
// models/audit/AuditLog.js - расширенная схема
const auditLogSchema = new Schema({
  entity: { type: String, required: true, enum: ['MapTemplate', 'Player', 'Family', 'Tournament'] },
  entityId: { type: Schema.Types.ObjectId, required: true },
  action: { 
    type: String, 
    required: true, 
    enum: ['create', 'update', 'archive', 'restore', 'role_change', 'login', 'permission_grant'] 
  },
  adminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  changes: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Использование в сервисах
async archiveMapTemplate(templateId: string, adminId: ObjectId, context?: AuditContext) {
  const template = await this.mapTemplateRepo.archive(templateId, adminId);
  
  // Автоматическое логирование через BaseRepo._logAction
  await this.auditLogRepo.create({
    entity: 'MapTemplate',
    entityId: templateId,
    action: 'archive',
    adminId,
    changes: {},
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
  });
  
  return template;
}
```

### 8.7 Middleware Protection Pattern
```typescript
// middleware.ts - route protection
export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    '/admin/:path*',           // защищаем админку
    '/api/admin/:path*',       // защищаем admin API
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)', // исключения
  ],
};

// Дополнительная логика в middleware (опционально)
export async function middleware(request: NextRequest) {
  const session = await auth();
  
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/api/auth/signin', request.url));
    }
    
    if (session.user.role === 'pending') {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }
  
  return NextResponse.next();
}
```

---

## 9. Component Patterns & UI

### Reusable UI Components
```typescript
// shared/ui/confirmation-dialog.tsx - переиспользуемый диалог
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  isPending?: boolean;
}
```

### Feature-Sliced Design Structure
```
entities/
  map-templates/
    model/     # типы, маппинг, бизнес-логика
    lib/       # хуки, утилиты
    ui/        # компоненты представления

features/
  map-templates-management/
    ui/        # страницы, сложные компоненты
    api/       # server actions

shared/
  ui/        # переиспользуемые UI компоненты
  hooks/     # универсальные хуки
  lib/       # утилиты, конфигурации
```

---

## 10. Performance & Security

### Performance Optimizations
- TanStack Query cache с `refetchOnMount: false` для админки
- TanStack Virtual для таблиц >100 записей
- Redis pipeline для batch операций
- Debounced search с TanStack Pacer

### Security Patterns
- **Session Security**: httpOnly cookies, secure=true в production
- **RBAC Enforcement**: проверки как на сервере, так и в UI
- **Audit Trail**: полное логирование административных действий
- **Input Validation**: Zod схемы на клиенте и сервере
- **Error Handling**: никаких sensitive данных в error responses

---

> **Принципы проекта:**
> 1. **Максимальная переиспользуемость** — извлекаем общие паттерны
> 2. **Типобезопасность** — TypeScript везде, никаких `any`
> 3. **Тестируемость** — изолированные компоненты и сервисы
> 4. **Производительность** — ленивая загрузка, умное кэширование
> 5. **Безопасность** — RBAC, audit trail, валидация на всех уровнях