# Auth.js v5 Implementation Roadmap

> **Статус:** Stage 0 ✅ ЗАВЕРШЕН | Stage 1 🎯 СЛЕДУЮЩИЙ
> **Прогресс:** 30% | **ETA:** 7-8 дней до полного завершения

---

## 🏁 **STAGE 0: INFRASTRUCTURE - ЗАВЕРШЕН ✅**

### **Результаты (2 дня):**
- ✅ **MongoDB Schemas:** AdminUser.ts + расширенный AuditLog.js
- ✅ **Redis Adapter:** Кастомный с 13/13 тестами, pipeline операции
- ✅ **Environment:** Полная OAuth конфигурация dev + production
- ✅ **Testing:** Vitest + моки для Auth.js компонентов
- ✅ **Legacy Cleanup:** adminId refactoring по всему проекту

### **Ключевые файлы:**
- `src/models/admin/AdminUser.ts` - схема администраторов
- `src/models/audit/AuditLog.js` - расширенный audit trail
- `src/lib/auth/redis-adapter.ts` - кастомный адаптер
- `tests/auth/redis-adapter.test.ts` - полное тестовое покрытие
- `scripts/seed-superadmin.ts` - создание супер-админа

---

## 🚀 **STAGE 1: CONFIGURATION & RBAC - В ПЛАНАХ**

### **Цель:** Настроить Auth.js, RBAC матрицу, защищенные API routes
### **Время:** 3-4 дня

#### **1.1 Auth.js Core Setup (1-2 дня)**

**Создать файлы:**
```bash
# Основная конфигурация
touch auth.ts
touch app/api/auth/[...nextauth]/route.ts
touch middleware.ts
```

**Задачи:**
- [ ] **auth.ts:** Полная конфигурация с Yandex provider, callbacks, session settings
- [ ] **API Route:** Стандартный handler для Auth.js routes
- [ ] **Middleware:** Session management + route protection
- [ ] **Environment:** Добавить YANDEX_CLIENT_ID, YANDEX_CLIENT_SECRET в .env

