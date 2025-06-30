#!/usr/bin/env tsx

/**
 * Скрипт для исправления прав доступа к существующим файлам в S3
 * Устанавливает ACL: 'public-read' для всех загруженных изображений
 */

import { PutObjectAclCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client } from '../src/lib/s3/client';
import { env } from '../src/lib/env/validation';

async function fixS3Permissions() {
  console.log('🔧 Исправление прав доступа к файлам в S3...');
  
  try {
    // Получаем список всех объектов в bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: env.S3_BUCKET,
    });
    
    const response = await s3Client.send(listCommand);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('📂 Bucket пуст, нечего исправлять.');
      return;
    }
    
    console.log(`📁 Найдено ${response.Contents.length} файлов.`);
    
    // Устанавливаем public-read ACL для каждого файла
    const promises = response.Contents.map(async (object) => {
      if (!object.Key) return;
      
      try {
        const aclCommand = new PutObjectAclCommand({
          Bucket: env.S3_BUCKET,
          Key: object.Key,
          ACL: 'public-read',
        });
        
        await s3Client.send(aclCommand);
        console.log(`✅ ${object.Key}`);
      } catch (error) {
        console.error(`❌ Ошибка для ${object.Key}:`, error);
      }
    });
    
    await Promise.all(promises);
    console.log('🎉 Исправление прав доступа завершено!');
    
  } catch (error) {
    console.error('💥 Ошибка при исправлении прав доступа:', error);
    throw error;
  }
}

// Запуск скрипта
fixS3Permissions()
  .then(() => {
    console.log('✨ Скрипт завершен успешно.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Скрипт завершился с ошибкой:', error);
    process.exit(1);
  }); 