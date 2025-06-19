import { PUT } from './route.js';
import models from '@/models/index.js';
import { dbClear, populateDb } from '@/lib/test-helpers.js';
import mongoose from 'mongoose';

const { TournamentTemplate, MapTemplate } = models;

describe('PUT /api/admin/tournament-templates/[id]', () => {
  let testData;

  // Глобальные хуки из jest.setup.js управляют соединением.
  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb({ numTournamentTemplates: 2 });
    testData = data;
  });

  it('должен обновлять шаблон и возвращать его со статусом 200', async () => {
    // Arrange
    const templateToUpdate = testData.tournamentTemplate;
    const updateData = { name: 'Updated Super Tournament Name' };
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${templateToUpdate._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    // Act
    const response = await PUT(request, { params: { id: templateToUpdate._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.name).toBe(updateData.name);
  });

  it('должен возвращать 404, если шаблон не найден', async () => {
    // Arrange
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const updateData = { name: 'Non-existent Tournament' };
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    // Act
    const response = await PUT(request, { params: { id: nonExistentId } });

    // Assert
    expect(response.status).toBe(404);
  });

  it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
    // Arrange
    // Создаем два уникальных шаблона прямо в тесте для изоляции
    await dbClear();
    const mapTemplate = await MapTemplate.create({ name: 'Test Map', slug: 'test-map' });

    const templateA = await TournamentTemplate.create({
      name: 'Existing Template Name',
      slug: 'existing-template-name',
      prizePool: [],
      mapTemplates: [mapTemplate._id],
    });
    const templateB = await TournamentTemplate.create({
      name: 'New Template Name',
      slug: 'new-template-name',
      prizePool: [],
      mapTemplates: [mapTemplate._id],
    });

    const updatedData = {
      name: templateA.name, // Пытаемся установить имя, которое уже занято
    };

    const request = new Request(`http://localhost/api/admin/tournament-templates/${templateB._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });

    // Act
    const response = await PUT(request, { params: { id: templateB._id.toString() } });

    // Assert
    expect(response.status).toBe(409);
  });
}); 