import { POST, GET } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import Family from '@/models/family/Family';
import Player from '@/models/player/Player';
import { revalidatePath } from 'next/cache';

// Мокируем внешние зависимости
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/families', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  describe('POST /api/admin/families', () => {
    it('должен успешно создавать семью и вызывать revalidatePath', async () => {
      // Arrange
      const owner = await Player.create({ firstName: 'Free', lastName: 'Agent' });
      const familyData = {
        name: 'The New Family',
        displayLastName: 'New',
        ownerId: owner._id.toString(),
      };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(body.name).toBe('The New Family');
      expect(body.owner).toBe(owner._id.toString());
      
      const dbFamily = await Family.findById(body._id);
      expect(dbFamily).not.toBeNull();
      const dbPlayer = await Player.findById(owner._id);
      expect(dbPlayer.familyId.toString()).toBe(body._id.toString());

      expect(revalidatePath).toHaveBeenCalledWith('/admin/families');
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });

    it('должен возвращать 409, если игрок-владелец уже состоит в семье', async () => {
      // Arrange
      const ownerForExisting = await Player.create({ firstName: 'Old', lastName: 'Owner' });
      const existingFamily = await Family.create({ name: 'Old Family', displayLastName: 'Old', owner: ownerForExisting._id });
      const playerInFamily = await Player.create({ firstName: 'Taken', lastName: 'Player', familyId: existingFamily._id });

      const familyData = { name: 'New Family', displayLastName: 'New', ownerId: playerInFamily._id.toString() };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(body.message).toContain('Игрок уже состоит в другой семье');
    });

    it('должен возвращать 409 при попытке создать дубликат имени', async () => {
      // Arrange
      const owner = await Player.create({ firstName: 'Owner', lastName: 'Player' });
      await Family.create({ name: 'Duplicate Name', displayLastName: 'Duplicate', owner: owner._id });

      const familyData = { name: 'Duplicate Name', displayLastName: 'New', ownerId: owner._id.toString() };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });
      
      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/admin/families', () => {
    it('должен по умолчанию возвращать только активные семьи и total', async () => {
      // Arrange
      const activeOwner = await Player.create({ firstName: 'Active', lastName: 'Owner' });
      const archivedOwner = await Player.create({ firstName: 'Archived', lastName: 'Owner' });
      await Family.create({ name: 'Active Family', displayLastName: 'Active', owner: activeOwner._id });
      await Family.create({ name: 'Archived Family', displayLastName: 'Archived', owner: archivedOwner._id, archivedAt: new Date() });

      // Act
      const request = new Request('http://localhost/api/admin/families');
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.total).toBe(1);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Active Family');
    });

    it('должен возвращать только архивные семьи при `status=archived`', async () => {
      // Arrange
      const activeOwner = await Player.create({ firstName: 'ActiveTwo', lastName: 'Owner' });
      const archivedOwner = await Player.create({ firstName: 'ArchivedTwo', lastName: 'Owner' });
      await Family.create({ name: 'Active Family', displayLastName: 'Active', owner: activeOwner._id });
      await Family.create({ name: 'Archived Family', displayLastName: 'Archived', owner: archivedOwner._id, archivedAt: new Date() });

      // Act
      const request = new Request('http://localhost/api/admin/families?status=archived');
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.total).toBe(1);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Archived Family');
    });

    it('должен возвращать пустой массив, если нет семей', async () => {
      const request = new Request('http://localhost/api/admin/families');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.total).toBe(0);
      expect(body.data.length).toBe(0);
    });
  });
});