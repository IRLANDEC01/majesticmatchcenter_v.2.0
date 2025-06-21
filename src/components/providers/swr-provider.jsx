'use client';

import { SWRConfig } from 'swr';
import { Toaster } from 'sonner';

/**
 * Стандартная fetcher-функция для SWR.
 * Глобально обрабатывает ответы и ошибки fetch.
 * @param {...any} args - Аргументы, передаваемые в нативный fetch.
 * @returns {Promise<any>} - Распарсенный JSON.
 * @throws {Error} - Если ответ сервера не 'ok'.
 */
const fetcher = async (...args) => {
  const res = await fetch(...args);

  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({})); // Попытаться получить JSON, иначе пустой объект
    const error = new Error(
      errorPayload.message || 'Произошла ошибка при выполнении запроса.'
    );
    // Добавляем дополнительную информацию к объекту ошибки
    error.info = errorPayload;
    error.status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * SWRProvider оборачивает приложение глобальной конфигурацией для SWR.
 * Это позволяет избежать дублирования настроек в каждом хуке.
 * Также здесь централизованно размещается Toaster для уведомлений.
 */
export function SWRProvider({ children }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Отключаем повторные запросы при фокусе на окне, т.к. для админ-панели это избыточно
        revalidateOnFocus: false, 
        // Отключаем автоматические повторные попытки при ошибках
        shouldRetryOnError: false, 
      }}
    >
      {children}
      {/* 
        Toaster для уведомлений. Мы используем richColors для красивых 
        иконок успеха/ошибки и устанавливаем его видимым для 9 уведомлений.
      */}
      <Toaster richColors visibleToasts={9} />
    </SWRConfig>
  );
} 