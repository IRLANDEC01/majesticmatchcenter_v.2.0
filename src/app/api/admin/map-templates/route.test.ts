import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from './route';
import { dbConnect, dbClear, dbDisconnect } from '@/lib/test-helpers';
import MapTemplate from '@/models/map/MapTemplate';
import AuditLog from '@/models/audit/AuditLog';

describe('/api/admin/map-templates', () => {
  beforeEach(async () => {
    await dbConnect();
  });

  afterEach(async () => {
    await dbClear();
    await dbDisconnect();
  });

  describe('GET', () => {
    it('должен возвращать список активных шаблонов по умолчанию', async () => {
      await MapTemplate.create({ name: 'Active Template' });
      await MapTemplate.create({ name: 'Archived Template', isArchived: true });

      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Active Template');
    });

    it('должен корректно применять пагинацию', async () => {
      for (let i = 1; i <= 15; i++) {
        await MapTemplate.create({ name: `Template ${i}` });
      }

      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost/api/admin/map-templates?page=2&limit=5',
      });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(5);
      expect(body.total).toBe(15);
      expect(body.page).toBe(2);
      expect(body.totalPages).toBe(3);
      expect(body.data[0].name).toBe('Template 6');
    });

    it('должен возвращать только архивные шаблоны при status=archived', async () => {
      await MapTemplate.create({ name: 'Active Template' });
      await MapTemplate.create({ name: 'Archived Template', isArchived: true });
      
      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost/api/admin/map-templates?status=archived',
      });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Archived Template');
    });

    it('должен возвращать все шаблоны при status=all', async () => {
      await MapTemplate.create({ name: 'Active Template' });
      await MapTemplate.create({ name: 'Archived Template', isArchived: true });

      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost/api/admin/map-templates?status=all',
      });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
    });

    it('должен фильтровать по имени с помощью параметра q', async () => {
      await MapTemplate.create({ name: 'Searchable Alpha' });
      await MapTemplate.create({ name: 'Searchable Bravo' });
      await MapTemplate.create({ name: 'Another One' });

      const { req } = createMocks({
        method: 'GET',
        url: 'http://localhost/api/admin/map-templates?q=Searchable',
      });
      const response = await GET(req);
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
    });
  });

  describe('POST', () => {
    it('должен успешно создавать новый шаблон и запись в логе аудита', async () => {
      await dbClear();
      const templateData = { name: 'My New Awesome Template' };
      const { req } = createMocks({
        method: 'POST',
        body: templateData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(templateData.name);

      const dbTemplate = await MapTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();

      const auditLog = await AuditLog.findOne({ entityId: body._id });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.action).toBe('create');
      expect(auditLog?.entity).toBe('MapTemplate');
    });

    it('должен возвращать 409, если шаблон с таким именем уже существует', async () => {
      await MapTemplate.create({ name: 'Existing Template' });
      const templateData = { name: 'Existing Template' };
      const { req } = createMocks({
        method: 'POST',
        body: templateData,
      });

      const response = await POST(req);
      
      expect(response.status).toBe(409);
    });
    
    it('должен возвращать 400 при невалидных данных (например, без названия)', async () => {
      const templateData = { description: 'some description' };
       const { req } = createMocks({
        method: 'POST',
        body: templateData,
      });

      const response = await POST(req);
      const body = await response.json();
      
      expect(response.status).toBe(400);
      expect(body.errors.name).toBeDefined();
    });
  });
}); 