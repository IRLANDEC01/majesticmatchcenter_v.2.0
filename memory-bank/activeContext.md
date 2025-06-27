# Active Context

## 🎯 **Текущий фокус: Миграция на эталонную архитектуру map-templates**

### **📊 Состояние проекта (Январь 2025)**

**Статус:** Переход от начальной разработки к масштабированию проверенной архитектуры

#### **✅ Что достигнуто:**
- **Map Templates вертикаль** - 100% готова, стала эталоном для всего проекта
- **FSD архитектура** - полностью внедрена и проверена на практике
- **React 19 + Next.js 15.3** - современные паттерны корректно применены
- **Гибридный подход форм** - решена проблема FSD + Server Actions
- **Системы поиска и кэширования** - универсальные решения готовы

#### **🔄 Следующий приоритет:**
**Tournament Templates** - применить все паттерны map-templates

---

## 🏗️ **Проверенные архитектурные принципы**

### **✅ Что работает отлично:**

1. **FSD "Split & Inject"** - идеальное решение для Server Actions в FSD
2. **Гибридные формы** - useEntityForm хуки универсальны и переиспользуемы  
3. **SWR оптимизация** - правильные настройки избегают дублирования
4. **UX микроулучшения** - автосброс + toast + оптимизация кэша

### **❌ Что НЕ использовать:**

1. **React 19 use() в админке** - создает дублирование с SWR
2. **Entities импортируют features** - нарушает FSD
3. **Сложные RHF формы** - избыточность для простых CRUD
4. **Множественные источники данных** - приводит к race conditions

---

## 🎯 **Стратегия дальнейшего развития**

### **📋 Приоритет 1: Tournament Templates (следующая задача)**
- Скопировать структуру map-templates 1:1
- Применить все паттерны без изменений
- Протестировать универсальность подхода

### **📋 Приоритет 2: Players & Families**
- Использовать проверенную архитектуру
- Добавить семейную логику поверх базовых паттернов
- Расширить переиспользуемые компоненты

### **📋 Приоритет 3: Maps & Tournaments**
- Применить эталонную архитектуру к игровым сущностям
- Интегрировать систему рейтингов
- Реализовать real-time обновления

---

## 💡 **Ключевые инсайты из опыта map-templates**

### **🔍 Архитектурные озарения:**

1. **Dependency Injection решает FSD + Server Actions**
   ```typescript
   // Передаем Server Actions через props, а не импортируем
   <EntityDialog onCreateAction={handleCreate} />
   ```

2. **Хуки форм лучше в entities/lib**
   ```typescript
   // useEntityForm предоставляет API для entities, получая Server Actions извне
   const { handleCreate, isCreating, errors } = useMapTemplateForm({ createAction, onSuccess });
   ```

3. **SWR требует правильной настройки для админки**
   ```typescript
   // Избегаем дублирования после гидратации
   { revalidateOnMount: false, cache: 'force-cache' }
   ```

### **🎨 UX инсайты:**

1. **Поисковая архитектура "по требованию"** работает лучше полных списков
2. **Автосброс формы** значительно улучшает UX
3. **Toast уведомления** обязательны для операций без прямого визуального результата
4. **Отключение кэша поиска** критично для актуальности данных

### **🧪 Технические инсайты:**

1. **Переиспользуемые ErrorBoundary** упрощают обработку ошибок
2. **TypeScript strict типизация** реально помогает избежать багов
3. **Vitest integraton тесты** дают максимальную уверенность
4. **Селективное мокирование** (только внешние сервисы) - правильный подход

---

## 🚀 **Готовые паттерны для копирования**

### **📁 Структура entities (эталон):**
```
entities/map-templates/
├── index.ts                    # Barrel exports
├── model/
│   ├── index.ts               # Экспорт типов
│   ├── types.ts               # TypeScript interfaces
│   └── mappers.ts             # Mongoose → Frontend
├── lib/
│   ├── use-map-templates-data.ts  # SWR хук для данных
│   └── use-map-template-form.ts   # Хук форм с DI
└── ui/
    ├── map-templates-table.tsx    # Таблица с колбэками
    └── map-template-dialog.tsx     # Диалог с колбэками
```

