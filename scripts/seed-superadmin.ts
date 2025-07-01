#!/usr/bin/env tsx

/**
 * ✅ ИСПРАВЛЕННЫЙ: Seed-скрипт для создания супер-администратора
 * 
 * Исправления:
 * - ✅ Проверка аргументов командной строки
 * - ✅ Подтверждение перед изменениями в production
 * - ✅ Установка lastLoginAt для новых пользователей
 * - ✅ Audit log для отслеживания изменений
 * - ✅ Лучшая обработка ошибок
 */

import { connectToDatabase } from '@/lib/db';
import AdminUser from '@/models/admin/AdminUser';
import AuditLog from '@/models/audit/AuditLog';

async function createSuperAdmin() {
  // ✅ Проверка аргументов
  const [, , yandexId, email] = process.argv;

  if (!yandexId || !email) {
    console.error('❌ Использование: npm run seed:superadmin <yandexId> <email>');
    console.error('   Пример: npm run seed:superadmin "123456789" "admin@example.com"');
    process.exit(1);
  }

  // ✅ Простая валидация email
  if (!email.includes('@')) {
    console.error('❌ Неверный формат email:', email);
    process.exit(1);
  }

  try {
    await connectToDatabase();
    console.log('✅ Подключение к MongoDB установлено');

    // ✅ Проверка существующего пользователя
    const existingAdmin = await AdminUser.findOne({ yandexId });
    const existingSuperAdmin = await AdminUser.findOne({ role: 'super' });

    // ✅ Подтверждение в production
    if (process.env.NODE_ENV === 'production') {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirmation = await new Promise<string>((resolve) => {
        rl.question(`⚠️  PRODUCTION: Создать/обновить super-admin ${email} (${yandexId})? [y/N]: `, resolve);
      });

      rl.close();

      if (confirmation.toLowerCase() !== 'y') {
        console.log('❌ Операция отменена пользователем');
        process.exit(0);
      }
    }

    let adminUser;
    let auditAction;

    if (existingAdmin) {
      // ✅ ТИХОЕ ОБНОВЛЕНИЕ: Если уже super - просто обновляем без audit лога
      if (existingAdmin.role === 'super') {
        const needsUpdate = existingAdmin.email !== email || !existingAdmin.lastLoginAt;
        
        if (needsUpdate) {
          adminUser = await AdminUser.findOneAndUpdate(
            { yandexId },
            { 
              email, 
              lastLoginAt: new Date()
            },
            { new: true }
          );
          console.log('✅ Тихое обновление существующего super-admin:', adminUser?.email);
          auditAction = null; // Не создаем audit log при тихом обновлении
        } else {
          adminUser = existingAdmin;
          console.log('ℹ️  Super-admin уже актуален, изменения не требуются');
          auditAction = null;
        }
      } else {
        // Повышаем роль с audit логом
        adminUser = await AdminUser.findOneAndUpdate(
          { yandexId },
          { 
            email, 
            role: 'super',
            lastLoginAt: new Date()
          },
          { new: true }
        );
        auditAction = 'role_change';
        console.log('✅ Пользователь повышен до super-admin:', adminUser?.email);
      }
    } else {
      // Создаем нового пользователя
      adminUser = new AdminUser({
        yandexId,
        email,
        role: 'super',
        lastLoginAt: new Date() // ✅ Устанавливаем дату для нового пользователя
      });
      await adminUser.save();
      auditAction = 'create';
      console.log('✅ Новый super-admin создан:', adminUser.email);
    }

    // ✅ Понижаем предыдущего super-admin если был другой
    if (existingSuperAdmin && existingSuperAdmin.yandexId !== yandexId) {
      await AdminUser.findByIdAndUpdate(existingSuperAdmin._id, { role: 'admin' });
      console.log('✅ Предыдущий super-admin понижен до admin:', existingSuperAdmin.email);

      // Audit log для понижения
      await AuditLog.create({
        adminId: adminUser._id,
        entity: 'AdminUser',
        entityId: existingSuperAdmin._id,
        action: 'role_change',
        changes: { role: { from: 'super', to: 'admin' } },
        context: 'seed_script'
      });
    }

    // ✅ Создаем audit log запись только если есть значимые изменения
    if (auditAction) {
      await AuditLog.create({
        adminId: adminUser._id,
        entity: 'AdminUser', 
        entityId: adminUser._id,
        action: auditAction,
        changes: { 
          role: 'super',
          email,
          yandexId 
        },
        context: 'seed_script'
      });
      console.log('✅ Audit log записан для действия:', auditAction);
    }

    console.log('✅ Super-admin успешно настроен:');
    console.log(`   ID: ${adminUser._id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Yandex ID: ${adminUser.yandexId}`);
    console.log(`   Роль: ${adminUser.role}`);
    console.log(`   Последний вход: ${adminUser.lastLoginAt}`);

  } catch (error) {
    console.error('❌ Ошибка при создании super-admin:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// ✅ Запуск только если скрипт вызван напрямую
if (require.main === module) {
  createSuperAdmin();
} 