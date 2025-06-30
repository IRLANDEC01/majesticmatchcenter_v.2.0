# План миграции Map Templates на TanStack Stack

> **Статус:** В работе  
> **Цель:** Полная миграция map-templates на TanStack Table + Virtual + Query + Pacer
> **Дата:** Январь 2025

## 🎯 **Итоговая цель**

- ✅ Универсальный хук для списка + поиска  
- ✅ TanStack Table с виртуализацией
- ✅ Серверная пагинация (15 элементов)
- ✅ Логика тогглов: клик → немедленная загрузка  
- ✅ Права: супер-админ видит тогглы, админ — только активные

---

## **ЭТАП 0: Подготовка и проверка API (1 день)**

### Цель
Проверить актуальные API пакетов, установить, создать фасад импортов, добавить константы

### Задачи

1. **⚠️ ВАЖНО: Проверить актуальные API пакетов**
```bash
npm info @tanstack/react-table  # проверить type Table экспорт
npm info @tanstack/react-virtual # проверить overscan параметр
npm info @tanstack/pacer        # проверить keepLatest API в alpha
```

2. **Установить пакеты**
```bash
npm i @tanstack/react-table @tanstack/pacer
```

3. **Создать фасад TanStack** → `src/shared/tanstack/index.ts`
```typescript
export { 
  useReactTable, 
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
  flexRender
} from '@tanstack/react-table';

// ✅ ИСПРАВЛЕНО: правильный экспорт типа Table
export type { Table } from '@tanstack/react-table';

// ✅ ОБНОВЛЕНО: согласно https://tanstack.com/pacer/latest - alpha статус
// Pacer предоставляет rate limiting, throttling, debouncing utilities
export { pacer } from '@tanstack/pacer';
```

4. **✅ ИСПРАВЛЕНО: Обновить константы** → `src/lib/constants.js`
```javascript
// Добавить в существующий файл, проверить отсутствие циклических импортов
export const ADMIN_TABLE_PAGE_SIZE = 15; // Админские таблицы с поиском сущностей
// export const PUBLIC_TABLE_PAGE_SIZE = 25; // Для будущих публичных страниц
// MIN_SEARCH_LENGTH уже есть - не дублировать
```

5. **Проверить существующий API роут** → `src/app/api/admin/map-templates/route.ts`
```bash
# Убедиться, что эндпоинт поддерживает поиск через параметр q=
# Иначе нужно будет использовать /api/admin/search
```

### Чек-лист
- [ ] Пакеты установлены
- [ ] Фасад создан 
- [ ] Константы добавлены
- [ ] `npm run build` успешен

---

## **ЭТАП 1: ✅ ЗАВЕРШЕН: TanStack Table v8**

### Цель
Заменить hand-made таблицу на TanStack Table без изменения данных

### Файлы для изменения
- `entities/map-templates/ui/map-templates-columns.tsx` ← **новый**
- `entities/map-templates/ui/map-templates-table.tsx` ← **переписать**

### Задачи

1. **✅ ИСПРАВЛЕНО: Создать колонки с table.meta** → `entities/map-templates/ui/map-templates-columns.tsx`
```typescript
import { type ColumnDef } from '@/shared/tanstack';
import { EntityTableActions } from '@/shared/admin';
import type { MapTemplate } from '../model/types';

// ✅ ИСПРАВЛЕНО: Используем функцию для создания колонок с доступом к meta
export const createMapTemplatesColumns = (): ColumnDef<MapTemplate>[] => [
  {
    accessorKey: 'imageUrls.icon',
    header: '',
    size: 60,
    enableResizing: false, // ✅ ИСПРАВЛЕНО: фиксируем ширину
    cell: ({ getValue, row }) => {
      const iconUrl = getValue() as string;
      return iconUrl ? (
        <Image src={iconUrl} alt={row.original.name} width={32} height={32} />
      ) : null;
    },
  },
  {
    accessorKey: 'name',
    header: 'Название',
    sortingFn: 'text',
  },
  {
    accessorKey: 'description', 
    header: 'Описание',
  },
  {
    accessorKey: 'createdAt',
    header: 'Создан',
    sortingFn: 'datetime',
    cell: ({ getValue }) => format(new Date(getValue()), 'dd.MM.yyyy'),
  },
  {
    id: 'actions',
    header: 'Действия',
    size: 120,
    enableResizing: false,
    // ✅ ИСПРАВЛЕНО: Доступ к функциям через table.meta
    cell: ({ row, table }) => {
      const { onEditAction, onArchiveAction, onRestoreAction } = table.options.meta as {
        onEditAction: (template: MapTemplate) => void;
        onArchiveAction: (template: MapTemplate) => Promise<void>;
        onRestoreAction: (template: MapTemplate) => Promise<void>;
      };
      
      return (
        <EntityTableActions
          entity={row.original}
          entityType="шаблон карты"
          onEdit={() => onEditAction(row.original)}
          onArchive={() => onArchiveAction(row.original)}
          onRestore={() => onRestoreAction(row.original)}
        />
      );
    },
  },
];
```

