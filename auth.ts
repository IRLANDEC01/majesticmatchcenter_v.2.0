import { connectToDatabase } from "@/lib/db";
await connectToDatabase(); // единоразовый коннект при cold-start
import NextAuth from "next-auth";
import Yandex from "next-auth/providers/yandex";
import User from "@/models/user/User";
import { createHybridAdapter } from "@/lib/auth/hybrid-adapter";
import type { Role } from "@/shared/lib/permissions";

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
  debug: process.env.NODE_ENV === "development",

  // ✅ ИСПРАВЛЕНО: Используем готовый Redis adapter вместо JWT
  adapter: createHybridAdapter(),

  providers: [
    Yandex({
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
      authorization: {
        url: "https://oauth.yandex.ru/authorize",
        params: {
          scope: "login:email",
          prompt: "consent", // Всегда показывать окно выбора аккаунта Yandex
        },
      },
      checks: ["state"],
    }),
  ],

  session: {
    strategy: "database", // ✅ ИСПРАВЛЕНО: Database strategy с Redis
    maxAge: 60 * 60 * 24 * 2, // 48 часов
    updateAge: 60 * 30, // Обновление каждые 30 минут
  },

  callbacks: {
    // ✅ СТАЛО: Логика перенесена в signIn. Здесь только обогащаем сессию.
    async session({ session, user }) {
      if (session.user) {
        // Роль уже должна быть в user, т.к. мы её сохраняем/обновляем в signIn
        session.user.id = user.id;
        session.user.role = (user.role || "user") as Role;
        session.user.yandexId = user.yandexId;
        session.user.isAdmin = user.role !== "user";
      }
      return session;
    },

    // ✅ ПРАВИЛЬНО: Логика создания/проверки пользователя при входе
    async signIn({ user, account, profile }) {
      // Работаем только с провайдером yandex
      if (account?.provider !== "yandex" || !profile?.id) {
        // ИЗМЕНЕНО: profile.sub -> profile.id
        return false; // Отклоняем другие типы входа
      }

      try {
        await connectToDatabase();

        // Ищем пользователя по yandexId
        let dbUser = await User.findOne({ yandexId: profile.id });

        // Создаем пользователя, если он не найден
        if (!dbUser) {
          // --- АВТОКОРРЕКЦИЯ UUID ➜ ObjectId ----------------------------------
          const { Types } = await import("mongoose");
          const { getSessionRedisClient } = await import("@/lib/redis-clients");

          const redisClient = getSessionRedisClient();
          const ttl = 60 * 60 * 24 * 30; // 30 дней

          // Проверяем, является ли id из Redis валидным ObjectId
          let mongoId: InstanceType<typeof Types.ObjectId>;
          if (Types.ObjectId.isValid(user.id)) {
            mongoId = new Types.ObjectId(user.id);
          } else {
            // Генерируем новый ObjectId и синхронизируем связанные ключи в Redis
            mongoId = new Types.ObjectId();

            if (account?.provider && account?.providerAccountId) {
              await redisClient.setex(
                `auth:account:${account.provider}:${account.providerAccountId}`,
                ttl,
                mongoId.toString()
              );
            }

            await redisClient.setex(
              `auth:user:${mongoId.toString()}`,
              ttl,
              JSON.stringify({
                ...user,
                id: mongoId.toString(),
                isAdmin: false,
              })
            );

            // Обновляем id в объекте user, чтобы вся цепочка работала с корректным значением
            user.id = mongoId.toString();
          }
          const isSuper = process.env.SUPERADMIN_YANDEX_ID === profile.id;
          // Создаём Mongo-документ с правильным _id
          dbUser = await User.create({
            _id: mongoId,
            yandexId: profile.id,
            email: profile.default_email,
            role: isSuper ? "super" : "user", // по умолчанию
          });
        } else {

          // --- АВТОПОВЫШЕНИЕ существующего пользователя до super ----------
          const needUpgrade =
            process.env.SUPERADMIN_YANDEX_ID === dbUser.yandexId &&
            dbUser.role !== 'super';

          if (needUpgrade) {
            dbUser.role = 'super';
            await dbUser.save();
          }

          // --- Синхронизация Redis-ID ------------------------------------
          if (dbUser._id.toString() !== user.id) {
            const { getSessionRedisClient } = await import('@/lib/redis-clients');
            const redisClient = getSessionRedisClient();
            const ttl = 60 * 60 * 24 * 30;
            await redisClient.setex(
              `auth:user:${dbUser._id.toString()}`,
              ttl,
              JSON.stringify({
                ...user,
                id: dbUser._id.toString(),
                role: dbUser.role,
              })
            );
            user.id = dbUser._id.toString();
          }

        }

       
        // Обновляем дату последнего входа
        // Throttling можно реализовать здесь или оставить в сессии, если нужно
        await User.findByIdAndUpdate(dbUser._id, {
          lastLoginAt: new Date(),
        });

        // Добавляем данные в объект user, который пойдет в адаптер
        user.role = dbUser.role as Role;
        user.yandexId = dbUser.yandexId;
        user.isAdmin = dbUser.role !== "user";

        return "/admin"; // Успешный вход: сразу редиректим в админку
      } catch (error) {
        console.error("Ошибка при входе пользователя:", error);
        return false; // Блокируем вход при ошибке
      }
    },
  },

  pages: {
    signIn: "/admin/login", // Кастомная страница входа для админов
    error: "/admin/auth-error",
  },

  events: {
    async signIn({ user, profile }) {
      // Логируем успешные входы в систему
      console.log(`User login: ${user.email} (${profile?.id})`); // ИЗМЕНЕНО: profile?.sub -> profile?.id
    },
  },
});
/**
 * Экспортируем auth для использования в middleware и серверных компонентах
 */
export { auth as getServerSession };
