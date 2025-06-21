'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Универсальный компонент для отображения данных в таблице админ-панели.
 * Принимает конфигурацию колонок и массив данных для отображения.
 * @param {object[]} columns - Массив объектов для конфигурации колонок.
 *   @param {string} columns[].key - Уникальный ключ колонки (часто совпадает с ключом в объекте данных).
 *   @param {string} columns[].header - Текст заголовка колонки.
 *   @param {string} [columns[].width] - Класс ширины для колонки (например, 'w-1/2').
 *   @param {string} [columns[].className] - Дополнительные классы для ячеек и заголовка.
 *   @param {function} [columns[].cell] - Функция для рендеринга кастомного содержимого ячейки. Принимает весь объект строки `item`.
 * @param {object[]} data - Массив объектов с данными для отображения.
 * @param {string} [tableClassName] - Дополнительные классы для самого тега <table>.
 */
export function AdminDataTable({ columns, data, tableClassName }) {
  if (!data || data.length === 0) {
    // В будущем здесь может быть более красивый EmptyState,
    // но пока компонент не должен отвечать за это состояние.
    return null;
  }

  return (
    <div className="rounded-md border">
      <Table className={cn('w-full table-fixed', tableClassName)}>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={cn(col.width, col.className)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item._id || item.id}>
              {columns.map((col) => (
                <TableCell key={col.key} className={cn(col.className)}>
                  {col.cell ? col.cell(item) : item[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 