import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET, PATCH, DELETE } from './route';
import { dbConnect, dbClear, dbDisconnect } from '@/lib/test-helpers';
import MapTemplate, { IMapTemplate } from '@/models/map/MapTemplate';
import AuditLog from '@/models/audit/AuditLog';
import mongoose, { HydratedDocument } from 'mongoose';

describe('/api/admin/map-templates/[id]', () => {
  beforeEach(async () => {
    await dbConnect();
    await dbClear();
  });

  afterEach(async () => {
    await dbDisconnect();
  });

  describe('GET', () => {
    it('должен успешно возвращать шаблон по ID', async () => {
      const template: HydratedDocument<IMapTemplate> = await MapTemplate.create({ name: 'Find Me' });

      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req, { params: { id: template.id } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('Find Me');
    });

    it('должен возвращать 404, если ID не существует', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req, { params: { id: nonExistentId } });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон и создавать запись в логе аудита', async () => {
      const template: HydratedDocument<IMapTemplate> = await MapTemplate.create({ name: 'Old Name' });
      const updateData = { name: 'New Name', description: 'New description' };

      const { req } = createMocks({
        method: 'PATCH',
        body: updateData,
      });

      const response = await PATCH(req, { params: { id: template.id } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('New Name');

      const dbTemplate = await MapTemplate.findById(template.id);
      expect(dbTemplate?.name).toBe('New Name');

      const auditLog = await AuditLog.findOne({ entityId: template.id, action: 'update' });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.changes).toBeDefined();
      expect((auditLog?.changes as any)?.name?.from).toBe('Old Name');
      expect((auditLog?.changes as any)?.name?.to).toBe('New Name');
    });

    it('должен возвращать 409 при попытке установить уже существующее имя', async () => {
      await MapTemplate.create({ name: 'Existing Name' });
      const templateToUpdate: HydratedDocument<IMapTemplate> = await MapTemplate.create({ name: 'Initial Name' });
      const updateData = { name: 'Existing Name' };

      const { req } = createMocks({ method: 'PATCH', body: updateData });
      const response = await PATCH(req, { params: { id: templateToUpdate.id } });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE', () => {
    it('должен успешно архивировать шаблон и создавать запись в логе аудита', async () => {
      const template: HydratedDocument<IMapTemplate> = await MapTemplate.create({ name: 'To Be Archived' });

      const { req } = createMocks({ method: 'DELETE' });
      const response = await DELETE(req, { params: { id: template.id } });

      expect(response.status).toBe(200);

      const dbTemplate = await MapTemplate.findById(template.id);
      expect(dbTemplate?.archivedAt).toBeInstanceOf(Date);

      const auditLog = await AuditLog.findOne({ entityId: template.id, action: 'archive' });
      expect(auditLog).not.toBeNull();
    });

    it('должен возвращать 409 при попытке архивировать уже архивированный шаблон', async () => {
      const template: HydratedDocument<IMapTemplate> = await MapTemplate.create({
        name: 'Already Archived',
        archivedAt: new Date(),
      });

      const { req } = createMocks({ method: 'DELETE' });
      const response = await DELETE(req, { params: { id: template.id } });

      expect(response.status).toBe(409);
    });
  });
}); 