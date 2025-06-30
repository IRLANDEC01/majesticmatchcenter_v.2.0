# План миграции UI-слоя на TanStack (Table + Virtual) 

> Версия документа — 2025-07-27

---

## 0. Контекст проекта

* **Текущий стек**: Next 15.3 (App Router) + React 19 • TypeScript 5.8 • MongoDB + MeiliSearch • SWR → **TanStack Query v5** • Tailwind + shadcn/ui.
* **Горячие зоны** — длинные таблицы в админке (MapTemplates), публичные рейтинги и история матчей.
* **Цель** — заменить hand-made таблицы на headless-движок, добавить виртуализацию DOM и единообразную пагинацию без изменения бизнес-слоя.

---

## 1. Библиотеки и их роль

| Библиотека | Версия | Функция в проекте | Почему именно она |
|------------|--------|-------------------|-------------------|
| `@tanstack/react-table` | v8 (stable) | Headless движок таблиц: сортировка / фильтры / пагинация / row-selection | Tree-shaking ≈ 13 kB, 100 % контроль разметки (шаблон + shadcn стиль) |
| `@tanstack/react-virtual` | v3 (stable) | Виртуализация строк/столбцов → 60 FPS даже при 10 000 + строк | Поддерживает variable row height и легко связывается с Table |
| `@tanstack/pacer` | alpha-0.1 | Throttle / debounce / keepLatest для поисковых запросов | Унифицирует контроль сетевого шума, меньше «useEffect + useDebounce» кода |
| `@tanstack/react-form` | beta | (PoC) Headless формы с Zod-adapter | Может заменить RHF; пока — только эксперимент на одном диалоге |
| `@tanstack/store` | alpha | **НЕ** внедряем, ждём стабилизации | Сейчас достаточно React Context/zustand при необходимости |

---

## 2. Архитектурные принципиальные решения

1. **FSD остаётся**: `entities → features → shared`. Все новые общие утилиты кладём в `shared/`.
2. **Headless + shadcn**: логика (TanStack) и внешний вид (shadcn) разделены, чтобы дизайнеры свободно меняли UI.
3. **Один фасад импорта**: `src/shared/tanstack/index.ts` — централизованный реэкспорт хуков/констант; при мажорном апдейте меняется только фасад.
4. **Data-source неизменен**: TanStack Query v5 остаётся единым источником данных; Table/Virtual не ходят в сеть напрямую.
5. **Кэш-стратегия & MeiliSearch**: серверная логика (Redis revision keys, search-queue) **не трогаются**; UI-слой лишь меняет отображение.

---

## 3. Пошаговый роадмап внедрения

### Этап 0 — подготовка (½ дня)

1. Установить пакеты:
   ```bash
   npm i @tanstack/react-table @tanstack/react-virtual @tanstack/pacer
   ```
2. Создать `src/shared/tanstack/index.ts`:
   ```ts
   export { useReactTable, type ColumnDef } from '@tanstack/react-table';
   export { useVirtualizer } from '@tanstack/react-virtual';
   export { pacer } from '@tanstack/pacer';
   export const DEFAULT_ROW_HEIGHT_PX = 48;
   ```
3. Добавить Jest-мок, если нужно: `__mocks__/tanstack.ts`.

### Этап 1 — интеграция Table v8 (1 день)

*Файлы*: `entities/map-templates/ui/`

1. Создать `mapTemplatesColumns.ts`:
   ```ts
   import { type ColumnDef } from '@/shared/tanstack';
   export const columns: ColumnDef<MapTemplate>[] = [
     { accessorKey: 'name', header: 'Название' },
     { accessorKey: 'createdAt', header: 'Создан', sortingFn: 'datetime' },
     // … другие поля / ячейка-рендеры
   ];
   ```
2. Переписать `MapTemplatesTable.tsx`:
   ```tsx
   const table = useReactTable({
     data: templates,
     columns,
     getCoreRowModel: getCoreRowModel(),
     getSortedRowModel: getSortedRowModel(),
     state: { sorting },
     onSortingChange: setSorting,
   });
   ```