### **📁 Структура features (эталон):**
```
features/map-templates-management/
├── index.ts                    # Barrel exports
├── api/
│   └── actions.server.ts       # Server Actions
└── ui/
    └── map-templates-page-content.tsx  # Умный контейнер
```

### **📁 App структура (эталон):**
```
app/admin/map-templates/
└── page.tsx                    # RSC с ErrorBoundary
```

---

## 🎯 **Immediate Next Steps**

1. **📋 Создать entities/tournament-templates/** по образцу map-templates
2. **🔧 Скопировать все паттерны** без изменений  
3. **🧪 Протестировать универсальность** подхода
4. **📚 Обновить документацию** при необходимости

**Цель:** Подтвердить, что эталонная архитектура масштабируется на другие сущности.

---

## 📈 **Метрики успеха**

- ✅ **Архитектурная консистентность** - 100% FSD compliance
- ✅ **Скорость разработки** - tournament-templates за 1-2 дня  
- ✅ **Качество кода** - тесты + TypeScript без багов
- ✅ **UX качество** - все микроулучшения применены

**Индикатор готовности к продакшену:** 50% готовности админки (3 из 6 сущностей)

---

## 📋 **КОНКРЕТНЫЕ ЗАДАЧИ НА БУДУЩЕЕ**

### **🔧 Техническая миграция (Приоритет: ВЫСОКИЙ)**

1. **Tournament Templates migration**
   - [ ] Создать `src/entities/tournament-templates/` структуру
   - [ ] Скопировать model/types/mappers паттерны 
   - [ ] Реализовать useTournamentTemplateForm хук
   - [ ] Создать TournamentTemplateDialog с колбэками
   - [ ] Создать TournamentTemplatesTable с optimistic updates
   - [ ] Создать features/tournament-templates-management/
   - [ ] Реализовать Server Actions по образцу map-templates
   - [ ] Создать страницу /admin/tournament-templates
   - [ ] Добавить UX микроулучшения (автосброс, toast, кэш)

2. **Players migration** 
   - [ ] Создать `src/entities/players/` структуру
   - [ ] Добавить семейную логику в usePlayerForm
   - [ ] Реализовать PlayerDialog с управлением семьей
   - [ ] Создать PlayersTable с семейной информацией
   - [ ] Интегрировать с существующей API players

3. **Families migration**
   - [ ] Создать `src/entities/families/` структуру  
   - [ ] Реализовать управление составом семьи
   - [ ] Добавить смену владельца семьи
   - [ ] Создать FamilyDialog с управлением участниками

### **📚 Документация (Приоритет: СРЕДНИЙ)**

4. **Архитектурные обновления**
   - [x] Добавить гибридные формы в architecture/02-patterns.md
   - [x] Обновить systemPatterns.md с FSD "split & inject"
   - [x] Зафиксировать React 19 правильное применение
   - [x] Документировать UX микроулучшения как стандарт
   - [ ] Создать migration guide для других вертикалей

5. **Примеры и шаблоны**
   - [ ] Создать template для новых entities
   - [ ] Добавить checklist для migration
   - [ ] Документировать common pitfalls

### **🧪 Качество кода (Приоритет: СРЕДНИЙ)**

6. **Тестирование**
   - [ ] Создать тесты для useTournamentTemplateForm
   - [ ] Покрыть тестами Server Actions tournament-templates
   - [ ] Добавить E2E тесты для полного flow создания
   - [ ] Создать performance тесты для SWR оптимизации

7. **TypeScript улучшения**
   - [ ] Создать generic types для useEntityForm
   - [ ] Добавить strict типизацию для Server Actions
   - [ ] Улучшить типы для Entity mappers

### **🎨 UX улучшения (Приоритет: НИЗКИЙ)**

8. **Расширенные фичи**
   - [ ] Добавить bulk operations в таблицы
   - [ ] Реализовать advanced search filters  
   - [ ] Добавить drag & drop для управления порядком
   - [ ] Создать keyboard shortcuts для частых операций

9. **Accessibility**
   - [ ] Добавить ARIA labels во все формы
   - [ ] Улучшить keyboard navigation
   - [ ] Добавить screen reader support
   - [ ] Провести accessibility audit

**Текущий фокус:** Задачи 1-3 (техническая миграция) для достижения 50% готовности админки. 