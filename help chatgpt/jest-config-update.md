
# Обновлённый `jest.config.mjs` — финальная конфигурация  
*(паттерн «передаём transformIgnorePatterns напрямую в next/jest»)*  

> Эта версия заменяет предыдущую секцию конфигурации и фиксирует ошибку  
> **Must use import to load ES Module bson.mjs**.

---

## 1 · Новый файл `jest.config.mjs`

```js
import nextJest from 'next/jest.js';

/**
 * Путь к корню проекта Next.js (для чтения next.config.js и .env*)
 */
const createJestConfig = nextJest({ dir: './' });

/**
 * Кастомные правила Jest, которые «сольются» с внутренними настройками Next.js.
 */
const customJestConfig = {
  preset: '@shelf/jest-mongodb',
  testEnvironment: 'jest-environment-jsdom',

  setupFilesAfterEnv: ['./jest.setup.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',          // алиас src/
  },

  /**
   * Ключевой момент: говорим Jest *не* пропускать трансформацию для
   * mongoose/mongodb/bson — они ESM‑only, и babel-jest превратит их в CJS.
   * Второй паттерн блокирует css‑modules, как требует next/jest.
   */
  transformIgnorePatterns: [
    '/node_modules/(?!(mongoose|mongodb|bson|@mongodb-js|mongodb-memory-server)/)',
    '^.+\.module\.(css|sass|scss)$'
  ]
};

/**
 * Экспорт: next/jest возвращает функцию, которой передаём наш объект.
 * Получаем финальный конфиг, объединённый с internal‑rules Next.js.
 */
export default createJestConfig(customJestConfig);
```

### что изменилось

| Было | Стало |
|------|-------|
| `extensionsToTreatAsEsm` | **Убрано** — Next 15 + babel-jest уже помечают `.mjs` как ESM |
| `transformIgnorePatterns` в корне объекта | Теперь передаётся через `customJestConfig` внутрь `createJestConfig` — так рекомендует документация Next.js |

---

## 2 · Проверка фикса

```bash
# очистить кеш jest – важно после смены конфигурации
npx jest --clearCache

# прогоняем тесты
pnpm test
```

*Если всё настроено верно, ошибка «Must use import to load ES Module» исчезнет,
а тесты перейдут к логике приложения.*

---

## 3 · Напоминания

1. **Не держать extensionsToTreatAsEsm**: дублирует работу Next и
   иногда вызывает двойную трансформацию.
2. **Не менять `moduleNameMapper` для bson**: достаточно трансформации Babel,
   алиас больше не нужен.
3. **`NODE_OPTIONS='--experimental-vm-modules'`**  
   — теперь **не требуется**: Babel‑jest оборачивает ESM → CommonJS.

---

## 4 · Что делать, если ошибка останется

1. Убедитесь, что **bson/mongoose** версии ≥ 6/8 действительно в node_modules.  
2. Проверьте, нет ли локального alias вида `"bson": "mock/bson.js"` в `moduleNameMapper`.  
3. Запустите Jest с `--detectOpenHandles` — получите полный трейс загрузки.

---

Файл можно положить по пути `architecture/testing/jest-config-update.md` или
заменить старый раздел в `testing-strategy-full.md`.