3. Рендер ячеек — через `row.getVisibleCells()`.
4. Оставляем существующий `useMapTemplatesQuery`.

### Этап 2 — Универсальный хук виртуализации ✅ ГОТОВ

**Статус:** **ВНЕДРЕНО** - создан универсальный хук для ЛЮБЫХ таблиц.

**Что готово:**
- ✅ `useMaybeVirtualizer` - работает с любыми данными (Player, Tournament, Family, MapTemplate)
- ✅ Автоматическое включение/выключение по threshold
- ✅ Готовые пресеты (admin, publicRatings, withImages, mobile, always, never)
- ✅ Полная TypeScript типизация
- ✅ Экспорт из `@/shared/hooks`

**Примеры переиспользования:**
```tsx
// Игроки
const { enableVirtual, virtualizer } = useMaybeVirtualizer(players);

// Турниры с кастомным порогом
const { enableVirtual, virtualizer } = useMaybeVirtualizer(tournaments, { threshold: 50 });

// Публичные рейтинги
const { enableVirtual, virtualizer } = usePublicRatingsVirtualizer(ratings);

// Таблицы с изображениями
const { enableVirtual, virtualizer } = useImageTableVirtualizer(templates);
```

**Переиспользуемость:** 🎯 **МАКСИМАЛЬНАЯ** - один хук для всех таблиц проекта

### Этап 3 — клиентская пагинация (½ дня)

1. Добавить `getPaginationRowModel()` в Table.
2. Кнопки prev/next + селект 10/25/50 реализуем на shadcn `Button`, `Select`.
3. Состояние пагинации хранится в React state (`pageIndex`, `pageSize`).

### Этап 4 — серверная пагинация (1 день)

1. В `useMapTemplatesQuery` добавляем аргументы `page`, `limit` в `queryKey` и `fetch`.
2. В Table включаем `manualPagination: true` и передаём `pageCount` из API.
3. Инвалидация кеша остаётся прежней: `queryClient.invalidateQueries(['mapTemplates', …])`.

### Этап 5 — унификация debounce (Pacer) (½ дня)

```ts
const pacedFetch = useMemo(() =>
  pacer.keepLatest((signal) => fetch(url, { signal }).then(r => r.json()), {
    interval: 300,
  }),
[]);
```

* Заменяем `use-debounce`. Теперь throttle/queue управляются централизованно.

### Этап 6 — TanStack Form для сложных форм (необязательно)

**Критерии внедрения:**
- 10+ полей в форме
- Динамические массивы (`prizeTiers[].amount`)
- Условная видимость полей
- Асинхронные валидаторы
- Мульти-стэп формы

**Простые формы остаются на RHF** (< 5 полей, без динамики)

**План:**
1. Выбрать самую сложную форму (например, "Создать турнир")
2. PoC на TanStack Form в отдельной ветке
3. Сравнить DX, производительность, количество кода
4. При выигрыше ≥ 20% - мигрировать сложные формы

### Этап 7 — TanStack Store (пока отложено)

* Библиотека в alpha → ждём стабилизации. До тех пор используем локальный React state / Context.

### Этап 8 — тиражирование на другие сущности (2-3 дня)

1. ~~Копируем колонк-конфиг, меняем тип `Player`, `Tournament` и хук `usePlayersQuery`.~~
2. ~~Получаем унифицированные таблицы во всей админке.~~

---

## 4. Создание переиспользуемых компонентов

| Компонент | Где хранить | Назначение |
|-----------|-------------|------------|
| `BaseTable` | `shared/ui/base-table.tsx` | Обёртка, принимающая `columns`, `data`, `rowVirtualizer` и рисующая `<table>` + шапки |
| `PaginationControls` | `shared/ui/pagination-controls.tsx` | Кнопки prev/next, селект pageSize, индикатор «стр. X из Y» |
| `MapTemplatesTable` | `entities/map-templates/ui/` | Специфичная реализация: передаёт свои колонки + данные в `BaseTable`, обрабатывает edit/archive/restore |
| `useMapTemplatesQuery` | `entities/map-templates/lib/` | Хук (Pacer + TanStack Query) для поиска/листинга шаблонов карт |

