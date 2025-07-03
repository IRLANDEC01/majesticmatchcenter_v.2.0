'use client';

import React from 'react';
import { Button } from './button';
import { LogOut, ShieldAlert } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { isAuthError } from '@/shared/lib/is-auth-error';
import { DefaultErrorFallback } from './error-boundary';

/**
 * Fallback-компонент, который будет показан при ошибке авторизации.
 */
function AuthErrorFallback({ retry }: { retry?: () => void }) {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
    retry?.();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
      <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
      <h1 className="text-3xl font-bold mb-2">Проблема с доступом</h1>
      <p className="text-muted-foreground mb-8 max-w-lg">
        Ваша сессия могла закончиться или возникла проблема с правами доступа.
        Пожалуйста, попробуйте войти в систему снова.
      </p>
      <Button 
        onClick={handleSignOut} 
        size="lg"
      >
        <LogOut className="mr-2 h-5 w-5" />
        Выйти и войти снова
      </Button>
    </div>
  );
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Специализированный ErrorBoundary для отлова ошибок, связанных с авторизацией.
 * Использует классификатор ошибок для выбора между Auth и Default fallback.
 */
export class AuthErrorBoundary extends React.Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AuthErrorBoundary поймал ошибку:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError) {
      if (isAuthError(this.state.error)) {
        return <AuthErrorFallback retry={this.handleRetry} />;
      }
      return <DefaultErrorFallback error={this.state.error || undefined} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
} 