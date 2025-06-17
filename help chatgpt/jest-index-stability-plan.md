
# Стабилизация тестов, проверяющих уникальные индексы MongoDB  
*(Next.js 15 / Jest 30 / Mongoose 8 / @shelf/jest-mongodb)*

---

## 1 · TL;DR

1. **Удаляем все остаточные импорты** `#test/utils/unique.js`.  
2. **Инициализируем индексы один раз на файл** → `await Model.init()` в `beforeAll`.  
3. **Очищаем коллекции перед каждым `it`** → `deleteMany({})` в `beforeEach`.  
4. **Не вызываем** `mongoose.connection.close()` в тестах — за это отвечает пресет.  
5. (Опционально) **Создаём тест‑утилиту `initIndexes()`**, чтобы не дублировать код.

---

## 2 · Подробный план

### 2.1 Чистим мусорные импорты

```bash
grep -R "#test/utils/unique" src/**/*.test.js
sed -i '/#test\/utils\/unique/d'   src/lib/repos/map-templates/map-template-repo.test.js   src/lib/repos/tournament-templates/tournament-template-repo.test.js
```

### 2.2 Единая функция инициализации индексов

`test/utils/initIndexes.js`

```js
import mongoose from 'mongoose';

/**
 * Гарантирует, что все индексы Mongoose‑моделей созданы.
 * Вызывать в beforeAll нужных тест‑файлов.
 */
export async function initIndexes(models = Object.values(mongoose.models)) {
  await Promise.all(models.map((m) => m.init()));
}
```

*Почему `Model.init()`? — Это официально блокирующий метод, который
компилирует модель и создаёт **все индексы** в коллекции.*

### 2.3 Используем в “проблемных” тестах

```js
import { initIndexes } from '#test/utils/initIndexes';
import { Player } from '@/models/player';

beforeAll(async () => {
  await initIndexes([Player]); // или await Player.init();
});

beforeEach(async () => {
  // продолжаем чистить коллекции
  await Player.deleteMany({});
});
```

*Не добавляйте `Player.init()` в **каждый** тест‑файл — только там, где
действительно проверяются правила уникальности.*

### 2.4 Глобальный `jest.setup.js`

```js
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db.js';

beforeAll(async () => {
  await connectToDatabase(); // URI выдаёт @shelf/jest-mongodb
});

beforeEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});
```

*Больше никаких `afterAll → mongoose.disconnect()`. MongoMemoryServer
закроется пресетом.*

---

## 3 · Проверяем

```bash
# очищаем кеш Jest
npx jest --clearCache
# запускаем со всем параллелизмом
npx jest --maxWorkers=100%
```

Ожидаем: **все flaky‑тесты стабилизированы**, ошибки duplicate key
появляются **только** если код действительно нарушает уникальность.

---

## 4 · Что делать в будущем

| Ситуация | Рекомендация |
|----------|--------------|
| Появятся новые модели с уникальными индексами | Добавить `await NewModel.init()` в нужный тест‑файл. |
| Тестов станет > 500 и инициализация индексов замедлит run | Перейти на `mongoose.connection.dropDatabase()` вместо `deleteMany` и вызывать `initIndexes()` один раз глобально. |
| Понадобится транзакционный roll‑back | Рассмотреть `session.startTransaction()` + `abortTransaction()` в `beforeEach/afterEach`. |

---

### Итог

Комбинация **Model.init()** + **чистка коллекций** полностью исключает гонки
индексов внутри файла. Пресет `@shelf/jest-mongodb` уже изолирует базы
между воркерами, поэтому «flaky» исчезают, а тесты начинают сигнализировать
только о реальных ошибках бизнес‑логики.
