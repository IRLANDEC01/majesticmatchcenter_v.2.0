// UI Компоненты
export * from './ui';

// Хуки
export * from './hooks';

// Провайдеры
export { SWRProvider } from './providers/swr-provider';

// Админские компоненты
export { DeleteConfirmationDialog } from './admin/delete-confirmation-dialog';
export { EntityStatusToggle } from './admin/entity-status-toggle';
export { EntityTableActions } from './admin/entity-table-actions';

// Layout компоненты (экспортируем напрямую для удобства)
export { default as GlobalHeader } from './ui/layout/global-header';
export { default as AdminSidebar } from './ui/layout/admin-sidebar'; 