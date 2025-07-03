// Global Header Test

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { useSession } from 'next-auth/react';
import GlobalHeader from './global-header';

// Мок next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Мок Next.js Link  
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUseSession = vi.mocked(useSession);

describe('GlobalHeader - Критические UX контракты', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('нет сессии → кнопка "Войти", отсутствуют "Выйти" и "Админ-панель"', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    } as any);

    render(<GlobalHeader />);
    
    expect(screen.getByText('Войти')).toBeInTheDocument();
    expect(screen.queryByText('Выйти')).not.toBeInTheDocument();
    expect(screen.queryByText('Админ-панель')).not.toBeInTheDocument();
  });

  it('роль "admin" → есть "Админ-панель" и "Выйти", нет "Войти"', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<GlobalHeader />);
    
    expect(screen.getByText('Админ-панель')).toBeInTheDocument();
    expect(screen.getByText('Выйти')).toBeInTheDocument();
    expect(screen.queryByText('Войти')).not.toBeInTheDocument();
  });
});
