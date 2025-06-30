'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';

// ✅ ИСПРАВЛЕНО: defaultQueryFn теперь поддерживает meta.url
const defaultQueryFn = async ({ queryKey, meta }: { queryKey: readonly unknown[]; meta?: Record<string, unknown> }) => {
  // Приоритет: meta.url, затем queryKey[0] если это URL
  const url = meta?.url ?? 
              (typeof queryKey[0] === 'string' && queryKey[0].startsWith('/') 
                ? queryKey[0] 
                : null);
                
  if (!url) {
    // Если URL не определен, можно вернуть пустой объект или ошибку
    // В данном случае, возвращаем Promise с null, чтобы не ломать типы
    return Promise.resolve(null);
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

// ✅ ОБНОВЛЕНО: Современная конфигурация для админки
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 60 * 1000,      // 60 секунд - данные свежие для админки
      gcTime: 5 * 60 * 1000,     // 5 минут - garbage collection
      retry: false,              // Админка: без автоповторов (важна точность)
      refetchOnWindowFocus: false, // Не перезапрашиваем при фокусе
    },
    mutations: {
      retry: false,              // Мутации не повторяем автоматически
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Провайдер TanStack Query для админки
 * Настроен для точности и производительности административного интерфейса
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Toaster для уведомлений (перенесен из SWRProvider) */}
      <Toaster richColors visibleToasts={9} />
      {/* ✅ DevTools только в development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
