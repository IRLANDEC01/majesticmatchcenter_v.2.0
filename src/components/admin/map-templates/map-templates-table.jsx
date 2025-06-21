'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Search, Trash2, Frown } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/admin/delete-confirmation-dialog';
import { AdminDataTable } from '@/components/admin/admin-data-table';

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function MapTemplatesTable({
  data = [],
  onEdit,
  onArchive,
  searchQuery,
}) {
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveClick = (template) => {
    setTemplateToDelete(template);
  };

  const handleConfirmArchive = async () => {
    if (!templateToDelete) return;

    setIsArchiving(true);
    try {
      await onArchive(templateToDelete);
      setTemplateToDelete(null);
    } catch (error) {
      // Ошибки уже обрабатываются глобально и выводятся в toast,
      // поэтому здесь дополнительных действий не требуется.
    } finally {
      setIsArchiving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Название',
      width: 'w-1/2',
    },
    {
      key: 'createdAt',
      header: 'Дата создания',
      width: 'w-1/4',
      className: 'text-center',
      cell: (item) => new Date(item.createdAt).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    },
    {
      key: 'actions',
      header: 'Действия',
      width: 'w-1/4',
      className: 'text-right',
      cell: (item) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
            aria-label="Редактировать"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleArchiveClick(item)}
            className="text-red-600 hover:text-red-700"
            aria-label="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (!searchQuery || searchQuery.length < 2) {
    return (
      <EmptyState
        icon={Search}
        title="Начните поиск шаблонов"
        description="Введите название в строке поиска, чтобы найти нужный шаблон карты."
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Frown}
        title="Ничего не найдено"
        description="Мы не смогли найти шаблоны по вашему запросу."
      />
    );
  }

  return (
    <>
      <AdminDataTable columns={columns} data={data} />
      <DeleteConfirmationDialog
        isOpen={!!templateToDelete}
        onOpenChange={(isOpen) => !isOpen && setTemplateToDelete(null)}
        onConfirm={handleConfirmArchive}
        isPending={isArchiving}
        entityName={templateToDelete?.name}
        entityType="шаблон карты"
      />
    </>
  );
}