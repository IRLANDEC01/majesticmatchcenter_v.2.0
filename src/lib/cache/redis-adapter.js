import 'server-only';
import { CacheAdapter } from './cache-adapter';
import getRedisClient from '../redis';

// Префикс для ключей, в которых хранятся множества тегов.
const TAG_SET_PREFIX = 'tag:';

class RedisAdapter extends CacheAdapter {
  constructor() {
    super();
    this.client = getRedisClient();
  }

  async get(key) {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, options = {}) {
    const { ttl, tags } = options;
    const serializedValue = JSON.stringify(value);

    const multi = this.client.multi();
    if (ttl) {
      multi.setex(key, ttl, serializedValue);
    } else {
      multi.set(key, serializedValue);
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        multi.sadd(`${TAG_SET_PREFIX}${tag}`, key);
      }
    }

    await multi.exec();
  }

  async delete(key) {
    await this.client.del(key);
  }

  async invalidateByTag(tag) {
    const tagKey = `${TAG_SET_PREFIX}${tag}`;
    const keysToDelete = await this.client.smembers(tagKey);
    
    if (keysToDelete.length > 0) {
      const multi = this.client.multi();
      multi.del(...keysToDelete); // Удаляем все ключи, связанные с тегом
      multi.del(tagKey); // Удаляем и само множество тегов
      await multi.exec();
    }
  }

  async flush() {
    await this.client.flushdb();
  }
}

export default RedisAdapter; 