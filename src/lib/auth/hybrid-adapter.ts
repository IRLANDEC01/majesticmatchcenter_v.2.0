import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from '@auth/core/adapters';
import { Types } from 'mongoose';
import User from '@/models/user/User';
import { getSessionRedisClient } from '@/lib/redis-clients';
import { connectToDatabase } from '@/lib/db';
/**
 * Гибридный адаптер Auth.js v5
 *  – Пользователи хранятся в MongoDB (источник правды)
 *  – Сессии и аккаунты OAuth — в Redis для быстрого O(1) доступа
 */
async function ensureDb() {
  await connectToDatabase();   // многоразовый вызов безопасен
}
export function createHybridAdapter(): Adapter {
  const redis = getSessionRedisClient();

  /* ---------------- Пользователи (Mongo) ---------------- */
  return {
    /** Создание пользователя в Mongo
     * Передаваемый объект может содержать только email/имя, поэтому создаём _id сами. */
    async createUser(partial) {
      await ensureDb();
      const _id = new Types.ObjectId();
      const dbUser = await User.create({ _id, ...partial });
      return {
        id: dbUser._id.toString(),
        name: dbUser.name ?? null,
        email: dbUser.email ?? null,
        emailVerified: null,
        image: dbUser.image ?? null,
        role: (dbUser.role ?? 'user') as any,
        yandexId: (dbUser.yandexId as any) ?? null,
      } as AdapterUser;
    },

    async getUser(id) {
      await ensureDb();
      return (await User.findById(id)) as unknown as AdapterUser | null;
    },

    async getUserByEmail(email) {
      await ensureDb();
      return (await User.findOne({ email })) as unknown as AdapterUser | null;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      await ensureDb();
         const accountKey = `auth:account:${provider}:${providerAccountId}`;
      
          /* 1) Быстрый путь ─ пытаемся найти в Redis */
          const cachedUserId = await redis.get(accountKey);
          if (cachedUserId) {
            return (await User.findById(cachedUserId)) as unknown as AdapterUser | null;
          }
      
          /* 2) Fallback ─ ищем в Mongo: 1 запрос, без сканов */
          if (provider === 'yandex') {
            const mongoUser = await User.findOne({ yandexId: providerAccountId });
            if (mongoUser) {
              // 3) Восстанавливаем кэш, чтобы далее снова работать в O(1)
              await redis.setex(accountKey, 60 * 60 * 24 * 30, mongoUser._id.toString());
              return mongoUser as unknown as AdapterUser;
            }
          }
      
          return null;        // учётка действительно неизвестна
        },

    async updateUser(user) {
      await ensureDb();
      await User.findByIdAndUpdate(user.id, user, { new: true });
      return user as AdapterUser;
    },

    async deleteUser(id) {
      await ensureDb();
      await User.findByIdAndDelete(id);
    },

    /* ---------------- Аккаунты OAuth (Redis) ---------------- */
    async linkAccount(account) {
      const accountKey = `auth:account:${account.provider}:${account.providerAccountId}`;
      await redis.setex(accountKey, 60 * 60 * 24 * 30, account.userId);
      return account as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }) {
      const accountKey = `auth:account:${provider}:${providerAccountId}`;
      await redis.del(accountKey);
    },

    /* ---------------- Сессии (Redis) ---------------- */
    async createSession(session) {
      const data = { ...session, id: session.sessionToken };
      await redis.setex(`auth:session:${session.sessionToken}`, 60 * 60 * 48, JSON.stringify(data));
      return data as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      await ensureDb();
      const raw = await redis.get(`auth:session:${sessionToken}`);
      if (!raw) return null;
      const session = JSON.parse(raw) as AdapterSession;
      const user = (await User.findById(session.userId)) as unknown as AdapterUser | null;
      if (!user) return null;
      return { session, user };
    },

    async updateSession(session) {
      await redis.setex(`auth:session:${session.sessionToken}`, 60 * 60 * 48, JSON.stringify(session));
      return session as AdapterSession;
    },

    async deleteSession(sessionToken) {
      await redis.del(`auth:session:${sessionToken}`);
    },

    /* ---------------- Verification Token (Redis) -------------- */
    async createVerificationToken(token) {
      await redis.setex(`auth:token:${token.identifier}:${token.token}`, 60 * 15, JSON.stringify(token));
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      const key = `auth:token:${identifier}:${token}`;
      const raw = await redis.get(key);
      if (!raw) return null;
      await redis.del(key);
      return JSON.parse(raw);
    },
  };
} 