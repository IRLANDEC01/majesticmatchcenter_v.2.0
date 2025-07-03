import { auth } from './auth';
import { NextResponse } from 'next/server';

/**
 * NextAuth.js v5 Middleware 
 * 
 * Функции:
 * 1. Автоматическое продление сессий при активности
 * 2. Защита админских маршрутов от неавторизованных пользователей
 * 3. Редирект обычных пользователей на главную страницу
 * 
 * @see https://authjs.dev/getting-started/installation?framework=Next.js
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // Защищаем все админские маршруты
  if (pathname.startsWith('/admin')) {
    if (!req.auth) {
      // Неавторизованных пользователей отправляем на страницу входа
      const signInUrl = new URL('/api/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }
    
    // Проверяем, что пользователь является администратором
    if (!req.auth.user?.isAdmin || !req.auth.user?.role) {
      // Обычных пользователей редиректим на главную страницу
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
  
  // Защищаем API маршруты админки
  if (pathname.startsWith('/api/admin')) {
    if (!req.auth) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    if (!req.auth.user?.isAdmin || !req.auth.user?.role) {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' }, 
        { status: 403 }
      );
    }
  }
  
  return NextResponse.next();
});

/**
 * Конфигурация матчера
 * Middleware применяется только к:
 * - Админским страницам (/admin/*)
 * - API админских маршрутов (/api/admin/*)
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*'
  ]
}; 