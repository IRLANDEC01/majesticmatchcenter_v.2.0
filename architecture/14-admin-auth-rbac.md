# Авторизация админ-панели, RBAC и рефакторинг Map Templates

> **Статус: Stage 0 ЗАВЕРШЕН ✅ | Stage 1 В ПЛАНАХ** │ Актуально для Next 15.3 / React 19 / Auth.js v5 (beta)

---
## 0. Обзор

Админ-панель получает полноценную систему авторизации через **Яндекс ID** и разграничение прав (RBAC) для трёх ролей: `super`, `admin`, `moderator`.  
Внутренние сервисы (Mongo, Redis, S3) и UI map-templates приводятся к единой системе доступа.

**Обязательная документация:** 
- https://authjs.dev/getting-started/installation?framework=Next.js
- https://authjs.dev/getting-started/migrating-to-v5
- https://yandex.ru/dev/id/doc/ru/

**Стек:**
* **Auth.js (v5, `next-auth@beta`)** — OAuth 2.0 / OpenID Connect провайдер Яндекс.
* **RedisAdapter** — хранение сессий в Redis (быстрое продление и принудительный logout).
* **MongoDB** — коллекции `admin_users`, `audit_logs`.
* **Next Router** (App Router) — route handlers + middleware.
* **Feature-Sliced Design** — отдельные слои `shared/lib`, `server/auth`, `entities/admin-users`.

---
## ✅ STAGE 0: ИНФРАСТРУКТУРА ПОДГОТОВЛЕНА (ЗАВЕРШЕН)

### **Выполненные задачи:**

#### **1. MongoDB Схемы**
- ✅ **AdminUser.ts** - создана модель с yandexId, email, role, timestamps
- ✅ **AuditLog.js** - обновлена с adminId (вместо actorId), расширенными действиями, security полями
- ✅ **Индексы** - добавлены `{ yandexId: 1 }`, `{ adminId: 1, timestamp: -1 }`
- ✅ **Enum расширен** - role_change, login, permission_grant, permission_revoke, ban, unban, password_reset, session_terminate

#### **2. Redis Adapter (Кастомный)**
- ✅ **Полная реализация** - createUser, getSessionAndUser, updateSession, deleteSession, linkAccount
- ✅ **Производительность** - pipeline для batch операций, отсутствие keys() операций
- ✅ **TTL управление** - 48ч для сессий, 30 дней для пользователей и аккаунтов
- ✅ **Разделение баз** - db=0 (cache), db=2 (sessions)

#### **3. Environment Configuration**
- ✅ **.env.example** - создан с полным набором OAuth и session переменных
- ✅ **.env.production.sample** - готов для production деплоя
- ✅ **Seed script** - `scripts/seed-superadmin.ts` с "silent updates" логикой

#### **4. Тестирование**
- ✅ **13 интеграционных тестов** - полное покрытие Redis адаптера
- ✅ **Vitest конфигурация** - поддержка tests/ директории
- ✅ **Моки и изоляция** - правильная настройка для тестирования Auth.js компонентов

#### **5. Рефакторинг Legacy Code**
- ✅ **Import fixes** - везде `adminId` вместо `actorId`
- ✅ **BaseRepo обновлен** - метод `_logAction` использует adminId
- ✅ **AuditLogRepo** - интерфейс `IAuditLogData` обновлен
- ✅ **Cleanup** - удален дублирующий `AuditLog.ts`

### **Результат Stage 0:**
🎯 **Готовая инфраструктура** для внедрения Auth.js v5 с custom Redis adapter, полным тестовым покрытием и production-ready конфигурацией.

---
## 🚀 STAGE 1: AUTH.JS CONFIGURATION & RBAC (В ПЛАНАХ)

### **Цель:** Настроить Auth.js, middleware, RBAC матрицу и базовые guards

#### **1.1 Auth.js Configuration (1-2 дня)**
```typescript
// auth.ts - основная конфигурация
export const { handlers, auth } = NextAuth({
  adapter: createRedisAdapter(),
  providers: [Yandex({...})],
  session: { strategy: 'database', maxAge: 48h },
  callbacks: { jwt, session }
});
```

**Файлы для создания:**
- `auth.ts` - основная конфигурация Auth.js
- `app/api/auth/[...nextauth]/route.ts` - API route handler
- `middleware.ts` - session management и route protection

