import NextAuth from 'next-auth';
import Yandex from 'next-auth/providers/yandex';
import { connectToDatabase } from '@/lib/db';
import AdminUser from '@/models/admin/AdminUser';
import { createRedisAdapter } from '@/lib/auth/redis-adapter';
import type { Role } from '@/shared/lib/permissions';

/**
 * NextAuth.js v5 конфигурация для админ-панели
 * 
 * Включает:
 * - Yandex ID OAuth провайдер
 * - ✅ Redis adapter для сессий (database strategy)
 * - RBAC интеграция с AdminUser моделью
 * - Автоматическое обновление lastLoginAt
 * 
 * @see https://authjs.dev/getting-started/installation?framework=Next.js
 * @see https://yandex.ru/dev/id/doc/ru/
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  
  // ✅ ИСПРАВЛЕНО: Используем готовый Redis adapter вместо JWT
  adapter: createRedisAdapter(),
  
  providers: [
    Yandex({
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
      authorization: {
        url: 'https://oauth.yandex.ru/authorize',
        params: {
          scope: 'login:email',
        },
      },
    }),
  ],
  
  session: {
    strategy: 'database', // ✅ ИСПРАВЛЕНО: Database strategy с Redis
    maxAge: 60 * 60 * 24 * 2, // 48 часов
    updateAge: 60 * 30, // Обновление каждые 30 минут
  },

  callbacks: {
    async session({ session, user }) {
      // При database strategy данные берутся из Redis через adapter
      if (session.user?.email) {
        await connectToDatabase();
        
        // ✅ ИСПРАВЛЕНО: Ищем админа по yandexId (более надежно чем email)
        const admin = user?.yandexId 
          ? await AdminUser.findOne({ yandexId: user.yandexId })
          : await AdminUser.findOne({ email: session.user.email }); // Fallback для совместимости
        
        if (admin) {
          // ✅ THROTTLING: Обновляем lastLoginAt максимум раз в 30 минут
          const now = new Date();
          const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
          
          if (!admin.lastLoginAt || admin.lastLoginAt < thirtyMinutesAgo) {
            await AdminUser.findByIdAndUpdate(admin._id, {
              lastLoginAt: now
            });
          }
          
          // Добавляем данные админа в сессию
          session.user.id = admin._id.toString();
          session.user.yandexId = admin.yandexId;
          session.user.role = admin.role as Role;
          session.user.isAdmin = true;
          session.user.adminId = admin._id.toString();
        } else {
          // ✅ ИСПРАВЛЕНО: Пользователь не администратор, но может войти
          session.user.isAdmin = false;
          session.user.role = undefined;
          session.user.adminId = undefined;
        }
      }
      
      return session;
    },

    async signIn({ profile, user }) {
      // ✅ ИСПРАВЛЕНО: Разрешаем вход всем пользователям
      // Проверка прав происходит в middleware и authorize()
      return true; // Все пользователи могут войти, права проверяются позже
    },
  },

  pages: {
    signIn: '/admin/login', // Кастомная страница входа для админов
    error: '/admin/auth-error',
  },

  events: {
    async signIn({ user, profile }) {
      // Логируем успешные входы в систему
      console.log(`User login: ${user.email} (${profile?.sub})`);
    },
  },
});

/**
 * Экспортируем auth для использования в middleware и серверных компонентах
 */
export { auth as getServerSession }; 