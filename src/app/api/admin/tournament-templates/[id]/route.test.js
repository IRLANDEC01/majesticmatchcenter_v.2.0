import { PUT } from './route';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('PUT /api/admin/tournament-templates/[id]', () => {
  let testTemplate;
  let mapTemplate;

  beforeAll(async () => {
    await connectToDatabase();
    await TournamentTemplate.init();
    await MapTemplate.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await TournamentTemplate.deleteMany({});
    await MapTemplate.deleteMany({});
    mapTemplate = await MapTemplate.create({ name: 'Test Map for Updates' });
    testTemplate = await TournamentTemplate.create({ 
      name: 'Test Template',
      mapTemplates: [mapTemplate._id] 
    });
  });

  it('должен обновлять шаблон и возвращать его со статусом 200', async () => {
    const templateId = testTemplate._id.toString();
    const updateData = { name: 'Updated Super Tournament' };
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const response = await PUT(request, { params: { id: templateId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe(updateData.name);

    const dbTemplate = await TournamentTemplate.findById(templateId);
    expect(dbTemplate).not.toBeNull();
    if (dbTemplate) {
      expect(dbTemplate.name).toBe(updateData.name);
    }
  });

  it('должен возвращать 404, если шаблон не найден', async () => {
    const templateId = new mongoose.Types.ObjectId().toString();
    const updateData = { name: 'Non-existent Tournament' };
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const response = await PUT(request, { params: { id: templateId } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe('Шаблон турнира не найден');
  });

  it('должен возвращать 400 при невалидном ID', async () => {
    const invalidId = 'invalid-id';
    const request = new Request(`http://localhost/api/admin/tournament-templates/${invalidId}`, {
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
    const templateId = testTemplate._id.toString();
    const invalidData = { name: '' };

    const request = new Request(`http://localhost/api/admin/tournament-templates/${templateId}`, {
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
    await TournamentTemplate.create({ name: 'Existing Name', mapTemplates: [mapTemplate._id] });
    const templateId = testTemplate._id.toString();

    const request = new Request(`http://localhost/api/admin/tournament-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Existing Name' }),
    });

    const response = await PUT(request, { params: { id: templateId } });
    expect(response.status).toBe(409);
  });
}); 