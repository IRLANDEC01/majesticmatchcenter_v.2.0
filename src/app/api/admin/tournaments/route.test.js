import { GET, POST } from './route';
import Tournament from '@/models/tournament/Tournament';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import { connectToDatabase, disconnectFromDatabase, clearDatabase } from '@/lib/db';
import mongoose from 'mongoose';

describe('API /api/admin/tournaments', () => {
  let template;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    const mapTemplate = await MapTemplate.create({ name: 'Test Map Template' });
    template = await TournamentTemplate.create({
      name: 'Test Template',
      slug: 'test-template',
      mapTemplates: [mapTemplate._id],
    });
    // Создаем турниры для GET тестов с уникальными слагами
    await Tournament.create({
      name: 'T1',
      slug: 't1',
      template: template._id,
      tournamentType: 'family',
      startDate: new Date(),
      participants: [{ participantType: 'family', family: new mongoose.Types.ObjectId() }]
    });
    await Tournament.create({
      name: 'T2',
      slug: 't2',
      template: template._id,
      tournamentType: 'family',
      startDate: new Date(),
      participants: [{ participantType: 'family', family: new mongoose.Types.ObjectId() }],
      archivedAt: new Date()
    });
  });

  describe('POST', () => {
    it('должен успешно создавать турниры с инкрементальным slug и возвращать 201', async () => {
      const familyId = new mongoose.Types.ObjectId();
      const requestData = {
        name: 'Новый тестовый турнир',
        template: template._id.toString(),
        tournamentType: 'family',
        startDate: new Date(),
        participants: [{
          participantType: 'family',
          family: familyId.toString()
        }],
      };

      // --- Первый вызов ---
      const request1 = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(201);
      const body1 = await response1.json();
      expect(body1.name).toBe(requestData.name);
      expect(body1.slug).toBe('test-template-1'); // Счетчик стал 1
      
      const dbItem1 = await Tournament.findById(body1._id);
      expect(dbItem1).not.toBeNull();
      expect(dbItem1.slug).toBe('test-template-1');
      
      // --- Второй вызов с теми же данными ---
      const request2 = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      
      const response2 = await POST(request2);
      expect(response2.status).toBe(201);
      const body2 = await response2.json();
      expect(body2.slug).toBe('test-template-2'); // Счетчик стал 2

      const dbItem2 = await Tournament.findById(body2._id);
      expect(dbItem2).not.toBeNull();
      expect(dbItem2.slug).toBe('test-template-2');
    });

    it('должен возвращать ошибку 400, если не указаны обязательные поля', async () => {
      const requestData = { name: 'Неполный турнир' }; // Нет template, type, startDate, participants
      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors).toHaveProperty('template');
      expect(body.errors).toHaveProperty('tournamentType');
      expect(body.errors).toHaveProperty('startDate');
      expect(body.errors).toHaveProperty('participants');
    });

    it('должен возвращать ошибку 400, если не указан ни один участник', async () => {
       const requestData = {
        name: 'Турнир без участников',
        template: template._id.toString(),
        tournamentType: 'family',
        startDate: new Date(),
        participants: [], // Пустой массив
      };

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors).toHaveProperty('participants');
      expect(body.errors.participants[0]).toBe('Нужен хотя бы один участник.');
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированные турниры по умолчанию', async () => {
      const request = new Request('http://localhost/api/admin/tournaments', { method: 'GET' });
      const response = await GET(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.length).toBe(1);
      expect(body[0].name).toBe('T1');
    });

    it('должен возвращать все турниры при `include_archived=true`', async () => {
      const request = new Request('http://localhost/api/admin/tournaments?include_archived=true', { method: 'GET' });
      const response = await GET(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.length).toBe(2);
    });
  });
});
