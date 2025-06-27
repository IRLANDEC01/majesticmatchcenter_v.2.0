import * as React from 'react';
import { Button, type ButtonProps } from './button';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends ButtonProps {
  isSubmitting?: boolean;
  children: React.ReactNode;
}

/**
 * Кнопка отправки формы с состоянием загрузки
 */
export function SubmitButton({
  isSubmitting = false,
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || isSubmitting}
      {...props}
    >
      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
} 