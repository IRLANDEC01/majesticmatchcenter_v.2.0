# Плейбук: Миграция вертикали API с JavaScript на TypeScript

Этот документ описывает безопасный, пошаговый и проверенный на практике алгоритм для миграции одной полной вертикали сущности (Модель → Репозиторий → Сервис → API Маршрут → Тесты) с JavaScript на TypeScript.

**Цель:** Достижение полной типобезопасности, улучшение поддержки кода и предотвращение ошибок.

Процесс был выработан и отлажен во время миграции сущности `MapTemplate`.

---

### Шаг 0: Стабилизация (Пре-реквизит)

**Нельзя мигрировать сломанный код.** Перед началом миграции убедитесь, что:
1.  Все существующие интеграционные тесты для JavaScript-вертикали успешно проходят.
2.  Тесты приведены к "Золотому Стандарту": используют синглтоны сервисов/репозиториев и являются самодостаточными (данные создаются внутри `it`-блоков).

---

### Шаг 1: Миграция Модели (`/models/.../Entity.ts`)

1.  Переименуйте файл `Entity.js` в `Entity.ts`.
2.  Определите интерфейс для Mongoose-документа: `export interface IEntity extends Document { ... }`.
3.  Используйте этот интерфейс при создании схемы: `const entitySchema = new Schema<IEntity>({ ... });`.
4.  Типизируйте экспорт модели: `const Entity: Model<IEntity> = mongoose.models.Entity || mongoose.model<IEntity>('Entity', entitySchema);`.

---

### Шаг 2: Миграция Zod-схем (`/lib/api/schemas/.../entity-schemas.ts`)

1.  Переименуйте файл `...-schemas.js` в `...-schemas.ts`.
2.  **Критически важный шаг:** После каждого определения схемы экспортируйте выведенный из нее тип. Это наш "источник правды" для DTO.
    ```typescript
    export const createEntitySchema = z.object({ ... });
    export type CreateEntityDto = z.infer<typeof createEntitySchema>;
    ```

---

### Шаг 3: Миграция Сервиса (`/lib/domain/.../entity-service.ts`)

1.  Переименуйте файл `...-service.js` в `...-service.ts`.
2.  **Удалите все локальные или вручную созданные определения типов для DTO.**
3.  **Импортируйте DTO-типы напрямую из файла Zod-схем:** `import { CreateEntityDto } from '@/lib/api/schemas/...';`.
4.  Добавьте типизацию для параметров методов и возвращаемых значений (например, `async createEntity(data: CreateEntityDto): Promise<IEntity>`).

---

### Шаг 4: Миграция API Маршрутов (`/app/api/.../route.ts`)

1.  Последовательно переименуйте каждый `route.js` (включая вложенные, типа `[id]/archive`) в `route.ts`.
2.  Добавьте тип для входящего запроса: `request: Request`.
3.  Для динамических маршрутов создайте и используйте тип для контекста:
    ```typescript
    type RouteContext = {
      params: { id: string; };
    };
    // ...
    export async function PATCH(request: Request, { params }: RouteContext) { ... }
    ```
4.  **Безопасность:** Приведите все `catch` блоки к безопасному виду, чтобы избежать передачи `unknown` в обработчик ошибок:
    ```typescript
    catch (error) {
      return handleApiError(error instanceof Error ? error : new Error(String(error)), 'Error message');
    }
    ```

---

### Шаг 5: Адаптация Тестов (`*.test.js`)

Это самый частый источник сбоев после миграции.

1.  В **каждом** тестовом файле (`*.test.js`), относящемся к мигрируемой сущности, найдите импорт обработчика маршрута.
2.  Измените расширение файла в пути:
    *   **Было:** `import { GET, POST } from './route.js';`
    *   **Стало:** `import { GET, POST } from './route.ts';`
3.  Убедитесь, что импорты моделей также не содержат расширения: `from '@/models/Entity'`.

---

### Шаг 6: Финальная верификация

Запустите полный набор тестов для только что мигрированной вертикали и убедитесь, что все они проходят.
```bash
node node_modules/jest/bin/jest.js --runInBand --detectOpenHandles src/app/api/admin/entity/
```
Только после успешного прохождения всех тестов миграцию можно считать завершенной. 