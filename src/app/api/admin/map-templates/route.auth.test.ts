import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequest } from 'node-mocks-http';
import { GET } from './route';
import { clearTestDB, createTestMapTemplate } from '@/lib/test-helpers';
import { connectToDatabase } from '@/lib/db';
import * as authorizeModule from '@/shared/lib/authorize';
import { NextResponse } from 'next/server';

// Модуль authorize будет отвечать за проверку, поэтому мокаем его,
// чтобы изолировать тест route handler'а от реальной логики авторизации,
// которую мы протестируем отдельно.
vi.mock('@/shared/lib/authorize');

const mockedAuthorize = vi.mocked(authorizeModule.authorize);

describe('GET /api/admin/map-templates - Auth Tests', () => {

  beforeEach(async () => {
    await connectToDatabase();
    await clearTestDB();
    await createTestMapTemplate({ name: 'Test Template' });
    mockedAuthorize.mockClear();
  });

  afterEach(async () => {
    await clearTestDB();
    vi.restoreAllMocks();
  });

  it('should return 401 Unauthorized when authorize returns an error', async () => {
    mockedAuthorize.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    
    const req = createRequest({
      method: 'GET',
      url: '/api/admin/map-templates',
    });

    const res = await GET(req);
    const body = await res.json();
    
    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 403 Forbidden when authorize returns a forbidden error', async () => {
    mockedAuthorize.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const req = createRequest({
      method: 'GET',
      url: '/api/admin/map-templates',
    });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('should return 200 OK when authorize succeeds', async () => {
    mockedAuthorize.mockResolvedValue({ adminId: 'test-admin-id', role: 'admin' });
    
    const req = createRequest({
      method: 'GET',
      url: '/api/admin/map-templates',
    });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
  });
}); 