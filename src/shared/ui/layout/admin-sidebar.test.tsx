// Admin Sidebar Test

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { useSession } from 'next-auth/react';
import AdminSidebar from './admin-sidebar';

// Мок next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Мок Next.js Link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUseSession = vi.mocked(useSession);

describe('AdminSidebar - Критические проверки прав доступа', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('роль "moderator" → есть "Новости", нет "Аудит" и "Шаблоны карт"', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          role: 'moderator'
        }
      },
      status: 'authenticated'
    } as any);

    render(<AdminSidebar />);
    
    // Должно быть доступно для moderator
    expect(screen.getByText('Главная')).toBeInTheDocument();
    expect(screen.getByText('Новости')).toBeInTheDocument();
    
    // НЕ должно быть для moderator (нет manageEntities)
    expect(screen.queryByText('Турниры')).not.toBeInTheDocument();
    expect(screen.queryByText('Игроки')).not.toBeInTheDocument();
    expect(screen.queryByText('Семьи')).not.toBeInTheDocument();
    expect(screen.queryByText('Шаблоны турниров')).not.toBeInTheDocument();
    expect(screen.queryByText('Шаблоны карт')).not.toBeInTheDocument();
    
    // НЕ должно быть для moderator (нет viewAudit)
    expect(screen.queryByText('Аудит')).not.toBeInTheDocument();
  });

  it('роль "super" → присутствуют все пункты меню', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          role: 'super'
        }
      },
      status: 'authenticated'
    } as any);

    render(<AdminSidebar />);
    
    // Все пункты должны быть доступны для super
    expect(screen.getByText('Главная')).toBeInTheDocument();
    expect(screen.getByText('Турниры')).toBeInTheDocument();
    expect(screen.getByText('Игроки')).toBeInTheDocument();
    expect(screen.getByText('Семьи')).toBeInTheDocument();
    expect(screen.getByText('Шаблоны турниров')).toBeInTheDocument();
    expect(screen.getByText('Шаблоны карт')).toBeInTheDocument();
    expect(screen.getByText('Новости')).toBeInTheDocument();
    expect(screen.getByText('Аудит')).toBeInTheDocument();
  });

  it('роль "admin" → есть управление сущностями и новости, нет аудита', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<AdminSidebar />);
    
    // Должно быть для admin (manageEntities + manageNews)
    expect(screen.getByText('Главная')).toBeInTheDocument();
    expect(screen.getByText('Турниры')).toBeInTheDocument();
    expect(screen.getByText('Игроки')).toBeInTheDocument();
    expect(screen.getByText('Семьи')).toBeInTheDocument();
    expect(screen.getByText('Шаблоны турниров')).toBeInTheDocument();
    expect(screen.getByText('Шаблоны карт')).toBeInTheDocument();
    expect(screen.getByText('Новости')).toBeInTheDocument();
    
    // НЕ должно быть для admin (нет viewAudit)
    expect(screen.queryByText('Аудит')).not.toBeInTheDocument();
  });
});
