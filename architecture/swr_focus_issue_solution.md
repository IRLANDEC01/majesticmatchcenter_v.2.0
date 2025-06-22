
# Работа с SWR, Next.js 15.3 и React 19 в контексте динамической фильтрации данных

## 🧩 Технологии
- **Next.js 15.3**
- **React 19**
- **SWR** (https://swr.vercel.app/ru)
- **App Router**, `use client`-компоненты
- Динамическая фильтрация и debounce

---

## 📌 Цель
**Сохранить фокус в поле ввода при обновлении списка данных, избежать избыточного ререндеринга и управлять кэшем SWR.**

---

## 🔄 Поток данных (оптимальный)

1. Пользователь вводит текст в `AdminSearchInput`.
2. Локальный `useState` обновляет текст — **без перерисовки всей страницы**.
3. После debounce вызывается `onSearchChange`.
4. Родительская страница (`page.js`) обновляет `debouncedQuery`.
5. SWR отслеживает `debouncedQuery`, делает API-запрос.
6. Таблица обновляется, но поле ввода сохраняет фокус.

---

## ⚙️ Настройка компонента AdminSearchInput.jsx

```tsx
'use client';
import { useEffect, useState } from 'react';

export default function AdminSearchInput({ onSearchChange }) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(inputValue);
    }, 400); // debounce delay

    return () => clearTimeout(handler);
  }, [inputValue, onSearchChange]);

  return (
    <input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder="Поиск..."
      className="input"
    />
  );
}
```

---

## 📄 Настройка страницы page.js (или page.tsx)

```tsx
'use client';
import { useState } from 'react';
import useSWR from 'swr';
import AdminSearchInput from './AdminSearchInput';
import MapTemplatesTable from './MapTemplatesTable';

const fetcher = (url) => fetch(url).then(res => res.json());

export default function Page() {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data, isLoading } = useSWR(
    () => debouncedQuery ? `/api/templates?query=${debouncedQuery}` : '/api/templates',
    fetcher
  );

  return (
    <div>
      <AdminSearchInput onSearchChange={setDebouncedQuery} />
      <MapTemplatesTable templates={data || []} isLoading={isLoading} />
    </div>
  );
}
```

---

## 🌐 SWRConfig: Глобальная настройка

Рекомендуется добавить в `app/layout.js` или `_app.js`:

```tsx
import { SWRConfig } from 'swr';

export default function RootLayout({ children }) {
  return (
    <SWRConfig value={{
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }}>
      {children}
    </SWRConfig>
  );
}
```

---

## 🧠 Особенности SWR из документации

### `keepPreviousData: true`
- Сохраняет предыдущие данные при загрузке новых.
- Предотвращает мигание или исчезновение таблицы во время запроса.

### `dedupingInterval`
- Устанавливает минимальный интервал между одинаковыми запросами.

### `cache`
- Можно управлять вручную через `mutate`, `cache.get`, `cache.set`.
- Полезно для оптимистичных обновлений или синхронизации между вкладками.

Документация:
- [Кэш](https://swr.vercel.app/ru/docs/advanced/cache)
- [Глобальная конфигурация](https://swr.vercel.app/ru/docs/global-configuration)

---

## ✅ Результат

- Быстрый и отзывчивый поиск.
- Фокус в поле ввода сохраняется.
- Оптимальное количество запросов.
- Чистая архитектура с разделением локального и глобального состояния.
