'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Переиспользуемая кнопка для отправки форм с состоянием загрузки.
 * Отображает спиннер и блокируется, когда isSubmitting === true.
 * @param {object} props - Свойства компонента.
 * @param {string} [props.children='Сохранить'] - Текст кнопки в обычном состоянии.
 * @param {string} [props.submittingText='Сохранение...'] - Текст кнопки в состоянии загрузки.
 * @param {boolean} props.isSubmitting - Флаг, указывающий на процесс отправки.
 * @param {string} props.className - Дополнительные классы для стилизации.
 * @param {React.ElementType} [props.asChild=false] - Рендерить как дочерний элемент.
 */
const SubmitButton = forwardRef(
  (
    {
      children = 'Сохранить',
      submittingText = 'Сохранение...',
      isSubmitting,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Button ref={ref} disabled={isSubmitting} className={cn(className)} {...props}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {submittingText}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

SubmitButton.displayName = 'SubmitButton';

export { SubmitButton }; 