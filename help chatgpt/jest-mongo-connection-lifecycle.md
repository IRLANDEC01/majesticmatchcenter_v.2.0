# jest-mongo-connection-lifecycle.md  
### Как избежать разрыва соединения MongoDB при параллельном запуске тестов Jest

---

## 1 · Симптомы

* `TypeError: Cannot read properties of null`
* `expect(received).not.toBeNull()` — метод `findById()` только что созданного документа возвращает **`null`**.

Причина одинакова: один воркер Jest успел **закрыть общее соединение** (`mongoose.disconnect()`), пока другой ещё выполняет запросы.

---

## 2 · Почему это происходит

```mermaid
flowchart LR
    subgraph Jest run (N workers)
        A1[TestFile-1\nbeforeAll] --> B1[tests…] --> C1[afterAll → disconnect]
        A2[TestFile-2\nbeforeAll] --> B2[tests…]
        C1 -. обрывает соединение .-> B2
    end
    classDef danger fill:#ffcccc,stroke:#e33,stroke-width:1px;
    C1:::danger
```

* Каждому **воркеру** Jest импортируется `jest.setup.js`.  
* В конце своего файла воркер вызывает `afterAll → mongoose.disconnect()`.  
* Как только первый воркер завершил тесты, **все** сокеты к базе рвутся → остальные воркеры читают / пишут в «пустоту».

---

## 3 · Правильный жизненный цикл соединения

1. **Создать** единственный in-memory Mongo (mongodb-memory-server) в `global-setup`.  
2. **Открыть** соединение *один раз* в `beforeAll` (пер-воркер), но **не закрывать** в `afterAll`.  
3. **Очищать** коллекции в `beforeEach`.  
4. **Остановить** Mongo-сервер в `global-teardown` — это автоматически закроет все соединения.

---

## 4 · Обновлённые файлы

### 4.1 `jest.setup.js`

```js
import { connectToDatabase } from '@/lib/db.js';
import mongoose from 'mongoose';

beforeAll(async () => {
  // ждём готовности коннекта
  await connectToDatabase();
});

beforeEach(async () => {
  // удаляем всё содержимое, соединение не трогаем
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

/*  ⛔️  afterAll удалён.  Соединение
    закроется автоматически, когда
    global-teardown остановит mongod. */
```

### 4.2 `jest.global-teardown.js`

```js
export default async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();  // завершает процессы mongod
  }
};
```

---

## 5 · Почему это надёжно

| Шаг | Что гарантирует стабильность |
|-----|------------------------------|
| `global-setup` | Запускает **один** MongoMemoryServer → один URI для всей сессии. |
| `beforeAll` (каждый воркер) | Ловит `readyState=1`; если соединение уже открыто — просто ре-юзает. |
| Отсутствие `afterAll` | Ни один воркер не может преждевременно вызвать `disconnect()`. |
| `global-teardown` | Остановка mongod закрывает все TCP-сокеты → Jest завершается “чисто”. |

---

## 6 · FAQ

**Q:** *А если нужен «чистый лист» между сьюитами?*  
**A:** Достаточно `deleteMany({})` в `beforeEach`. Полный `dropDatabase()` редко оправдан: медленнее и может вызвать гонку индексов.

**Q:** *Можно ли одним воркером (ключ `--runInBand`)?*  
**A:** Можно, но теряете параллельность. Текущая схема оставляет параллельность и безопасность.

**Q:** *Как убедиться, что соединение живо?*  
```js
expect(mongoose.connection.readyState).toBe(1);
```

---

### Итог

Удалив `afterAll → mongoose.disconnect()` из `jest.setup.js` и оставив закрытие соединения глобальному `teardown`, получаем стабильные параллельные тесты без гонок и падений вида «Cannot read properties of null».
