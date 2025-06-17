
# Стратегия тестирования Majestic Match Center — итоговая версия  
*(Next .js 15 · Jest 30 · MongoMemoryServer · RedisMock)*  

Учтены ответы ассистента:

* **Алиас `@/`** настроен через `jsconfig.json`, проект не монорепо.  
* **Модели Mongoose регистрируются статично** в `src/models/index.js`; этот файл импортируется в `jest.setup.js`.  
* **MSW не требуется** на текущем этапе: внешние API не мокируются, интеграционные тесты работают с реальной (in‑memory) MongoDB.

---

## 0 · Предпосылки

| Пункт | Статус |
|-------|--------|
| Node.js | v22.x (Windows 10) |
| Алиас `@/*` → `src/` | настроен |
| `src/models/index.js` | импортирует все модели |
| Docker | **не нужен** — Mongo запускается в памяти |

---

## 1 · Dev‑зависимости

```bash
pnpm add -D   jest@30 babel-jest@30 @shelf/jest-mongodb   @testing-library/react @sinonjs/fake-timers   eslint prettier
```

`mongodb-memory-server` придёт транзитивно.

---

## 2 · Дерево конфигов

```
project-root/
│  jest.config.mjs
│  jest-mongodb-config.js
│  jest.setup.js
│
└─ src/
   ├─ models/
   │   ├─ index.js        # статичный реестр моделей
   │   └─ *.js
   └─ lib/
       └─ db.js           # connectToDatabase()
```

---

## 3 · Jest — базовая конфигурация

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
    binary: { version: '7.0.5' },      // как в проде
    instance: { dbName: 'test' }       // будет test_<id>_<rand>
  }
};
```

---

## 4 · Глобальный setup

`jest.setup.js`
```js
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db.js';
import '@/models/index.js';            // регистрируем модели один раз

beforeAll(async () => {
  await connectToDatabase();           // URI от пресета
});

beforeEach(async () => {
  // очищаем все коллекции, но сохраняем индексы
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});
```
> **Нет** `afterAll → disconnect()` — MongoMemoryServer закрывается пресетом.

---

## 5 · Шаблон тест‑файла

```js
import Family from '@/models/family.js';

beforeAll(async () => {
  await Family.init();                 // создаём индексы этого файла
});

describe('Family repository', () => {
  it('slug уникален', async () => {
    await new Family({ name: 'Test Family' }).save();
    await expect(
      new Family({ name: 'Test Family' }).save()
    ).rejects.toThrow(/E11000/);
  });
});
```

---

## 6 · Поэтапная пирамида тестов

1. **Static** — ESLint + Prettier (husky pre‑commit).  
2. **Unit** — чистые функции и доменные сервисы (mock репозитория).  
3. **Integration** — Route‑Handler → Service → Repo → Mongo (in‑memory).  
4. **E2E** (позже) — Playwright против поднятого dev‑сервера.

---

## 7 · Задание CI

`.github/workflows/test.yml`
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

## 8 · FAQ

| Вопрос | Ответ |
|--------|-------|
| **Нужен ли `makeUnique()`?** | Нет — каждая коллекция чистится в `beforeEach`, а базы раздельны по воркерам. |
| **Как мокировать внешние API (Yandex ID, S3)?** | Когда появится необходимость — добавить MSW и объявить хендлеры в `test/msw-handlers.js`. |
| **Что делать, если тестов станет > 500 и время инициализации индексов вырастет?** | Переключить очистку на `dropDatabase()` и создавать индексы глобально (`beforeAll` в `jest.setup.js`). |

---

## 9 · Следующие шаги

1. Скопировать конфиги и файлы setup в репозиторий.  
2. Запустить `pnpm test --clearCache` — убедиться, что база изолируется, ошибки `duplicate key` исчезли.  
3. Постепенно переносить существующие unit-/integration‑тесты, следуя шаблону.  

Готово! Если нужно расширить стратегию (E2E, MSW‑моки, Testcontainers) — напишите, добавим отдельный раздел. 
