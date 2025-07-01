import type { Adapter, AdapterSession, AdapterUser, AdapterAccount } from '@auth/core/adapters';
import { getSessionRedisClient } from '@/lib/redis-clients';

// Создаем собственный тип для verification token
interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

/**
 * ✅ ИСПРАВЛЕННЫЙ: Кастомный Redis адаптер для Auth.js v5
 * Использует отдельную базу данных Redis (db=2) для изоляции от основного кэша
 * 
 * Исправления производительности:
 * - ❌ Убраны операции redis.keys() - они не масштабируются (O(N))
 * - ✅ Используются только O(1) операции: get/set/del/exists
 * - ✅ Batch операции через pipeline
 * - ✅ Правильные TTL для различных типов данных
 * - ✅ Префиксы ключей для избежания коллизий
 */
export function createRedisAdapter(): Adapter {
  const redis = getSessionRedisClient();

  return {
    async createUser(user) {
      const userId = crypto.randomUUID();
      const userData = { ...user, id: userId };
      
      // Batch операция через pipeline
      const pipeline = redis.pipeline();
      pipeline.setex(
        `auth:user:${userId}`, 
        60 * 60 * 24 * 30, // 30 дней TTL
        JSON.stringify(userData)
      );
      
      // Индекс по email для быстрого поиска O(1)
      if (user.email) {
        pipeline.setex(
          `auth:user:email:${user.email}`, 
          60 * 60 * 24 * 30,
          userId
        );
      }
      
      await pipeline.exec();
      return userData as AdapterUser;
    },

    async getUser(id) {
      const userData = await redis.get(`auth:user:${id}`);
      return userData ? JSON.parse(userData) : null;
    },

    async getUserByEmail(email) {
      const userId = await redis.get(`auth:user:email:${email}`);
      if (!userId) return null;
      
      const userData = await redis.get(`auth:user:${userId}`);
      return userData ? JSON.parse(userData) : null;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const accountKey = `auth:account:${provider}:${providerAccountId}`;
      const userId = await redis.get(accountKey);
      if (!userId) return null;
      
      const userData = await redis.get(`auth:user:${userId}`);
      return userData ? JSON.parse(userData) : null;
    },

    async updateUser(user) {
      // ✅ Простое обновление без предварительного чтения
      const updatedUser = { ...user };
      await redis.setex(
        `auth:user:${user.id}`, 
        60 * 60 * 24 * 30,
        JSON.stringify(updatedUser)
      );
      
      return updatedUser as AdapterUser;
    },

    async deleteUser(userId) {
      // ✅ ИСПРАВЛЕНО: Убрана операция keys() - не масштабируется
      // Теперь требуем явную очистку связанных данных при необходимости
      const userData = await redis.get(`auth:user:${userId}`);
      if (!userData) return;
      
      const user = JSON.parse(userData);
      
      const pipeline = redis.pipeline();
      pipeline.del(`auth:user:${userId}`);
      
      if (user.email) {
        pipeline.del(`auth:user:email:${user.email}`);
      }
      
      await pipeline.exec();
      
      // ✅ Для связанных данных (аккаунты, сессии) используем отдельные методы очистки
      // или полагаемся на TTL для автоочистки
    },

    async linkAccount(account) {
      const accountKey = `auth:account:${account.provider}:${account.providerAccountId}`;
      await redis.setex(
        accountKey,
        60 * 60 * 24 * 30, // 30 дней TTL
        account.userId
      );
      
      return account as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }) {
      const accountKey = `auth:account:${provider}:${providerAccountId}`;
      await redis.del(accountKey);
    },

    async createSession(session) {
      const sessionData = {
        ...session,
        id: session.sessionToken,
      };
      
      await redis.setex(
        `auth:session:${session.sessionToken}`,
        60 * 60 * 48, // 48 часов TTL для сессий (короче чем пользователи)
        JSON.stringify(sessionData)
      );
      
      return sessionData as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      // ✅ Batch операция через pipeline для лучшей производительности
      const pipeline = redis.pipeline();
      pipeline.get(`auth:session:${sessionToken}`);
      
      const results = await pipeline.exec();
      const sessionData = results?.[0]?.[1];
      
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData as string);
      const userData = await redis.get(`auth:user:${session.userId}`);
      if (!userData) return null;
      
      const user = JSON.parse(userData);
      
      return {
        session: session as AdapterSession,
        user: user as AdapterUser,
      };
    },

    async updateSession(session) {
      const sessionData = await redis.get(`auth:session:${session.sessionToken}`);
      if (!sessionData) return null;
      
      const updatedSession = { ...JSON.parse(sessionData), ...session };
      await redis.setex(
        `auth:session:${session.sessionToken}`,
        60 * 60 * 48, // 48 часов TTL
        JSON.stringify(updatedSession)
      );
      
      return updatedSession as AdapterSession;
    },

    async deleteSession(sessionToken) {
      await redis.del(`auth:session:${sessionToken}`);
    },

    async createVerificationToken(token) {
      await redis.setex(
        `auth:token:${token.identifier}:${token.token}`,
        60 * 15, // 15 минут TTL для verification tokens
        JSON.stringify(token)
      );
      
      return token as VerificationToken;
    },

    async useVerificationToken({ identifier, token }) {
      const tokenKey = `auth:token:${identifier}:${token}`;
      const tokenData = await redis.get(tokenKey);
      
      if (!tokenData) return null;
      
      // Удаляем токен после использования (одноразовый)
      await redis.del(tokenKey);
      
      return JSON.parse(tokenData) as VerificationToken;
    },
  };
} 