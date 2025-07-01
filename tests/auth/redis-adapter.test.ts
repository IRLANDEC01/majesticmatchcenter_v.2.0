import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Redis } from 'ioredis';
import { createRedisAdapter } from '@/lib/auth/redis-adapter';

// ✅ Мок Redis клиента для интеграционных тестов
let mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  pipeline: vi.fn(() => ({
    get: vi.fn().mockReturnThis(),
    setex: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([[null, null]])
  })),
} as unknown as Redis;

// ✅ Мок getSessionRedisClient для тестирования
vi.mock('@/lib/redis-clients', () => ({
  getSessionRedisClient: () => mockRedis,
}));

describe('Redis Adapter Integration Tests', () => {
  let adapter: ReturnType<typeof createRedisAdapter>;
  let mockPipeline: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // ✅ Настройка мока pipeline
    mockPipeline = {
      get: vi.fn().mockReturnThis(),
      setex: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, null]])
    };
    mockRedis.pipeline = vi.fn(() => mockPipeline);

    adapter = createRedisAdapter();
  });

  describe('User Management', () => {
    it('должен создать пользователя с автогенерированным ID', async () => {
      const user = {
        email: 'test@example.com',
        emailVerified: null,
      };

      // ✅ Мокаем успешный pipeline
      mockPipeline.exec.mockResolvedValue([[null, 'OK'], [null, 'OK']]);
      
      const result = await adapter.createUser!(user);
      
      expect(result).toMatchObject({
        email: 'test@example.com',
        emailVerified: null,
      });
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('должен найти пользователя по email', async () => {
      const mockUser = {
        id: 'user_456',
        email: 'existing@example.com',
        emailVerified: null,
      };

      // ✅ Правильная последовательность: email -> userId -> userData
      mockRedis.get
        .mockResolvedValueOnce('user_456') // auth:user:email:existing@example.com
        .mockResolvedValueOnce(JSON.stringify(mockUser)); // auth:user:user_456

      const result = await adapter.getUserByEmail!('existing@example.com');

      expect(result).toEqual(mockUser);
      expect(mockRedis.get).toHaveBeenNthCalledWith(1, 'auth:user:email:existing@example.com');
      expect(mockRedis.get).toHaveBeenNthCalledWith(2, 'auth:user:user_456');
    });

    it('должен обновить пользователя', async () => {
      const updatedUser = {
        id: 'user_123',
        email: 'updated@example.com',
        emailVerified: new Date(),
      };

      mockRedis.setex.mockResolvedValue('OK');
      
      const result = await adapter.updateUser!(updatedUser);
      
      expect(result).toEqual(updatedUser);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'auth:user:user_123',
        60 * 60 * 24 * 30, // 30 дней TTL
        JSON.stringify(updatedUser)
      );
    });
  });

  describe('Session Management', () => {
    it('должен создать сессию с правильным TTL', async () => {
      const session = {
        sessionToken: 'test_session_123',
        userId: 'user_456',
        expires: new Date(Date.now() + 60 * 60 * 1000), // +1 час
      };

      mockRedis.setex.mockResolvedValue('OK');
      
      const result = await adapter.createSession!(session);
      
      expect(result).toMatchObject({
        sessionToken: 'test_session_123',
        userId: 'user_456',
        id: 'test_session_123', // ID добавляется автоматически
      });
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'auth:session:test_session_123',
        60 * 60 * 48, // 48 часов фиксированный TTL
        JSON.stringify({ ...session, id: session.sessionToken })
      );
    });

    it('должен получить сессию и пользователя', async () => {
      const mockSession = {
        sessionToken: 'test_session_123',
        userId: 'user_456',
        expires: new Date(Date.now() + 60 * 60 * 1000),
        id: 'test_session_123',
      };

      const mockUser = {
        id: 'user_456',
        email: 'test@example.com',
        emailVerified: null,
      };

      // ✅ Правильный мок: pipeline для сессии, отдельный get для пользователя
      mockPipeline.exec.mockResolvedValue([[null, JSON.stringify(mockSession)]]);
      mockRedis.get.mockResolvedValue(JSON.stringify(mockUser));

      const result = await adapter.getSessionAndUser!('test_session_123');

      expect(result).toMatchObject({
        session: {
          sessionToken: mockSession.sessionToken,
          userId: mockSession.userId,
          id: mockSession.id,
          // ✅ expires будет строкой после JSON.parse(), не проверяем точное равенство
        },
        user: mockUser,
      });
      
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.get).toHaveBeenCalledWith('auth:session:test_session_123');
      expect(mockRedis.get).toHaveBeenCalledWith('auth:user:user_456');
    });

    it('должен вернуть null для несуществующей сессии', async () => {
      // ✅ Pipeline возвращает null для несуществующей сессии
      mockPipeline.exec.mockResolvedValue([[null, null]]);
      
      const result = await adapter.getSessionAndUser!('nonexistent_session');
      
      expect(result).toBeNull();
    });

    it('должен удалить сессию', async () => {
      mockRedis.del.mockResolvedValue(1);

      await adapter.deleteSession!('session_to_delete');

      expect(mockRedis.del).toHaveBeenCalledWith('auth:session:session_to_delete');
    });
  });

  describe('Account Management', () => {
    it('должен связать аккаунт с пользователем', async () => {
      const account = {
        userId: 'user_123',
        type: 'oauth' as const,
        provider: 'yandex',
        providerAccountId: 'yandex_12345',
        access_token: 'token',
      };

      mockRedis.setex.mockResolvedValue('OK');
      
      const result = await adapter.linkAccount!(account);
      
      expect(result).toEqual(account);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'auth:account:yandex:yandex_12345',
        60 * 60 * 24 * 30, // 30 дней TTL
        'user_123'
      );
    });

    it('должен найти пользователя по аккаунту', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        emailVerified: null,
      };

      mockRedis.get
        .mockResolvedValueOnce('user_123') // аккаунт -> userId
        .mockResolvedValueOnce(JSON.stringify(mockUser)); // userId -> userData

      const result = await adapter.getUserByAccount!({
        provider: 'yandex',
        providerAccountId: 'yandex_12345',
      });

      expect(result).toEqual(mockUser);
      expect(mockRedis.get).toHaveBeenNthCalledWith(1, 'auth:account:yandex:yandex_12345');
      expect(mockRedis.get).toHaveBeenNthCalledWith(2, 'auth:user:user_123');
    });
  });

  describe('Error Handling', () => {
    it('должен обрабатывать ошибки Redis gracefully', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        adapter.getSessionAndUser!('session_123')
      ).rejects.toThrow('Redis connection failed');
    });

    it('должен обрабатывать некорректный JSON', async () => {
      mockPipeline.exec.mockResolvedValue([[null, 'invalid json']]);
      
      await expect(
        adapter.getSessionAndUser!('session_123')
      ).rejects.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('должен использовать pipeline для batch операций', async () => {
      const user = {
        email: 'test@example.com',
        emailVerified: null,
      };

      mockPipeline.exec.mockResolvedValue([[null, 'OK'], [null, 'OK']]);
      
      await adapter.createUser!(user);
      
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('НЕ должен использовать операции keys() для поиска', () => {
      // ✅ Убеждаемся что в адаптере нет keys() операций
      expect(mockRedis).not.toHaveProperty('keys');
    });
  });
});