*Плюс*: код остальных сущностей **не затрагивается** в рамках данной миграции.

---

## 5. Интеграция с TanStack Query, Redis-кэшем и MeiliSearch

1. **Query Keys**: добавляем аргументы `page`, `limit`, `sorting` в массив ключа → Query знает, когда обновиться.
2. **TTL**: client-cache живёт 30 сек (так же, как Redis TTL `listShort`).
3. **Server-cache**: сервис `map-template-service.getMapTemplates()` уже читает/инвалидирует Redis. Ничего менять не нужно.
4. **MeiliSearch**: UI-слой отправляет `q` в тот же endpoint `/api/admin/search`. Pacer гарантирует, что при скоростном вводе будет **один** «актуальный» запрос.
5. **Invalidation**: после мутаций (`archive`, `update`) мы уже дергаем `queryClient.invalidateQueries`. Table автоматически покажет свежие данные.

---

## 6. Часто задаваемые вопросы

**Почему не `AG Grid`?** — 700 kB + GPL/enterprise, сложно подружить с shadcn.

**Можно ли отказаться от Redis-revision после Table?** — Нет: серверная пагинация всё ещё использует revision-ключ для инвалидации.

**Когда внедрять TanStack Store?** — Когда выйдет beta-или-stable. Пока risks > benefits.

---

## 7. Чек-лист готовности Pull Request

1. `npm run lint && npm run test` — зелёные.  
2. В PR указать «Этап N TanStack Migration».  
3. Документация обновлена (этот файл + `memory-bank/progress.md`).  
4. Remote-cache/Redis/MeiliSearch метрики не ухудшились.

---

## 8. ФИНАЛЬНАЯ СТРАТЕГИЯ (обновлено после анализа)

### 🎯 **Принцип: "Сложность только при доказанной пользе"**

После детального анализа выявлены критические недостатки принудительного внедрения:

#### **TanStack Virtual - условное внедрение**
**❌ Проблемы "просто так":**
- Сложная разметка (overflow, absolute positioning, height calculations)
- Race conditions при динамических данных
- Zero benefit при 15-100 строках
- Труднее debugging и поддержка

**✅ Решение - условное включение:**
```tsx
const enableVirtual = rows.length > 100 || isInfiniteScroll;
```

#### **TanStack Form - только для сложных форм**
**❌ Проблемы массового внедрения:**
- Две библиотеки форм одновременно
- Beta-статус с breaking changes
- Бандл +7KB без пользы для простых форм

**✅ Решение - критерии сложности:**
- 10+ полей
- Динамические массивы (`prizeTiers[]`)
- Условная видимость полей
- Мульти-стэп workflow

---

## 9. ОБНОВЛЕННЫЙ РОАДМАП

### **✅ Этап A: Infinite Scroll + Conditional Virtualization - ЗАВЕРШЕН (29.01.2025)**

#### Задача: Полноценный infinite scroll с умной виртуализацией

**Что реализовано:**
1. ✅ `src/entities/map-templates/lib/use-infinite-map-templates-query.ts` - infinite scroll хук
2. ✅ `src/entities/map-templates/ui/map-templates-table.tsx` - enhanced с infinite поддержкой  
3. ✅ `src/features/map-templates-management/ui/map-templates-page-content.tsx` - production UI

**Архитектурные компоненты:**
```tsx
// ✅ РЕАЛИЗОВАНО: useInfiniteQuery с автоматической подгрузкой
const { templates, hasNextPage, loadMore } = useInfiniteMapTemplatesQuery({
  searchTerm,
  status,
});

// ✅ РЕАЛИЗОВАНО: Intersection Observer для автозагрузки
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasNextPage) {
      loadMore();
    }
  });
  if (sentinelRef.current) observer.observe(sentinelRef.current);
}, [hasNextPage, loadMore]);
```

