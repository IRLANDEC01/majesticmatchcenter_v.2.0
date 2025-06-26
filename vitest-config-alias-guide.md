# Настройка Vitest для разделённых сред (client / server) и исправление alias `@/` в `.js` файлах

> Подробная инструкция: почему возникла ошибка **Module cannot be imported from a Client Component …** и как её исправить.

---

## 1  Суть ошибки

`vite-tsconfig-paths` по умолчанию резолвит alias‑пути **только у файлов `.ts/.tsx`**.  
Серверные тесты у нас — `*.test.js`. При импорте:

```js
import { syncPlayers } from '@/lib/services/player-sync'
```

плагин пропускает путь, Vitest пытается резолвить обычным способом, модуль не найден → падаем.

---

## 2  Ключевая правка

```js
tsconfigPaths({
  extensions: ['.js', '.jsx', '.ts', '.tsx'], //  ← добавляем
})
```
и дублирующий fallback:

```js
resolve: { alias: { '@': path.resolve(__dirname, 'src') } }
```

Теперь alias `@/` работает во всех файлах.

---

## 3  Разделяем конфиги

### `vitest.config.client.mjs`

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({ extensions: ['.js', '.jsx', '.ts', '.tsx'] }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    name: 'client',
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.client.mjs'],
    include: ['src/components/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['src/app/api/**', 'src/lib/**'],
    coverage: { provider: 'v8', reportsDirectory: './coverage/client' },
  },
})
```

### `vitest.config.server.mjs`

```js
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [
    tsconfigPaths({ extensions: ['.js', '.jsx', '.ts', '.tsx'] }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    name: 'server',
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.server.mjs'],
    include: [
      'src/app/api/**/*.test.{js,ts}',
      'src/lib/**/*.test.{js,ts}'
    ],
    exclude: ['src/components/**'],
    threads: false,
    isolate: true,
    coverage: { provider: 'v8', reportsDirectory: './coverage/server' },
  },
})
```

---

## 4  tsconfig для плагина

```jsonc
// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

---

## 5  NPM‑скрипты

```json
{
  "scripts": {
    "test":        "npm run test:client && npm run test:server",
    "test:client": "vitest --config vitest.config.client.mjs",
    "test:server": "vitest --config vitest.config.server.mjs",
    "coverage":    "vitest run --coverage"
  }
}
```

---

## 6  Проверочный чек‑лист

| Проверка | Ожидаемый результат |
|----------|---------------------|
| `npm run test:server` | Серверные тесты проходят, alias `@/` в `.js` резолвятся |
| `npm run test:client` | Клиентские тесты запускаются в `happy-dom` |
| Импорт `server-only` в клиентский код | Next.js / Vitest кидает понятную ошибку |
| Покрытие | `coverage/client` и `coverage/server` генерируются раздельно |

---

### Итого

- **Поправлен alias** для всех расширений.  
- **Изоляция окружений** 100 %: два отдельных конфига вместо workspaces.  
- **Сборка CI** тривиальна: `npm test` — обе среды, единый отчёт coverage при желании (`vitest --mergeCoverage`).