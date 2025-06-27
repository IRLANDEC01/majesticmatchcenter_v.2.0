'use client';

import React from 'react';
import { Button } from './button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Переиспользуемый ErrorBoundary для обработки ошибок в Client Components.
 * 
 * ✅ Рекомендация из таблицы проверки: предотвращает белый экран при ошибках
 * в Server Actions или SWR.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary поймал ошибку:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

/**
 * Дефолтный компонент ошибки
 */
function DefaultErrorFallback({ 
  error, 
  retry 
}: { 
  error?: Error; 
  retry?: () => void; 
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Произошла ошибка</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error?.message || 'Что-то пошло не так. Попробуйте обновить страницу или повторить действие.'}
      </p>
      {retry && (
        <Button onClick={retry} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Попробовать снова
        </Button>
      )}
    </div>
  );
} 