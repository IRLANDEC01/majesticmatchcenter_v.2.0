'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SubmitButton } from '@/components/ui/submit-button';

export function DeleteConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
  entityName,
  entityType,
}) {
  const handleConfirm = (event) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы действительно хотите архивировать {entityType}{' '}
            <span className="font-bold">&quot;{entityName}&quot;</span>? Это
            действие нельзя будет отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Отмена</AlertDialogCancel>
          <form onSubmit={handleConfirm}>
            <SubmitButton
              variant="destructive"
              isSubmitting={isPending}
              disabled={isPending}
              type="submit"
            >
              {isPending ? 'Архивация...' : 'Да, архивировать'}
            </SubmitButton>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 