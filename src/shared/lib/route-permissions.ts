import type { Permission } from './permissions';

// Матрица «префикс маршрута → требуемое разрешение»
// Расширяйте по мере добавления новых вертикалей.
export const ROUTE_PERMISSION_PREFIXES: Array<[string, Permission]> = [
  ['/admin/map-templates', 'manageEntities'],
  ['/api/admin/map-templates', 'manageEntities'],
]; 