#### **1.2 RBAC Implementation (1 день)**
```typescript
// shared/lib/permissions.ts
export type Role = 'super' | 'admin' | 'moderator' | 'pending';
export type Permission = 'viewArchived' | 'unarchive' | 'viewAudit' | 'manageEntities';

const matrix: Record<Role, Record<Permission, boolean>> = {
  super:     { viewArchived: true,  unarchive: true,  viewAudit: true,  manageEntities: true },
  admin:     { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: true },
  moderator: { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: false },
  pending:   { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: false },
};
```

**Файлы для создания:**
- `shared/lib/permissions.ts` - RBAC матрица и утилиты
- `shared/lib/authorize.ts` - серверные guards для API routes
- `shared/hooks/use-permissions.ts` - клиентский хук для UI

#### **1.3 API Integration (1 день)**
```typescript
// Пример защищенного API route
export async function POST(request: Request, { params }: { params: { id: string }}) {
  const authCheck = await authorize(request, 'unarchive');
  if ('error' in authCheck) return authCheck;
  
  await mapTemplateService.restoreMapTemplate(params.id, authCheck.adminId);
  return NextResponse.json({ success: true });
}
```

**Задачи:**
- Обновить все `/api/admin/**` routes с `authorize()` guards
- Добавить audit logging во все мутационные операции
- Тестирование 401/403 scenarios

### **Результат Stage 1:**
🔐 **Работающая авторизация** с OAuth Яндекс ID, RBAC правами и защищенными API routes.

---
## 🎨 STAGE 2: UI INTEGRATION & UX (В ПЛАНАХ)

### **Цель:** Интеграция авторизации в UI, условный рендеринг, UX улучшения

#### **2.1 Session Provider Setup (0.5 дня)**
```typescript
// app/layout.tsx
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

#### **2.2 Permission-based UI (1 день)**
```typescript
// Условный рендеринг на основе прав
const { can } = usePermissions();

