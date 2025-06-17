import { PUT } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';

describe('PUT /api/admin/map-templates/[id]', () => {
  beforeAll(async () => {
    await MapTemplate.init();
  });

  it('должен обновлять шаблон и возвращать его со статусом 200', async () => {
    const testTemplate = await MapTemplate.create({ name: 'Test Map To Update' });
    const templateId = testTemplate._id.toString();
    const updateData = { name: 'Updated Awesome Map' };
    
    const request = new Request(`http://localhost/api/admin/map-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const response = await PUT(request, { params: { id: templateId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe(updateData.name);

    const dbTemplate = await MapTemplate.findById(templateId);
    expect(dbTemplate).not.toBeNull();
    if (dbTemplate) {
      expect(dbTemplate.name).toBe(updateData.name);
    }
  });

  it('должен возвращать 404, если шаблон не найден', async () => {
    const templateId = new mongoose.Types.ObjectId().toString();
    const updateData = { name: 'Non-existent Map' };
    
    const request = new Request(`http://localhost/api/admin/map-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const response = await PUT(request, { params: { id: templateId } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe('Шаблон карты не найден');
  });

  it('должен возвращать 400 при невалидном ID', async () => {
    const invalidId = 'invalid-id';
    const request = new Request(`http://localhost/api/admin/map-templates/${invalidId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });

    const response = await PUT(request, { params: { id: invalidId } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Некорректный ID шаблона');
  });

  it('должен возвращать 400 при невалидных данных (пустое имя)', async () => {
    const testTemplate = await MapTemplate.create({ name: 'Test Map For Validation' });
    const templateId = testTemplate._id.toString();
    const invalidData = { name: '' }; 

    const request = new Request(`http://localhost/api/admin/map-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });

    const response = await PUT(request, { params: { id: templateId } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors.name).toBeDefined();
  });

  it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
    await MapTemplate.create({ name: 'Existing Name' });
    const templateToUpdate = await MapTemplate.create({ name: 'Old Name' });
    const templateId = templateToUpdate._id.toString();

    const request = new Request(`http://localhost/api/admin/map-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Existing Name' }),
    });

    const response = await PUT(request, { params: { id: templateId } });
    expect(response.status).toBe(409);
  });
}); 