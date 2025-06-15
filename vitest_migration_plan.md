# Переход с Jest 29 на Vitest

> **Причина миграции**: Mongoose 8 (ESM‑only) + Babel/next‑jest + Jest 29 вызывают непреодолимый `SyntaxError: Unexpected token 'export'`.  Мы перепробовали все «костыли»; дальнейшие попытки нерентабельны. Vitest решает проблему «из коробки».

## 1. Стратегия миграции
1. **Полностью удалить связку Jest/Babel‑Jest**, чтобы исключить конфликты.  
2. Установить Vitest + `jsdom` + UI‑плагин.  
3. Создать `vitest.config.mjs` (ESM).  
4. Обновить npm‑скрипты.  
5. Подправить CI (GitHub Actions).  
6. Обновить Memory Bank: `activeContext.md` → «витест настроен».  
7. Гоняем существующие тесты — должны пройти без изменений API.

## 2. Пошаговый чек‑лист

### Шаг 1. Пакеты
```bash
npm rm jest babel-jest jest-environment-jsdom next/jest
npm i -D vitest @vitest/ui jsdom
```

### Шаг 2. vitest.config.mjs
```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,          // describe/it/expect без импорта
    environment: 'jsdom',   // то же, что jest-environment-jsdom
    alias: {
      '@/': '/src/'         // сохраняем alias из Jest
    },
    coverage: {
      reporter: ['text','html']
    }
  }
});
```

### Шаг 3. package.json (scripts)
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Шаг 4. GitHub Actions
В `ci.yml` заменить job `jest` на:
```yaml
- name: Install deps
  run: npm ci
- name: Vitest
  run: npm run test
```

### Шаг 5. Обновление Memory Bank
* **activeContext.md** → добавить строку: «Jest заменён на Vitest; конфиг vitest.config.mjs создан».
* **progress.md** → «✔ миграция на Vitest завершена, тесты проходят».

## 3. Потенциальные отличия
| Область | Jest | Vitest |
|---------|------|--------|
| Snapshots | `toMatchSnapshot()` | `toMatchSnapshot()` (совместимо) |
| Mock timers | `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| Module mocks | `jest.mock()` | `vi.mock()` |

> **Важно:** если где‑то использован Jest‑специфичный API (`jest.fn().mockResolvedValue`), достаточно заменить `jest` → `vi`.

## 4. План отката (если что‑то сломается)
* Jest 29 конфиги остаются в Git‑истории (tag `pre-vitest`).  
* Можно вернуть пакет‑lock и npm‑скрипт `test:jest` для выборочной отладки.

---

**Готов к миграции.** После вашего «ОК» применю шаги 1‑5 и запушу PR `chore/test→vitest`.