**Критерии приемки:**
- OAuth логин через Яндекс ID работает
- Сессии сохраняются в Redis (db=2)
- Middleware защищает /admin/* routes

#### **1.2 RBAC Implementation (1 день)**

**Создать файлы:**
```bash
touch src/shared/lib/permissions.ts
touch src/shared/lib/authorize.ts
touch src/shared/hooks/use-permissions.ts
```

**Задачи:**
- [ ] **RBAC Matrix:** 4 роли × 5 permissions, полная матрица прав
- [ ] **Server Guards:** authorize() функция для API routes
- [ ] **Client Hook:** usePermissions() для UI компонентов
- [ ] **Types:** Role, Permission, AuthContext интерфейсы

**Матрица прав:**
| Role | viewArchived | unarchive | viewAudit | manageEntities | manageNews |
|------|--------------|-----------|-----------|----------------|------------|
| super | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ❌ | ❌ | ❌ | ✅ | ❌ |
| moderator | ❌ | ❌ | ❌ | ❌ | ✅ |
| pending | ❌ | ❌ | ❌ | ❌ | ❌ |

#### **1.3 API Protection (1 день)**

**Обновить API routes:**
```bash
# Добавить authorize() во все admin API
src/app/api/admin/map-templates/route.ts
src/app/api/admin/map-templates/[id]/route.ts
src/app/api/admin/map-templates/[id]/archive/route.ts
# ... и все остальные admin API routes
```

**Задачи:**
- [ ] **Authorization Guards:** Все `/api/admin/**` routes защищены
- [ ] **Audit Logging:** Все мутации логируются с adminId
- [ ] **Error Handling:** Правильные 401/403 responses
- [ ] **Testing:** Тесты для unauthorized scenarios

**Паттерн защищенного API:**
```typescript
export async function POST(request: Request, { params }) {
  // 1. Authorization check
  const authCheck = await authorize(request, 'manageEntities');
  if ('error' in authCheck) return authCheck;
  
  // 2. Business logic with audit
  await service.operation(params.id, authCheck.adminId);
  
  // 3. Success response
  return NextResponse.json({ success: true });
}
```

### **Результат Stage 1:**
🔐 **Работающая авторизация** с OAuth Яндекс ID, RBAC правами и защищенными API routes.

---

## 🎨 **STAGE 2: UI INTEGRATION & UX - В ПЛАНАХ**

### **Цель:** Интеграция авторизации в UI, условный рендеринг, UX
### **Время:** 2 дня

#### **2.1 Session Provider (0.5 дня)**

**Задачи:**
- [ ] **SessionProvider:** Обернуть app layout
- [ ] **Loading States:** Скелетоны для auth проверок
- [ ] **Error Boundaries:** Auth-specific error handling

#### **2.2 Permission-based UI (1 день)**

**Обновить компоненты:**
```bash
# Добавить permission checks
src/entities/map-templates/ui/map-templates-columns.tsx
src/entities/map-templates/ui/map-template-dialog.tsx
src/shared/ui/layout/admin-sidebar.tsx
src/shared/ui/layout/global-header.tsx
```

**Задачи:**
- [ ] **Conditional Rendering:** can('permission') checks в UI
- [ ] **Admin Sidebar:** Меню по ролям
- [ ] **Header:** Login/logout кнопки
- [ ] **Action Buttons:** Archive/restore по правам

#### **2.3 UX Improvements (0.5 дня)**

**Задачи:**
- [ ] **Redirects:** Автоматические редиректы для unauthorized
- [ ] **Toast Notifications:** Feedback для auth actions
- [ ] **Access Denied Page:** Страница для pending users
- [ ] **Role Indicators:** Показ текущей роли в UI

### **Результат Stage 2:**
✨ **Полнофункциональный UI** с авторизацией, условным рендерингом и качественным UX.

---

## 🧪 **STAGE 3: TESTING & HARDENING - В ПЛАНАХ**

### **Цель:** Комплексное тестирование, security review, production готовность
### **Время:** 2-3 дня

#### **3.1 Comprehensive Testing (1-2 дня)**

**API Tests:**
- [ ] **401 Scenarios:** Неавторизованные запросы
- [ ] **403 Scenarios:** Недостаток прав по ролям
- [ ] **Role Switching:** Смена ролей администратора
- [ ] **Session Expiry:** TTL и автоматический logout

**UI Tests (Playwright):**
- [ ] **Login Flow:** OAuth через Яндекс ID
- [ ] **Permission UI:** Видимость элементов по ролям
- [ ] **Error Handling:** Auth error boundaries
- [ ] **Responsive:** Мобильная версия

**E2E Scenarios:**
- [ ] **Super Admin:** Полный доступ ко всем функциям
- [ ] **Admin:** Управление сущностями без архива
- [ ] **Moderator:** Только новости и публикации
- [ ] **Pending:** Ограниченный доступ

#### **3.2 Security Review (1 день)**

**OWASP Checklist:**
- [ ] **Session Security:** httpOnly, secure, sameSite cookies
- [ ] **CSRF Protection:** Proper token validation
- [ ] **XSS Prevention:** Content Security Policy
- [ ] **Rate Limiting:** Защита от brute force
- [ ] **Input Validation:** Zod схемы на всех входах

**Production Hardening:**
- [ ] **Secret Management:** Переменные окружения
- [ ] **Error Handling:** Никаких sensitive данных в ошибках
- [ ] **Logging:** Безопасные audit trails
- [ ] **Monitoring:** Auth metrics и алерты

#### **3.3 Performance & Monitoring (0.5 дня)**

**Performance:**
- [ ] **Session Caching:** Redis performance metrics
- [ ] **Auth Overhead:** Benchmark authorize() calls
- [ ] **Bundle Size:** Минимизация Auth.js imports

**Monitoring:**
- [ ] **Auth Metrics:** Successful/failed logins
- [ ] **Session Metrics:** Active sessions, TTL utilization
- [ ] **Error Tracking:** Auth-related errors в Sentry
- [ ] **Alerts:** Подозрительная активность

### **Результат Stage 3:**
🛡️ **Production-ready система** с полным тестовым покрытием и security hardening.

---

## 📊 **ОБЩИЙ TIMELINE**

| Stage | Описание | Время | Статус | Критерии готовности |
|-------|----------|-------|--------|---------------------|
| **0** | Infrastructure | 2 дня | ✅ **ГОТОВ** | MongoDB, Redis, тесты |
| **1** | Configuration & RBAC | 3-4 дня | 🎯 **СЛЕДУЮЩИЙ** | OAuth, RBAC, API guards |
| **2** | UI Integration | 2 дня | 📋 В планах | SessionProvider, UI permissions |
| **3** | Testing & Hardening | 2-3 дня | 📋 В планах | E2E tests, security review |
| | **ИТОГО** | **9-11 дней** | **30% готово** | Production-ready auth |

---

## 🔄 **DEPENDENCIES & RISKS**

### **Зависимости:**
- **OAuth Credentials:** Нужны Яндекс ID client_id + client_secret
- **Redis Production:** Настройка persistence для сессий
- **Environment:** Production secrets management

### **Риски:**
- **Auth.js v5 Beta:** Возможные breaking changes
- **OAuth Integration:** Сложности с Yandex ID API
- **Session Persistence:** Redis availability в production

### **Митигация:**
- **Comprehensive Testing:** Ранее выявление проблем
- **Fallback Plans:** Graceful degradation при Auth errors
- **Documentation:** Детальные troubleshooting guides

---

## 🚀 **NEXT ACTIONS**

### **Immediate (Сегодня):**
1. **Получить OAuth credentials** от Яндекс ID
2. **Создать auth.ts** с базовой конфигурацией
3. **Настроить API route** для Auth.js handlers

### **Short-term (Stage 1):**
1. **Реализовать RBAC матрицу** permissions.ts
2. **Создать authorize() guard** для API routes
3. **Защитить все admin API** endpoints

### **Long-term (Stage 2-3):**
1. **UI integration** с SessionProvider
2. **Comprehensive testing** всех scenarios
3. **Production deployment** с security review

---

> **Готовность к Stage 1:** ✅ Infrastructure completed  
> **Следующий milestone:** Working OAuth login + RBAC guards (3-4 дня) 