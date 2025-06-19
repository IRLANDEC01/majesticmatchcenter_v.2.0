import { PUT } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import mongoose from 'mongoose';
import { TOURNAMENT_SCORING_TYPES } from '@/lib/constants.js';

const { TournamentTemplate } = models;

describe('PUT /api/admin/tournament-templates/[id]', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
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
    const templateToUpdate = testData.tournamentTemplate;
    // Создаем шаблон с именем, на которое будем пытаться переименовать
    const conflictingTemplate = await TournamentTemplate.create({ 
      name: 'Existing Name', 
      slug: 'existing-name',
      mapTemplates: [testData.mapTemplates[0]._id],
      scoringType: TOURNAMENT_SCORING_TYPES.LEADERBOARD,
    });

    const request = new Request(`http://localhost/api/admin/tournament-templates/${templateToUpdate._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: conflictingTemplate.name }),
    });

    // Act
    const response = await PUT(request, { params: { id: templateToUpdate._id.toString() } });
    
    // Assert
    expect(response.status).toBe(409);
  });
}); 