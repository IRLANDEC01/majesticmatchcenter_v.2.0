import { handlers } from '../../../../../auth';

/**
 * NextAuth.js v5 API Route Handler
 * 
 * Обрабатывает все OAuth запросы:
 * - GET /api/auth/signin - страница входа
 * - POST /api/auth/signin/yandex - OAuth callback  
 * - GET /api/auth/callback/yandex - OAuth response
 * - POST /api/auth/signout - выход
 * - GET /api/auth/session - получение сессии
 * 
 * @see https://authjs.dev/getting-started/installation?framework=Next.js
 */
export const { GET, POST } = handlers;
 