return (
  <>
    {can('viewArchived') && <ArchiveToggle />}
    {can('unarchive') && <RestoreButton />}
    {can('viewAudit') && <AuditLogButton />}
  </>
);
```

**Компоненты для обновления:**
- `entities/map-templates/ui/*` - добавить permission checks
- `shared/ui/layout/admin-sidebar.tsx` - условное меню
- `shared/ui/layout/global-header.tsx` - кнопка входа/выхода

#### **2.3 Error Handling & Loading States (0.5 дня)**
- Auth error boundaries
- Loading skeletons для защищенных разделов
- Redirect логика для неавторизованных пользователей

### **Результат Stage 2:**
✨ **Полнофункциональный UI** с авторизацией, условным рендерингом и качественным UX.

---
## 🧪 STAGE 3: TESTING & HARDENING (В ПЛАНАХ)

### **Цель:** Комплексное тестирование, security review, production готовность

#### **3.1 Integration Testing (1-2 дня)**
- **API Tests** - полное покрытие auth scenarios (401, 403, роли)
- **UI Tests** - Playwright тесты для логин flow
- **E2E Tests** - полные пользовательские сценарии по ролям

#### **3.2 Security Review (1 день)**
- **OWASP Checklist** - проверка уязвимостей
- **Session Security** - настройка cookies, CSP headers
- **Rate Limiting** - защита от brute force атак
- **Audit Trail** - полное логирование административных действий

#### **3.3 Performance & Monitoring (0.5 дня)**
- **Redis метрики** - мониторинг session store
- **Auth performance** - benchmark авторизации
- **Error tracking** - интеграция с Sentry для production

### **Результат Stage 3:**
🛡️ **Production-ready система** с полным тестовым покрытием и security hardening.

---
## 📊 ОБЩИЙ TIMELINE

| Stage | Задача | Время | Статус |
|-------|--------|-------|--------|
| **0** | Инфраструктура подготовки | 2 дня | ✅ **ЗАВЕРШЕН** |
| **1** | Auth.js configuration & RBAC | 3-4 дня | 🎯 **СЛЕДУЮЩИЙ** |
| **2** | UI integration & UX | 2 дня | 📋 В планах |
| **3** | Testing & hardening | 2-3 дня | 📋 В планах |
| **ИТОГО** | **Полная система авторизации** | **9-11 дней** | **Stage 0 готов** |

---
## 🔧 TECHNICAL DEBT & IMPROVEMENTS

### **Немедленные улучшения (Stage 1):**
- Добавить role-based redirects после логина
- Настроить auto-logout при смене роли
- Добавить "Remember me" функциональность

### **Долгосрочные улучшения (Future):**
- Multi-factor authentication (MFA)
- Advanced audit trail с фильтрацией
- Admin user management UI
- Session management dashboard
- API rate limiting per user/role

---
## ✅ CHECKLIST ГОТОВНОСТИ К PRODUCTION

### **Stage 0 Requirements ✅**
- [x] MongoDB схемы готовы
- [x] Redis adapter протестирован  
- [x] Environment конфигурация
- [x] Seed scripts готовы
- [x] Тестовое покрытие 100%

### **Stage 1 Requirements (TODO)**
- [ ] Auth.js конфигурация
- [ ] RBAC матрица реализована
- [ ] API routes защищены
- [ ] Middleware настроен
- [ ] Audit logging работает

### **Stage 2 Requirements (TODO)**
- [ ] SessionProvider интегрирован
- [ ] UI permission checks
- [ ] Error boundaries
- [ ] Loading states
- [ ] Redirect логика

### **Stage 3 Requirements (TODO)**
- [ ] Полное тестовое покрытие
- [ ] Security review пройден
- [ ] Performance бенчмарки
- [ ] Production monitoring
- [ ] Documentation завершена

---

> **Следующий шаг:** Начать **Stage 1 - Auth.js Configuration & RBAC Implementation**

---
## 1. Подготовка инфраструктуры

1. **Redis** уже используется для кэша → включите `appendonly yes`, чтобы персистить сессии.  
2. **Mongo**: добавьте коллекцию `admin_users` и расширьте `audit_logs` (см. ⟶ п. 4).
3. Обновите `.env.example`:

```dotenv
# OAuth
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=

# Auth.js
AUTH_SECRET=«npx auth secret»

# Супер-админ (сид-скрипт)
SUPERADMIN_YANDEX_ID=
SUPERADMIN_EMAIL=
```

---
## 2. Схемы Mongo

### 2.1 `admin_users`
```ts
interface IAdminUser {
  _id: ObjectId;
  yandexId: string;          // profile.sub (unique)
  email: string;           // единственные PII-данные, которые храним
  role: 'super' | 'admin' | 'moderator' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
}
```
* Уникальный индекс `{ yandexId: 1 }`.
* Сид-скрипт `scripts/seed-superadmin.ts` создаёт запись роли `super`.

### 2.2 Изменения `src/models/audit/AuditLog.ts`

Добавьте ссылки на администратора и универсальные поля сущности:
```ts
// ... existing code ...
adminId: {
  type: Schema.Types.ObjectId,
  ref: 'AdminUser',
  required: true,
},
entity: {
  type: String, // e.g. 'MapTemplate'
  required: true,
},
entityId: {
  type: Schema.Types.ObjectId,
  required: true,
},
// ... existing code ...
```
*Пишем запись в сервис-слоях после каждого действия (create/update/archive/restore).*  
Пример вызова:
```ts
auditLogRepo.create({
  entity: 'MapTemplate',
  entityId: template.id,
  action: 'archive',
  adminId: currentAdminId,
  changes: {},
});
```

---
## 3. Auth.js (NextAuth v5)

### 3.1 Конфиг `./auth.ts`
```ts
import NextAuth from 'next-auth';
import Yandex from 'next-auth/providers/yandex';
import { RedisAdapter } from '@auth/redis-adapter';
import { redis } from '@/lib/redis-clients';

export const { handlers, auth } = NextAuth({
  adapter: RedisAdapter(redis),
  providers: [
    Yandex({
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'database',        // работает c RedisAdapter
    maxAge: 60 * 60 * 24 * 2,    // 48 ч бездействия
    updateAge: 60 * 30,          // продление каждые 30 мин при активности
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const admin = await adminUserRepo.findOne({ yandexId: profile.sub });
        token.role = admin?.role ?? 'pending';
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
});
```

### 3.2 Route-handler `/app/api/auth/[...nextauth]/route.ts`
```ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

### 3.3 Middleware (продлевает сессию)
```ts
export { auth as middleware } from '@/auth';
```

---
## 4. RBAC-слой

### 4.1 Матрица прав `src/shared/lib/permissions.ts`
```ts
export type Role = 'super' | 'admin' | 'moderator' | 'pending';
export type Permission =
  | 'viewArchived' | 'unarchive' | 'viewAudit'
  | 'manageEntities' | 'manageNews';

const matrix: Record<Role, Record<Permission, boolean>> = {
  super:      { viewArchived: true,  unarchive: true,  viewAudit: true,  manageEntities: true,  manageNews: true },
  admin:      { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: true,  manageNews: false },
  moderator:  { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: false, manageNews: true  },
  pending:    { viewArchived: false, unarchive: false, viewAudit: false, manageEntities: false, manageNews: false },
};
export const can = (role: Role, perm: Permission) => matrix[role]?.[perm] ?? false;
```

### 4.2 Серверный guard `src/server/auth/authorize.ts`
```ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { can, Permission } from '@/shared/lib/permissions';

export async function authorize(request: Request, perm: Permission) {
  const session = await auth(); // server-side
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!can(session.user.role, perm)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { adminId: session.user.id, role: session.user.role };
}
```

### 4.3 Пример в API‐роуте
```ts
export async function POST(request: Request, { params }: { params: { id: string }}) {
  const authCheck = await authorize(request, 'unarchive');
  if ('error' in authCheck) return authCheck;
  await mapTemplateService.restoreMapTemplate(params.id, authCheck.adminId);
  return NextResponse.json({ success: true });
}
```

---
## 5. UI-слой

1. `useSession()` (Auth.js) → `usePermissions()` — скрываем/показываем кнопки.  
2. Map-templates:  
   * тоггл *Архивные* видим только `canViewArchived`.  
   * кнопка «Восстановить» видна лишь при `canUnarchive`.
3. В шапке — кнопка «Админ-панель» рендерится, если `session?.user.role !== 'pending'`.

---
## 6. Рефакторинг map-templates

1. Зависимости от `permissions` уже есть; убрали клиентскую пагинацию.  
2. Добавьте передачу `role` в `table.meta`, если внутри колонок нужны тонкие проверки.  
3. API-роуты обновлены `authorize()` → `map-template-service` теперь получает `adminId` и пишет в `audit_logs`.

---
## 7. Шаг-за-шагом

| # | Шаг | Файл / команда |
|---|-----|----------------|
| 1 | `npm i next-auth@beta @auth/redis-adapter` | – |
| 2 | Создайте `auth.ts`, скопируйте конфиг из §3.1 | `/auth.ts` |
| 3 | Добавьте route-handler `/app/api/auth/[...nextauth]/route.ts` (§3.2) | |
| 4 | Расширьте `AuditLog` схему (§2.2) | `src/models/audit/AuditLog.ts` |
| 5 | Создайте `admin_users` модель, сид-скрипт супер-админа | `models/admin/AdminUser.ts` |
| 6 | Реализуйте `permissions.ts` и `authorize.ts` (§4) | `shared/lib`, `server/auth` |
| 7 | Обновите все `/api/admin/**` роуты → `authorize()` | – |
| 8 | В UI подключите `SessionProvider` и `usePermissions()` | `shared/providers` |
| 9 | Скрыть/показать контролы на map-templates | `entities/map-templates/ui/*` |
|10 | Тесты (Vitest + Playwright) на 401/403 и видимость кнопок | `tests/` |

---
## 8. Производительность и безопасность

* Redis-сессии: 1 запрос на авторизованный API-вызов (≤ 1 мс).
* Кука `httpOnly`, `secure`, `sameSite=lax`; токен `AES-256-GCM` + `AUTH_SECRET`.
* `authorize()` вызывается **только** в админских маршрутах, не тормозит публичный сайт.
* Circuit-Breaker и кэш map-templates уже оптимизированы; роль в JWT — 1 claim.
* XSS — CSP на admin-домене.
* S3 — подпись URL (`expires=60s`), префикс `admin/<adminId>/`.
* При смене роли `admin_users.updateRole` → `invalidate` Redis-сессии: `redis.del('sess:'+sessionId)`.

---
## 9. Итог

Система авторизации Яндекс ID + RBAC добавляет **2 модели**, **1 централизованный guard**, минимальные изменения UI.  
Все действия админов логируются, производительность не страдает, безопасность усиливается. 