import { NextResponse } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST, GET } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import models from '@/models';

const { Family, FamilyStats, Player } = models;

describe('API /api/admin/families', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(dbClear);

  describe('POST /api/admin/families', () => {
    let unassignedPlayer;

    beforeEach(async () => {
      unassignedPlayer = await Player.create({
        firstName: 'Free',
        lastName: 'Agent',
        email: 'free.agent@example.com',
        authId: 'auth|freeagent',
      });
    });

    it('должен успешно создавать семью и возвращать 201', async () => {
      const familyData = {
        name: 'The New Family',
        displayLastName: 'New',
        ownerId: unassignedPlayer._id.toString(),
        description: 'A test description',
      };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe('The New Family');
      expect(body.owner).toBe(unassignedPlayer._id.toString());
      const dbFamily = await Family.findById(body._id);
      expect(dbFamily).not.toBeNull();
    });

    it('должен возвращать 400, если данные невалидны (нет `name`)', async () => {
      const familyData = {
        displayLastName: 'NoName',
        ownerId: unassignedPlayer._id.toString(),
      };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.name).toBeDefined();
    });

    it('должен возвращать 400, если игрок уже состоит в семье', async () => {
      // Сначала создадим семью и назначим игрока ее членом
      const existingFamily = await Family.create({
        name: 'Existing Family',
        displayLastName: 'Existing',
        owner: unassignedPlayer._id,
      });
      unassignedPlayer.currentFamily = existingFamily._id;
      await unassignedPlayer.save();

      const familyData = {
        name: 'Another New Family',
        displayLastName: 'Another',
        ownerId: unassignedPlayer._id.toString(),
      };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.message).toContain('Игрок уже состоит в другой семье');
    });

    it('должен возвращать 409 при попытке создать дубликат имени', async () => {
      await Family.create({
        name: 'Duplicate Name',
        displayLastName: 'Original',
        owner: unassignedPlayer._id,
      });

      const familyData = {
        name: 'Duplicate Name',
        displayLastName: 'Duplicate',
        ownerId: unassignedPlayer._id.toString(),
      };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.message).toContain('Семья с таким названием уже существует');
    });
  });

  describe('GET /api/admin/families', () => {
    let owner;

    beforeEach(async () => {
      owner = await Player.create({
        firstName: 'Owner',
        lastName: 'Get',
        email: 'owner.get@example.com',
        authId: 'auth|ownerget',
      });
      await Family.create([
        { name: 'Family One', displayLastName: 'One', owner: owner._id },
        { name: 'Family Two', displayLastName: 'Two', owner: owner._id, archivedAt: new Date() },
      ]);
    });

    it('должен возвращать только неархивированные семьи по умолчанию', async () => {
      const request = new Request('http://localhost/api/admin/families');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe('Family One');
    });

    it('должен возвращать все семьи, если `include_archived=true`', async () => {
      const request = new Request('http://localhost/api/admin/families?include_archived=true');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 