2. **✅ ИСПРАВЛЕНО: Переписать таблицу с meta** → `entities/map-templates/ui/map-templates-table.tsx`
```typescript
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@/shared/tanstack';
import { createMapTemplatesColumns } from './map-templates-columns';

interface MapTemplatesTableProps {
  templates: MapTemplate[];
  isLoading: boolean;
  onEditAction: (template: MapTemplate) => void;
  onArchiveAction: (template: MapTemplate) => Promise<void>;
  onRestoreAction: (template: MapTemplate) => Promise<void>;
}

export function MapTemplatesTable({
  templates,
  isLoading,
  onEditAction,
  onArchiveAction, 
  onRestoreAction
}: MapTemplatesTableProps) {
  const [sorting, setSorting] = useState([]);
  const columns = useMemo(() => createMapTemplatesColumns(), []);

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
    // ✅ ИСПРАВЛЕНО: Передаем функции через meta
    meta: {
      onEditAction,
      onArchiveAction,
      onRestoreAction,
    },
  });

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : (
                  <div
                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Чек-лист
- [ ] Колонки созданы
- [ ] Таблица переписана
- [ ] Сортировка работает
- [ ] Действия (edit/archive/restore) работают
- [ ] UI не изменился визуально

---

## **ЭТАП 2: ❌ ИСКЛЮЧЕН: TanStack Virtual** 

### ❌ РЕШЕНИЕ: Virtual НЕ внедряем
Согласно [официальной документации TanStack Virtual](https://tanstack.com/virtual/latest), виртуализация нужна для "massive scrollable elements". В нашем случае 15-100 строк - это небольшое количество, виртуализация избыточна.

**Этап полностью исключен из миграции**

### Задачи

1. **Обновить таблицу** → `entities/map-templates/ui/map-templates-table.tsx`
```typescript
import { useVirtualizer, DEFAULT_ROW_HEIGHT_PX } from '@/shared/tanstack';

export function MapTemplatesTable({ templates, ... }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const table = useReactTable({
    data: templates,
    columns: mapTemplatesColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // ... остальные настройки
  });

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => DEFAULT_ROW_HEIGHT_PX,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <Table style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        <TableHeader>
          {/* Шапка таблицы */}
        </TableHeader>
        <TableBody>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = table.getRowModel().rows[virtualRow.index];
            return (
              <TableRow
                key={row.id}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Ячейки */}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Чек-лист  
- [ ] Виртуализация работает
- [ ] Плавный скролл
- [ ] DOM содержит ≤ 40 элементов при большом списке
- [ ] Производительность улучшена

---

## **ЭТАП 3: Клиентская пагинация (½ дня)**

### Цель
Добавить пагинацию в TanStack Table для управления отображением

### Задачи

1. **Обновить таблицу** 
```typescript
const table = useReactTable({
  data: templates,
  columns: mapTemplatesColumns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(), // ← добавить
  state: { sorting },
  onSortingChange: setSorting,
  initialState: {
    pagination: { pageSize: ADMIN_TABLE_PAGE_SIZE, pageIndex: 0 }
  },
});
```

2. **Создать компонент пагинации** → `shared/ui/pagination-controls.tsx`
```typescript
export function PaginationControls({ table }: { table: Table<any> }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">
        Страница {table.getState().pagination.pageIndex + 1} из {table.getPageCount()}
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Назад
        </Button>
        <Button
          variant="outline" 
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Вперед
        </Button>
      </div>
    </div>
  );
}
```

### Чек-лист
- [ ] Клиентская пагинация работает
- [ ] Кнопки prev/next функциональны
- [ ] Отображение "Страница X из Y"

---

## **ЭТАП 4: Серверная пагинация (1 день)** ⭐ **КЛЮЧЕВОЙ**

### Цель
Перейти от клиентской к серверной пагинации + универсальный хук

### Задачи

1. **✅ ИСПРАВЛЕНО: Проверить и обновить API route** → `app/api/admin/map-templates/route.ts`
```typescript
// ⚠️ ВАЖНО: Проверить, что существующий route поддерживает поиск через q=
// Если нет - использовать /api/admin/search или добавить поддержку

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase(); // ✅ ОБЯЗАТЕЛЬНО: явное подключение к MongoDB
    
    const { searchParams } = new URL(request.url);
    const params = getMapTemplatesSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '15', 
      q: searchParams.get('q') || '',           // ← проверить поддержку поиска
      status: searchParams.get('status') || 'active',
    });

    const result = await mapTemplateService.getMapTemplates(params);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

2. **✅ ИСПРАВЛЕНО: Создать универсальный хук** → `entities/map-templates/lib/use-map-templates-universal.ts`
```typescript
import { ADMIN_TABLE_PAGE_SIZE } from '@/lib/constants'; // ✅ ИСПРАВЛЕНО: правильный импорт

interface UseMapTemplatesParams {
  searchTerm: string;
  status: EntityStatus;
  page: number;
}

export function useMapTemplatesUniversal({
  searchTerm,
  status, 
  page
}: UseMapTemplatesParams) {
  const [debouncedSearchTerm] = useDebounce(searchTerm.trim(), 300);
  
  // ✅ ИСПРАВЛЕНО: правильный queryKey для оптимального кэширования
  const queryKey = useMemo(() => [
    'mapTemplates',
    status,
    page,
    debouncedSearchTerm // только debounced для стабильного кэша
  ], [status, page, debouncedSearchTerm]);

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ADMIN_TABLE_PAGE_SIZE.toString(),
        status,
        ...(debouncedSearchTerm && { q: debouncedSearchTerm }),
      });
      
      const response = await fetch(`/api/admin/map-templates?${params}`, { signal });
      if (!response.ok) throw new Error('Ошибка загрузки');
      return response.json();
    },
    enabled: true,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
