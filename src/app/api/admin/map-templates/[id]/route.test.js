// 1. Импорты: обработчик, модели и хелперы
import { GET, PATCH } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import { revalidatePath } from 'next/cache';

// 2. Мокируем внешние зависимости.
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates/[id]', () => {
  // 3. Управляем подключением к БД
  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  // Очищаем БД и моки перед каждым тестом
  beforeEach(async () => {
    await dbClear();
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('должен возвращать один шаблон по ID', async () => {
      // Arrange: Создаем необходимые данные ПРЯМО В ТЕСТЕ.
      const template = await MapTemplate.create({
        name: 'Test Map GET',
        description: 'A map for testing GET',
      });

      const request = new Request(`http://localhost/api/admin/map-templates/${template._id}`);

      // Act: Вызываем обработчик
      const response = await GET(request, { params: { id: template._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe('Test Map GET');
    });

    it('должен возвращать 404, если шаблон не найден', async () => {
      // Arrange
      const nonExistentId = '605c72a6b579624e50a9d8e1';
      const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}`);

      // Act
      const response = await GET(request, { params: { id: nonExistentId } });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон и вызывать revalidatePath', async () => {
      // Arrange
      const template = await MapTemplate.create({
        name: 'Initial Name',
        description: 'Initial description',
      });
      const updateData = { name: 'Updated Name', description: 'Updated description' };
      const request = new Request(`http://localhost/api/admin/map-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PATCH(request, { params: { id: template._id.toString() } });
      const dbTemplate = await MapTemplate.findById(template._id);

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe(updateData.name);
      expect(dbTemplate.name).toBe(updateData.name);

      expect(revalidatePath).toHaveBeenCalledTimes(2);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/map-templates/${template._id.toString()}/edit`);
    });

    it('должен возвращать 409 (Conflict) при дублировании имени', async () => {
      // Arrange
      await MapTemplate.create({ name: 'Existing Name' });
      const templateToUpdate = await MapTemplate.create({ name: 'Old Name' });

      const updateData = { name: 'Existing Name' }; // Пытаемся установить существующее имя
      const request = new Request(`http://localhost/api/admin/map-templates/${templateToUpdate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      // Act
      const response = await PATCH(request, { params: { id: templateToUpdate._id.toString() } });

      // Assert
      expect(response.status).toBe(409); // Conflict
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});// 1. Импорты: обработчик, модели и хелперы
import { GET, PATCH } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import { revalidatePath } from 'next/cache';

// 2. Мокируем внешние зависимости.
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates/[id]', () => {
  // 3. Управляем подключением к БД
  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  // Очищаем БД и моки перед каждым тестом
  beforeEach(async () => {
    await dbClear();
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('должен возвращать один шаблон по ID', async () => {
      // Arrange: Создаем необходимые данные ПРЯМО В ТЕСТЕ.
      const template = await MapTemplate.create({
        name: 'Test Map GET',
        description: 'A map for testing GET',
      });

      const request = new Request(`http://localhost/api/admin/map-templates/${template._id}`);

      // Act: Вызываем обработчик
      const response = await GET(request, { params: { id: template._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe('Test Map GET');
    });

    it('должен возвращать 404, если шаблон не найден', async () => {
      // Arrange
      const nonExistentId = '605c72a6b579624e50a9d8e1';
      const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}`);

      // Act
      const response = await GET(request, { params: { id: nonExistentId } });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон и вызывать revalidatePath', async () => {
      // Arrange
      const template = await MapTemplate.create({
        name: 'Initial Name',
        description: 'Initial description',
      });
      const updateData = { name: 'Updated Name', description: 'Updated description' };
      const request = new Request(`http://localhost/api/admin/map-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PATCH(request, { params: { id: template._id.toString() } });
      const dbTemplate = await MapTemplate.findById(template._id);

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe(updateData.name);
      expect(dbTemplate.name).toBe(updateData.name);

      expect(revalidatePath).toHaveBeenCalledTimes(2);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/map-templates/${template._id.toString()}/edit`);
    });

    it('должен возвращать 409 (Conflict) при дублировании имени', async () => {
      // Arrange
      await MapTemplate.create({ name: 'Existing Name' });
      const templateToUpdate = await MapTemplate.create({ name: 'Old Name' });

      const updateData = { name: 'Existing Name' }; // Пытаемся установить существующее имя
      const request = new Request(`http://localhost/api/admin/map-templates/${templateToUpdate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      // Act
      const response = await PATCH(request, { params: { id: templateToUpdate._id.toString() } });

      // Assert
      expect(response.status).toBe(409); // Conflict
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});