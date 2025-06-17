
# Исправление для тестов моделей — меняем `testEnvironment` на `node`

После всех правок ошибка  
```
SyntaxError: Unexpected token 'export' … bson.mjs
```  
остаётся, потому что в конфиге указана среда **`jest-environment-jsdom`**, а мы
запускаем чисто Node‑тесты (Mongoose, MongoDB). JSDOM подключает собственный
лонг‑поллинг и меняет глобалы, что ломает загрузку ESM‑модулей `bson`.

---

## 1 · Что поменять

### jest.config.mjs — только одна строка

```diff
-  testEnvironment: 'jest-environment-jsdom',
+  testEnvironment: 'node',
```

> Остальная конфигурация (`preset`, `transformIgnorePatterns`, `moduleNameMapper`) **не меняется**.

---

## 2 · Проверка

```bash
# очистить кеш Jest
npx jest --clearCache
# прогоняем конкретный файл, который падал
npx jest src/models/player/Player.test.js --runInBand
```

*Ожидаем*: тест запускается, `bson.mjs` трансформируется Babel‑jest, ошибку
`Unexpected token 'export'` больше не видим.

---

## 3 · Общий guideline

| Тип тестов | Правильный `testEnvironment` |
|------------|-----------------------------|
| Unit / Integration Node‑слоя (Mongoose, Services) | **node** |
| React‑компоненты, hooks | **jest-environment-jsdom** |
| Смешанные | разделить тесты по проектам (Jest projects) |

При необходимости можно настроить два проекта в `jest.config.mjs`, но для
текущей задачи достаточно глобально переключиться на `node`.

---

## 4 · Что делать, если ошибка останется

1. Проверьте, что **`NODE_OPTIONS='--experimental-vm-modules'`** отсутствует в `package.json` (`scripts.test`).
2. Убедитесь, что `bson` не алиасится на CJS‑бандл и что нет локального `require('bson')`.
3. Запустите `npx jest --detectOpenHandles` — если выпадет другой ESM‑модуль,
   добавьте его в whitelist внутри `transformIgnorePatterns`.

После этих шагов конфигурация будет стабильной.