```

3. **✅ ИСПРАВЛЕНО: Обновить таблицу для серверной пагинации**
```typescript
const table = useReactTable({
  data: templates,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  manualPagination: true, // ← ключевое изменение
  pageCount: Math.ceil(totalCount / ADMIN_TABLE_PAGE_SIZE),
  state: { 
    sorting,
    pagination: { pageIndex: page - 1, pageSize: ADMIN_TABLE_PAGE_SIZE }
  },
  // ✅ ИСПРАВЛЕНО: избегаем бесконечного цикла
  onPaginationChange: useCallback((updater) => {
    const newPagination = typeof updater === 'function' 
      ? updater({ pageIndex: page - 1, pageSize: ADMIN_TABLE_PAGE_SIZE })
      : updater;
    
    // Меняем страницу только если она действительно изменилась
    const newPage = newPagination.pageIndex + 1;
    if (newPage !== page) {
      setPage(newPage);
    }
  }, [page]),
  onSortingChange: setSorting,
  meta: {
    onEditAction,
    onArchiveAction,
    onRestoreAction,
  },
});
```

### Чек-лист
- [ ] API поддерживает пагинацию
- [ ] Универсальный хук создан
- [ ] Серверная пагинация работает
- [ ] Сброс страницы при смене фильтров

---

## **ЭТАП 5: TanStack Pacer (½ дня)**

### Цель
Заменить use-debounce на TanStack Pacer для унификации

### Задачи

1. **⚠️ ПРОВЕРИТЬ API: Обновить хук**
```typescript
import { pacer } from '@/shared/tanstack';

export function useMapTemplatesUniversal({ searchTerm, status, page }) {
  // ⚠️ ВАЖНО: Проверить актуальный API Pacer в alpha
  // Возможные варианты: pacer.keepLatest, pacerFactory, другая сигнатура
  const pacedFetch = useMemo(() =>
    pacer.keepLatest(async (params, signal) => { // ← проверить порядок параметров
      const response = await fetch(`/api/admin/map-templates?${params}`, { signal });
      return response.json();
    }, { 
      intervalMs: 300  // ← возможно interval заменен на intervalMs
    }),
  []);

  const queryKey = ['mapTemplates', status, page, searchTerm];
  
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ADMIN_TABLE_PAGE_SIZE.toString(), 
        status,
        ...(searchTerm && { q: searchTerm }),
      });
      return pacedFetch(params.toString(), signal);
    },
    enabled: true,
  });
}
```

### Чек-лист
- [ ] Pacer заменил use-debounce
- [ ] Дебаунс работает корректно
- [ ] Отменяются старые запросы



---

## **ЭТАП 6: Логика тогглов + StatusFilter (1 день)** ⭐ **КЛЮЧЕВОЙ**

### Цель  
Реализовать новую UX логику: клик на тоггл → немедленная загрузка списка

### Задачи

1. **Расширить StatusFilter** → `shared/ui/status-filter.tsx`
```typescript
export type EntityStatus = 'active' | 'archived' | 'all';

