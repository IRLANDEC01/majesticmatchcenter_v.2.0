import 'next-auth';
import 'next-auth/jwt';
import type { Role } from '@/shared/lib/permissions';

/**
 * Расширения типов NextAuth.js для поддержки RBAC
 * 
 * Добавляет поля для:
 * - Yandex ID интеграции
 * - Ролевой модели администраторов
 * - Связи с AdminUser MongoDB коллекцией
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      // ✅ Кастомные поля для админ-панели
      yandexId?: string;        // Yandex profile.sub
      isAdmin?: boolean;        // Является ли пользователь администратором
      role?: Role;              // Роль администратора (super/admin/moderator)
      adminId?: string;         // ObjectId AdminUser документа
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    // ✅ Кастомные поля для админ-панели
    yandexId?: string;
    isAdmin?: boolean;
    role?: Role;
    adminId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    // Стандартные поля
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    
    // ✅ Кастомные поля для админ-панели
    yandexId?: string;        // Yandex profile.sub
    isAdmin?: boolean;        // Является ли пользователь администратором
    role?: Role;              // Роль администратора
    adminId?: string;         // ObjectId AdminUser документа
  }
} 