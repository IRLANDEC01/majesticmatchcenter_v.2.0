import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminAuthGuard } from '@/shared/ui/admin-auth-guard';
import React from 'react';
import * as nextAuthReact from 'next-auth/react';

// Мокаем next-auth/react целиком
vi.mock('next-auth/react');

// Создаем "шпиона" для функции useSession
const mockedUseSession = vi.spyOn(nextAuthReact, 'useSession');

describe('AdminAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен показывать скелетон, когда статус сессии "loading"', () => {
    mockedUseSession.mockReturnValue({ status: 'loading', data: null, update: vi.fn() });

    render(
      <AdminAuthGuard>
        <div>Child Content</div>
      </AdminAuthGuard>
    );

    // Проверяем, что скелетон виден
    expect(screen.getByTestId('admin-auth-guard-skeleton')).toBeInTheDocument();
    // Проверяем, что дочерний контент НЕ виден
    expect(screen.queryByText('Child Content')).not.toBeInTheDocument();
  });

  it('должен показывать дочерний контент, когда статус сессии "authenticated"', () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: {
        expires: new Date(Date.now() + 2 * 86400 * 1000).toISOString(),
        user: {
          id: 'admin-id',
          email: 'admin@test.com',
          role: 'admin',
          isAdmin: true
        }
      },
      update: vi.fn(),
    });

    render(
      <AdminAuthGuard>
        <div>Child Content</div>
      </AdminAuthGuard>
    );

    // Проверяем, что дочерний контент виден
    expect(screen.getByText('Child Content')).toBeInTheDocument();
    // Проверяем, что скелетон НЕ виден
    expect(screen.queryByTestId('admin-auth-guard-skeleton')).not.toBeInTheDocument();
  });

  it('должен показывать дочерний контент, когда статус сессии "unauthenticated"', () => {
    // Middleware должен был бы сделать редирект, но guard просто рендерит children
    mockedUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: vi.fn(),
    });

    render(
      <AdminAuthGuard>
        <div>Child Content</div>
      </AdminAuthGuard>
    );

    // Проверяем, что дочерний контент виден (guard не отвечает за редирект)
    expect(screen.getByText('Child Content')).toBeInTheDocument();
    // Проверяем, что скелетон НЕ виден
    expect(screen.queryByTestId('admin-auth-guard-skeleton')).not.toBeInTheDocument();
  });
}); 