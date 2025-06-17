# Testing Strategy — финальная версия  
*(Next .js 15 · Jest 30 · MongoMemoryServer · RedisMock)*  

Документ учитывает ваши ответы о кастомном алиасе `@/`, статическом реестре моделей `src/models/index.js` и отсутствие потребности в MSW на текущем этапе.

---

## 0 · Предпосылки

* **Alias `@/`** настроен в `jsconfig.json` → все импорты используют корень `src/`.
* Все Mongoose‑модели импортируются статично через **`src/models/index.js`**  
  Этот файл подключается в `jest.setup.js` до первого теста.

---

## 1 · Установка Dev‑зависимостей

```bash
pnpm add -D   jest@30 babel-jest@30 @shelf/jest-mongodb   @testing-library/react @sinonjs/fake-timers   eslint prettier
```

`mongodb-memory-server` подтянется транзитивно.

---

## 2 · Структура конфиг‑файлов

```
project-root/
│  jest.config.mjs
│  jest-mongodb-config.js
│  jest.setup.js
│
└─ src/
   ├─ models/
   │   ├─ index.js        # статичный импорт всех моделей
   │   └─ *.js
   └─ lib/
      └─ db.js            # connectToDatabase()
```

---

## 3 · Конфигурация Jest

### jest.config.mjs
```js
import nextJest from 'next/jest.js';
const createConfig = nextJest({ dir: './' });

export default createConfig({
  preset: '@shelf/jest-mongodb',
  testEnvironment: 'jest-environment-jsdom',

  extensionsToTreatAsEsm: ['.js', '.jsx', '.mjs'],
  transformIgnorePatterns: [
    '/node_modules/(?!(mongoose|mongodb|bson|@mongodb-js|mongodb-memory-server)/)'
  ],

  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
});
```

### jest-mongodb-config.js
```js
module.exports = {
  mongodbMemoryServerOptions: {
    binary: { version: '7.0.5' },
    instance: { dbName: 'test' }
  }
};
```

---

## 4 · Глобальный setup

`jest.setup.js`
```js
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db.js';
import '@/models/index.js';            // регистрируем модели!

beforeAll(async () => {
  await connectToDatabase();           // пресет выдаёт уникальный URI
});

beforeEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});
```
*Никаких `afterAll → disconnect()` — MongoMemoryServer завершится сам.*

---

## 5 · Шаблон для любого нового тест‑файла
```js
import Family from '@/models/family.js';

beforeAll(async () => {
  await Family.init();                 // создаём индексы _один раз_
});

describe('Family repo', () => {
  it('slug уникален', async () => {
    await new Family({ name: 'Test Family' }).save();
    await expect(
      new Family({ name: 'Test Family' }).save()
    ).rejects.toThrow(/E11000/);
  });
});
```

---

## 6 · Пирамида тестов (поэтапно)

1. **Static** — ESLint / Prettier (husky pre‑commit).  
2. **Unit** — утилиты, domain‑services (mock repo).  
3. **Integration** — Route‑Handler → Service → Repo → Mongo (реальный).  
4. **E2E (позже)** — Playwright против dev‑сервера.

---

## 7 · CI Job
```yaml
name: test
on: [push, pull_request]

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test -- --maxWorkers=100%
```

---

## 8 · Частые вопросы

| Q | A |
|---|---|
| Нужно ли `makeUnique()`? | Нет, изоляция БД на воркер + `deleteMany` между `it` решает. |
| Как тестировать Yandex ID / S3? | Когда понадобится — добавить MSW‑моки. |
| Что если тестов > 500 и индексы тормозят? | Переключить очистку на `dropDatabase()` глобально и вызывать `init()` один раз. |

---

Готово! Если появятся новые требования — пишите, расширим стратегию.