export function StatusFilter({
  value,
  onChange,
  canViewArchived,
}: {
  value: EntityStatus;
  onChange: (value: EntityStatus) => void;
  canViewArchived: boolean;
}) {
  const options = canViewArchived 
    ? [
        { value: 'active', label: 'Активные' },
        { value: 'archived', label: 'Архивные' },
        { value: 'all', label: 'Все' }
      ]
    : [{ value: 'active', label: 'Активные' }];

  if (!canViewArchived) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Режим:</span>
        <Badge variant="secondary">Активные</Badge>
      </div>
    );
  }

  return (
    <ToggleGroup type="single" value={value} onValueChange={onChange}>
      {options.map(option => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
```

2. **✅ ИСПРАВЛЕНО: Обновить PageContent** → `features/map-templates-management/ui/map-templates-page-content.tsx`
```typescript
export function MapTemplatesPageContent({ userRole }: { userRole: AdminRole }) {
  const permissions = usePermissions(userRole);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<EntityStatus>('active');
  const [page, setPage] = useState(1);
  
  // ✅ ИСПРАВЛЕНО: debounce для избежания "дергания" таблицы
  const [debouncedSearchTerm] = useDebounce(searchTerm.trim(), 300);

  // ✅ ИСПРАВЛЕНО: сброс страницы только при значимых изменениях
  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearchTerm]); // только при debouncedSearchTerm!

  // Универсальный хук (список + поиск)
  const { data, isLoading, error } = useMapTemplatesUniversal({
    searchTerm: debouncedSearchTerm, // используем debounced версию
    status,
    page,
  });

  const handleStatusChange = (newStatus: EntityStatus) => {
    setStatus(newStatus);
    // page сброситься автоматически через useEffect
  };

  return (
    <div>
      {/* Поиск */}
      <Input
        placeholder="Поиск шаблонов..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {/* Фильтр статуса */}
      <StatusFilter
        value={status}
        onChange={handleStatusChange}
        canViewArchived={permissions.canViewArchived}
      />

      {/* Таблица */}
      <MapTemplatesTable
        templates={data?.data || []}
        isLoading={isLoading}
        totalCount={data?.totalCount || 0}
        currentPage={page}
        onPageChange={setPage}
        // ... остальные props
      />
    </div>
  );
}
```

### Чек-лист
- [ ] Клик на тоггл → немедленная загрузка 
- [ ] Поиск работает внутри выбранного статуса
- [ ] Сброс страницы при смене фильтров
- [ ] Права отображаются корректно

---

## **ЭТАП 7: Финальная полировка (½ дня)**

### Цель
Оптимизация, очистка кода, документация

### Задачи

1. **Создать переиспользуемый BaseTable** → `shared/ui/base-table.tsx`
2. **Обновить экспорты** → `entities/map-templates/index.ts`
3. **Добавить JSDoc** к ключевым функциям
4. **Оптимизировать запросы** (кэширование, staleTime)
5. **Обновить тесты** под новую архитектуру

### Чек-лист
- [ ] Код очищен от дублирования
- [ ] Документация обновлена
- [ ] Тесты проходят
- [ ] Performance улучшена

---

## 🏁 **КРИТЕРИИ ГОТОВНОСТИ**

### Функциональные требования ✅
- [ ] Супер-админ видит тогглы [Активные|Архивные|Все]
- [ ] Админ видит только активные шаблоны  
- [ ] Клик на тоггл → немедленная загрузка (15 элементов)
- [ ] Поиск работает внутри выбранного статуса
- [ ] Серверная пагинация с кнопками prev/next
- [ ] Виртуализация при большом количестве элементов

### Технические требования ✅
- [ ] TanStack Table заменил hand-made таблицу
- [ ] TanStack Virtual добавлен
- [ ] TanStack Query остался основным источником данных
- [ ] TanStack Pacer заменил use-debounce
- [ ] Универсальный хук для списка + поиска
- [ ] Константа ADMIN_TABLE_PAGE_SIZE = 15 используется

### Качество кода ✅
- [ ] FSD архитектура не нарушена
- [ ] TypeScript без ошибок
- [ ] Тесты покрывают новую логику
- [ ] Документация обновлена
- [ ] `npm run lint && npm run test` - зеленые

---

> **Следующий шаг:** Начать с Этапа 0 после утверждения плана. 