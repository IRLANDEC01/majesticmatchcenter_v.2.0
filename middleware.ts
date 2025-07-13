import { auth } from './auth';
import { NextResponse } from 'next/server';
import { can, type Role } from '@/shared/lib/permissions';
import { ROUTE_PERMISSION_PREFIXES } from '@/shared/lib/route-permissions';

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
    if (!req.auth.user?.isAdmin) {
      // Обычных пользователей редиректим на главную страницу
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Дополнительная проверка конкретных прав для маршрута
    for (const [prefix, permission] of ROUTE_PERMISSION_PREFIXES) {
      if (pathname.startsWith(prefix)) {
        if (!can(req.auth.user.role as Role, permission)) {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
      }
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
    
    if (!req.auth.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' }, 
        { status: 403 }
      );
    }

    // Проверка конкретных прав
    for (const [prefix, permission] of ROUTE_PERMISSION_PREFIXES) {
      if (pathname.startsWith(prefix)) {
        if (!can(req.auth.user.role as Role, permission)) {
          return NextResponse.json(
            { error: 'Access denied. Missing permission.' },
            { status: 403 }
          );
        }
      }
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
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*'
  ]
}; 