# Tech Context

## 🛠️ **Технологический стек проекта (актуальный - Январь 2025)**

### **🎯 Основная платформа**
- **Framework:** Next.js 15.3 с App Router
- **Runtime:** React 19.1 (современные Server Components + Server Actions)
- **Language:** TypeScript 5.8.3 (строгая типизация, полный отказ от JavaScript)
- **Node.js:** v20+ LTS для максимальной совместимости

### **🎨 Frontend стек**
- **UI Library:** shadcn/ui + Radix UI (accessible компоненты)
- **Styling:** Tailwind CSS v3 + CSS Custom Properties
- **Forms:** React Hook Form + Zod validation + FileDropzone для файлов
- **Validation:** Zod схемы (сервер + клиент)
- **State Management:** TanStack Query v5 для server state + useState для local state
- **Icons:** Lucide React (легковесная альтернатива Font Awesome)
- **File Upload:** react-dropzone + S3 интеграция для изображений

### **🔧 Backend стек**
- **Database:** MongoDB 7+ через Mongoose 8+ (ESM)
- **Cache:** Redis 7+ (кэш + очереди + pub/sub)
- **Queue:** BullMQ для фоновых задач
- **Search:** Meilisearch для полнотекстового поиска
- **Storage:** S3-совместимое хранилище (Рег.ру) для файлов и изображений
- **Migrations:** migrate-mongo для схем MongoDB
- **Auth:** NextAuth.js v5 (готовимся к миграции)

### **🚀 DevOps & Infrastructure**
- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx (reverse proxy + static files)
- **Monitoring:** Grafana Loki для логов (планируется)
- **Storage:** S3-совместимое хранилище для файлов
- **Deployment:** VPS Ubuntu + Docker Swarm (планируется)

---

## ⚡ **Проверенные архитектурные решения**

### **✅ Feature-Sliced Design (FSD)**
```
app/           # Next.js страницы и layouts
├── features/  # Бизнес-фичи (Server Actions + умные контейнеры)
├── entities/  # Бизнес-сущности (модели + UI + хуки данных)
├── shared/    # Переиспользуемые утилиты и компоненты
└── widgets/   # Составные блоки UI (не используется пока)
```

**Ключевое правило:** `app → features → entities → shared` (без нарушений!)

### **✅ Гибридный подход форм (React 19 + FSD)**
```typescript
// entities/lib/use-entity-form.ts - DI паттерн
export function useMapTemplateForm({ createAction, updateAction, onSuccess }) {
  const [isCreating, setIsCreating] = useState(false);
  
  const handleCreate = async (formData) => {
    const result = await createAction(formData);
    if (result.success) onSuccess?.();
  };
  
  return { handleCreate, isCreating };
}

// features/ui/page-content.tsx - инжекция зависимостей
const handleCreate = useCallback(async (formData) => {
  return createAction({ errors: {}, success: false }, formData);
}, []);

return <EntityDialog onCreateAction={handleCreate} />;
```

### **✅ SWR оптимизация для админки**
```typescript
// Избегаем дублирование запросов после гидратации
const { data, mutate } = useSWR(searchUrl, fetcher, {
  revalidateOnFocus: false,     // не перезагружать при фокусе
  revalidateOnReconnect: false, // не перезагружать при reconnect  
  revalidateOnMount: false,     // избегаем двойной fetch
  refreshInterval: 0,           // только explicit refresh
  cache: 'force-cache'          // используем браузерный кэш
});
```

### **✅ Server Actions с правильной типизацией**
```typescript
// Типизированный результат всех SA
export type FormActionState = {
  success: boolean;
  errors: Record<string, string>;
  message?: string;
};

// Все Server Actions возвращают один тип
export async function createAction(
  prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  // реализация...
}
```

---

## 🚨 **Что НЕ работает / избегать**

### **❌ React 19 use() хук в админке**
```typescript
// НЕ ДЕЛАТЬ ТАК в админских компонентах:
const data = use(fetchData()); // создает дублирование с SWR
```
**Правило:** `use()` только для публичных RSC страниц, SWR для интерактивных данных

