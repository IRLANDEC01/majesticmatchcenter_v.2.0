import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from './authorize';

// Мокаем auth
vi.mock('@/../auth', () => ({
  auth: vi.fn(),
}));

const { auth } = vi.mocked(await import('@/../auth'));

describe('authorize() - система с массивом прав', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 401 когда нет сессии', async () => {
    auth.mockResolvedValue(null as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    const result = await authorize(request, 'manageEntities');
    
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('возвращает 403 когда пользователь не администратор', async () => {
    auth.mockResolvedValue({
      user: { role: 'admin', adminId: 'admin123', isAdmin: false }
    } as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    const result = await authorize(request, 'manageEntities');
    
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('возвращает 403 когда нет роли', async () => {
    auth.mockResolvedValue({
      user: { adminId: 'admin123', isAdmin: true }
    } as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    const result = await authorize(request, 'manageEntities');
    
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('возвращает 403 когда нет права (одно право)', async () => {
    auth.mockResolvedValue({
      user: { role: 'moderator', adminId: 'admin123', isAdmin: true }
    } as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    const result = await authorize(request, 'unarchive');
    
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('возвращает 403 когда нет всех прав (массив)', async () => {
    auth.mockResolvedValue({
      user: { role: 'moderator', adminId: 'admin123', isAdmin: true }
    } as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    // moderator имеет только manageNews, но не viewArchived и unarchive
    const result = await authorize(request, ['viewArchived', 'unarchive']);
    
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('проходит с правильной ролью (одно право)', async () => {
    auth.mockResolvedValue({
      user: { role: 'admin', adminId: 'admin123', isAdmin: true }
    } as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    const result = await authorize(request, 'manageEntities');
    
    expect(result).toEqual({
      adminId: 'admin123',
      role: 'admin'
    });
  });

  it('проходит с super ролью (массив прав)', async () => {
    auth.mockResolvedValue({
      user: { role: 'super', adminId: 'super123', isAdmin: true }
    } as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    const result = await authorize(request, ['viewArchived', 'unarchive']);
    
    expect(result).toEqual({
      adminId: 'super123',
      role: 'super'
    });
  });

  it('проходит проверку manageNews для moderator', async () => {
    auth.mockResolvedValue({
      user: { role: 'moderator', adminId: 'mod123', isAdmin: true }
    } as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    const result = await authorize(request, 'manageNews');
    
    expect(result).toEqual({
      adminId: 'mod123',
      role: 'moderator'
    });
  });

  it('отклоняет moderator для manageEntities', async () => {
    auth.mockResolvedValue({
      user: { role: 'moderator', adminId: 'mod123', isAdmin: true }
    } as any);
    
    const request = new NextRequest('http://localhost/api/admin/test');
    const result = await authorize(request, 'manageEntities');
    
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });
}); 