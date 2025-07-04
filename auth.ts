import NextAuth from 'next-auth';
import Yandex from 'next-auth/providers/yandex';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/user/User';
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
        
        // ✅ Ищем пользователя по yandexId (основной ключ) или email
        let dbUser = user?.yandexId
          ? await User.findOne({ yandexId: user.yandexId })
          : await User.findOne({ email: session.user.email }); // Fallback для совместимости

        // ⛳ Автоматическое создание пользователя при первом логине
        if (!dbUser && user?.yandexId && session.user?.email) {
          dbUser = await User.create({
            yandexId: user.yandexId,
            email: session.user.email,
            role: 'user',
          });
        }

        if (dbUser) {
          // ✅ THROTTLING: Обновляем lastLoginAt максимум раз в 30 минут
          const now = new Date();
          const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
          
          if (!dbUser.lastLoginAt || dbUser.lastLoginAt < thirtyMinutesAgo) {
            await User.findByIdAndUpdate(dbUser._id, {
              lastLoginAt: now,
            });
          }
          
          // Заполняем сессию
          session.user.id = dbUser._id.toString();
          session.user.yandexId = dbUser.yandexId;
          session.user.role = dbUser.role as Role;
          session.user.isAdmin = dbUser.role !== 'user';
          session.user.adminId = dbUser.role !== 'user' ? dbUser._id.toString() : undefined;
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