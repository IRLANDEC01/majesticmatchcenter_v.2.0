'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Клиентский провайдер аутентификации для FSD архитектуры
 * 
 * Обертка над SessionProvider из NextAuth.js v5, 
 * позволяющая использовать useSession() во всех дочерних компонентах
 * 
 * @example
 * ```tsx
 * // В app/layout.tsx
 * <AuthProvider>
 *   {children}
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
} 