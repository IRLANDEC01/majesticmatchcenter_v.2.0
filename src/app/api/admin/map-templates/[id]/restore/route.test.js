import { PATCH } from './route';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import MapTemplate from '@/models/map/MapTemplate';
import { dbClear } from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';

// Мокируем 'next/cache' для всех тестов в этом файле
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates/[id]/restore', () => {
  let testTemplate;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await dbClear();
    // Создаем шаблон и сразу его архивируем для теста восстановления
    testTemplate = await MapTemplate.create({
      name: 'Restorable Template',
      description: 'A test description',
      archivedAt: new Date(),
    });
    revalidatePath.mockClear();
  });

  it('должен успешно восстановить шаблон карты и вызывать revalidatePath', async () => {
    const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: testTemplate._id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBe(null);

    // Проверяем, что revalidatePath была вызвана
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

    // Нам не нужно использовать includeArchived, так как восстановленный документ не является архивированным
    const dbTemplate = await MapTemplate.findById(testTemplate._id);
    expect(dbTemplate.archivedAt).toBeNull();
  });

  it('должен возвращать 404, если шаблон для восстановления не найден', async () => {
    const nonExistentId = '605c72a6b579624e50a9d8e1';
    const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });
    // Важно: для этого теста нам нужно, чтобы findById нашел даже архивированный документ.
    // Но наш сервис должен обрабатывать это. В данном случае, сервис не найдет документ
    // с таким ID в принципе, поэтому проверка корректна.
    const response = await PATCH(request, { params: { id: nonExistentId } });

    expect(response.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
}); 
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import MapTemplate from '@/models/map/MapTemplate';
import { dbClear } from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';

// Мокируем 'next/cache' для всех тестов в этом файле
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates/[id]/restore', () => {
  let testTemplate;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await dbClear();
    // Создаем шаблон и сразу его архивируем для теста восстановления
    testTemplate = await MapTemplate.create({
      name: 'Restorable Template',
      description: 'A test description',
      archivedAt: new Date(),
    });
    revalidatePath.mockClear();
  });

  it('должен успешно восстановить шаблон карты и вызывать revalidatePath', async () => {
    const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: testTemplate._id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBe(null);

    // Проверяем, что revalidatePath была вызвана
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

    // Нам не нужно использовать includeArchived, так как восстановленный документ не является архивированным
    const dbTemplate = await MapTemplate.findById(testTemplate._id);
    expect(dbTemplate.archivedAt).toBeNull();
  });

  it('должен возвращать 404, если шаблон для восстановления не найден', async () => {
    const nonExistentId = '605c72a6b579624e50a9d8e1';
    const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });
    // Важно: для этого теста нам нужно, чтобы findById нашел даже архивированный документ.
    // Но наш сервис должен обрабатывать это. В данном случае, сервис не найдет документ
    // с таким ID в принципе, поэтому проверка корректна.
    const response = await PATCH(request, { params: { id: nonExistentId } });

    expect(response.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
}); 
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import MapTemplate from '@/models/map/MapTemplate';
import { dbClear } from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';

// Мокируем 'next/cache' для всех тестов в этом файле
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates/[id]/restore', () => {
  let testTemplate;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await dbClear();
    // Создаем шаблон и сразу его архивируем для теста восстановления
    testTemplate = await MapTemplate.create({
      name: 'Restorable Template',
      description: 'A test description',
      archivedAt: new Date(),
    });
    revalidatePath.mockClear();
  });

  it('должен успешно восстановить шаблон карты и вызывать revalidatePath', async () => {
    const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: testTemplate._id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBe(null);

    // Проверяем, что revalidatePath была вызвана
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

    // Нам не нужно использовать includeArchived, так как восстановленный документ не является архивированным
    const dbTemplate = await MapTemplate.findById(testTemplate._id);
    expect(dbTemplate.archivedAt).toBeNull();
  });

  it('должен возвращать 404, если шаблон для восстановления не найден', async () => {
    const nonExistentId = '605c72a6b579624e50a9d8e1';
    const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });
    // Важно: для этого теста нам нужно, чтобы findById нашел даже архивированный документ.
    // Но наш сервис должен обрабатывать это. В данном случае, сервис не найдет документ
    // с таким ID в принципе, поэтому проверка корректна.
    const response = await PATCH(request, { params: { id: nonExistentId } });

    expect(response.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
}); 