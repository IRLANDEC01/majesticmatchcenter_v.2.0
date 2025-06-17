
# Изоляция баз данных для параллельных тестов Jest  
*(решаем `E11000 duplicate key` без ручных суффиксов)*

## 1 · Что делаем  
Переходим на готовое пресет‐решение **@shelf/jest-mongodb** – оно запускает
**отдельный MongoMemoryServer на каждый Jest‑воркер** и автоматически прописывает
URI в `process.env`. Благодаря этому параллельные тесты больше не делят одну
коллекцию → индексы `unique` не конфликтуют, а статичные «Test Map»/«Test Player»
остаются читабельными.

```
Worker‑1  →  mongodb://127.0.0.1:53664/test_1   (index: name=unique)
Worker‑2  →  mongodb://127.0.0.1:54219/test_2   (тот же index, но своя БД)
```

## 2 · Шаг‑за‑шагом

### 2.1 Установка пакета

```bash
npm i -D @shelf/jest-mongodb
```

> пакет тянет `mongodb-memory-server` внутри; Docker **не нужен**.

### 2.2 Обновляем `jest.config.mjs`

```diff
 export default createConfig({
   testEnvironment: 'jest-environment-jsdom',
-  globalSetup: './jest.global-setup.js',
-  globalTeardown: './jest.global-teardown.js',
-  setupFilesAfterEnv: ['./jest.setup.js'],
+  preset: '@shelf/jest-mongodb',
+  setupFilesAfterEnv: ['./jest.setup.js'],

   extensionsToTreatAsEsm: ['.js', '.jsx', '.mjs'],
   transformIgnorePatterns: [
     '/node_modules/(?!(mongoose|mongodb|bson|@mongodb-js|mongodb-memory-server)/)'
   ],
   moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
 });
```

*Удаляем* самописные `jest.global-setup.js` и `jest.global-teardown.js`  
(если в них была ещё какая‑то логика — вынесите её в `jest.setup.js`).

### 2.3 Конфигурация пресета (опционально)

Создайте `jest-mongodb-config.js` в корне:

```js
module.exports = {
  mongodbMemoryServerOptions: {
    binary: { version: '7.0.5' },    // ту же версию, что и prod‑Mongo
    instance: { dbName: 'test' },
    // каждая база будет test_<workerId>_<rand>
  }
};
```

### 2.4 Очистка коллекций

`jest.setup.js` оставляем почти без изменений — нужен **только** `beforeEach`:

```js
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db.js';

beforeAll(async () => {
  await connectToDatabase();          // подключаемся к URI воркера
});

beforeEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

/* afterAll НЕ нужен – MongoMemoryServer
   остановится автоматически после завершения воркера. */
```

## 3 · Почему это решает гонку

| Механизм                 | Как работает                                 |
|--------------------------|----------------------------------------------|
| **Изоляция URI**         | Пресет создаёт *новый* порт/BSONDataDir для каждого `JEST_WORKER_ID`. |
| **Одинаковые индексы**   | Индексы создаются в каждой БД отдельно, поэтому `unique` нарушается лишь внутри воркера. |
| **Сброс коллекций**      | `beforeEach` чистит документы — тесты файла независимы. |

## 4 · Возможные вопросы

**Q:** Станет ли медленнее?  
**A:** Запуск 4–6 mongod’ов добавит ~1‑2 с прогрева, но убирает падения, и всё равно быстрее, чем `--runInBand`.

**Q:** Нужно ли сохранять `makeUnique()`?  
**A:** Нет — теперь он нужен только если *внутри одного файла* два теста создают один и тот же документ без очистки.

**Q:** Будут ли проблемы на CI (GitHub Actions)?  
**A:** Нет — `@shelf/jest-mongodb` качает бинарь Mongo в кэш `$HOME/.cache`. Для скорости можно задать  
`MMS_DOWNLOAD="off"` и сохранять артефакт между job’ами.

## 5 · Перечень файлов, которые надо удалить / изменить

- `jest.global-setup.js` – удалить  
- `jest.global-teardown.js` – удалить  
- `tmp/mongo-config.json` – больше не нужен  
- `jest.setup.js` – убрать `afterAll` и зависимости от tmp‑файла  
- `package.json` – удалить dev‑dep `mongodb-memory-server` (придёт транзитивно), добавить `@shelf/jest-mongodb`

## 6 · Готовы внедрить?

Если структура проекта отличается (например, `tests/setup.js` в монорепо) — сообщите точные пути, я скорректирую конфиг. В остальном план готов к copy‑paste.