**Результат применения:**
```tsx
// ✅ РЕАЛИЗОВАНО: Умная таблица
<MapTemplatesTable
  templates={allTemplatesFromAllPages}
  hasNextPage={hasNextPage}
  isFetchingNextPage={isFetchingNextPage}
  loadMore={loadMore}
  // При >100 записей автоматически включается виртуализация
  // При <100 записей обычная таблица без overhead
/>
```

### **✅ Этап B: TanStack Pacer Migration - ЗАВЕРШЕН (Январь 2025)**

#### Что выполнено:
- ✅ **Полная замена use-debounce** на TanStack Pacer
- ✅ **Централизованный фасад** в `src/shared/tanstack/index.ts` 
- ✅ **Стандартизированные интервалы:** `PACER_INTERVALS.SEARCH`, `AUTOSAVE`, etc.
- ✅ **Улучшенные хуки:** `usePacerDebounce`, `usePacerDebouncedCallback`
- ✅ **API совместимость** с дополнительным `isPending` состоянием
- ✅ **Мигрированы хуки:** `useSearch`, `useMapTemplatesQuery`
- ✅ **Удалена зависимость** use-debounce из package.json
- ✅ **Переопределяемая высота строк** через `NEXT_PUBLIC_TABLE_ROW_HEIGHT`

#### Улучшения UX:
- 🎯 **Унифицированные интервалы** во всем приложении
- 📊 **isPending состояние** для better loading indicators  
- 🔧 **Cancel функции** для manual отмены debounce
- ⚙️ **Environment configuration** для высоты строк таблиц

### **Этап C: PoC TanStack Form на сложной форме (2-3 дня)**

#### Цель: Доказать выгоду на реальном примере

**Кандидаты для PoC (по сложности):**
1. **Создание турнира** - ~20 полей, массивы `prizeTiers`, условная логика
2. **Создание игрока** - ~15 полей, загрузка файлов, валидация
3. **Настройки семьи** - массивы участников, права доступа

**Критерии успеха PoC:**
- Код короче на ≥20%
- Меньше `useEffect` для синхронизации
- Лучше DX для массивов и условной логики
- Стабильность при beta-статусе

**Если PoC провалился** → остаёмся на RHF для всех форм
**Если PoC успешен** → мигрируем только сложные формы

### **Этап C: Очистка и оптимизация (1 день)**

#### Убираем технический долг от экспериментов

1. **Удалить неиспользуемые файлы:**
   - ✅ `map-templates-table-virtualized.tsx` (удален - бессмыслен при пагинации 15 записей)
   - Дублирующие компоненты

2. **Унифицировать API:**
   - Один `MapTemplatesTable` с пропом `enableVirtual`
   - Убрать дублирование логики

3. **Документация trigger-points:**
   - Когда включать Virtual (>100 строк, infinite scroll)
   - Когда использовать TanStack Form (сложность критерии)

---

## 10. КОНКРЕТНЫЕ ИСПРАВЛЕНИЯ ТЕКУЩЕГО КОДА

### **✅ Исправлено: Удалена ненужная виртуализация**

**Проблема:** `map-templates-table-virtualized.tsx` содержал виртуализацию для таблицы с серверной пагинацией 15 записей.

**Решение:** Файл удален как архитектурно неправильный. При пагинации 15 записей виртуализация бессмысленна.

**Вывод:** Виртуализация нужна только для случаев без пагинации с большим количеством данных (публичные рейтинги, infinite scroll).

### **Архитектурное улучшение:**
```tsx
// Вместо двух компонентов
<MapTemplatesTable />           // обычная
<MapTemplatesTableVirtualized /> // виртуальная

// Один умный компонент
<MapTemplatesTable 
  enableVirtual={rows.length > 100} 
  containerHeight="600px"
/>
```

---

> Документ готов. Если команда согласна — двигаемся к **Этапу 0**. 