### **❌ Entities импортируют Features**
```typescript
// НЕ ДЕЛАТЬ ТАК:
// entities/ui/dialog.tsx
import { createAction } from '@/features/...'; // нарушение FSD!
```
**Решение:** Dependency Injection через props

### **❌ React Hook Form + Server Actions**
```typescript
// НЕ СОЧЕТАЕТСЯ хорошо:
const { handleSubmit } = useForm();
const onSubmit = async (data) => await serverAction(data); // конфликт
```
**Решение:** Контролируемые формы с useState + Server Actions

### **❌ Множественные источники данных**
```typescript
// НЕ ДЕЛАТЬ ТАК:
const swr = useSWR(key, fetcher);
const rsc = use(fetchSameData()); // race condition!
```
**Правило:** Один источник данных = меньше багов

---

## 🔬 **Тестирование (стратегия)**

### **✅ Текущая настройка**
- **Test Runner:** Vitest (быстрее Jest, лучше с ESM)
- **Testing Library:** @testing-library/react + @testing-library/jest-dom
- **Mocking:** ioredis-mock для Redis, mongodb-memory-server для MongoDB
- **Coverage:** Включен в Vitest, цель >80%

### **🎯 Стратегия тестирования**
```typescript
// 1. Unit тесты для хуков
describe('useMapTemplateForm', () => {
  it('handles create action with success', async () => {
    const mockAction = vi.fn().mockResolvedValue({ success: true });
    // тест...
  });
});

// 2. Integration тесты для Server Actions
describe('createMapTemplateAction', () => {
  it('creates template and revalidates path', async () => {
    // полный flow с MongoDB + Redis
  });
});

// 3. Component тесты с real dependencies
describe('MapTemplateDialog', () => {
  it('submits form and calls callback', async () => {
    // тест UI + логики
  });
});
```

### **🚀 E2E (планируется)**
- **Playwright** для критических пользовательских сценариев
- **CI/CD integration** с GitHub Actions

---

## 📦 **Управление зависимостями**

### **✅ Package manager: pnpm**
- Быстрее npm/yarn
- Экономия дискового пространства
- Строгое управление зависимостями

### **🔄 Обновления зависимостей**
```bash
# Регулярные обновления (раз в месяц)
pnpm outdated
pnpm update --interactive

# Major обновления осторожно
pnpm update --latest
```

### **🛡️ Security**
```bash
# Проверка уязвимостей
pnpm audit
pnpm dlx npm-check-updates
```

---

## 🌟 **Production Ready Features**

### **✅ Готово к продакшену**
- **Map Templates CRUD** - полностью протестировано и оптимизировано
- **Поиск Meilisearch** - индексация + real-time обновления
- **Redis кэширование** - правильная инвалидация через tags
- **Error boundaries** - graceful error handling
- **TypeScript** - строгая типизация без any

### **🔄 В процессе подготовки**
- **Tournament Templates** - миграция архитектуры
- **Logging** - структурированные логи для Grafana
- **Monitoring** - health checks + metrics
- **CI/CD** - автоматические тесты + деплой

### **📋 TODO для продакшена**
- [ ] **SSL/TLS** - HTTPS everywhere
- [ ] **Rate limiting** - защита от DDoS
- [ ] **Database backups** - автоматические бэкапы MongoDB
- [ ] **Secrets management** - Vault или аналоги
- [ ] **Performance monitoring** - APM инструменты

---

## 🎯 **Техническое влияние на разработку**

### **⚡ Скорость разработки**
- **Гибридные формы:** 50% меньше кода для CRUD операций
- **FSD архитектура:** Переиспользование компонентов между вертикалями
- **TypeScript:** Меньше runtime ошибок, лучшая поддержка IDE

### **🛡️ Качество кода**
- **Lint rules:** ESLint + Prettier + TypeScript strict
- **Pre-commit hooks:** Husky + lint-staged
- **Code review:** Обязательные PR reviews

### **📈 Масштабируемость**
- **Модульная архитектура:** Легко добавлять новые features
- **Кэширование:** Redis + Next.js cache для производительности
- **Горизонтальное масштабирование:** Docker Swarm ready

**Итог:** Технологический стек позволяет быстро разрабатывать качественные, производительные и масштабируемые решения. 