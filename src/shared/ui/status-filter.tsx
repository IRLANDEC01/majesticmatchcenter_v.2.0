'use client';

import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';
import type { EntityStatus, EntityStatusOptional } from '@/shared/types/admin';

interface StatusFilterOption {
  value: EntityStatus;
  label: string;
}

interface StatusFilterProps {
  /** Текущее выбранное значение (может быть undefined - ни один тоггл не активен) */
  value: EntityStatusOptional;
  /** Коллбек при изменении значения */
  onChange: (value: EntityStatus) => void;
  /** Может ли пользователь просматривать архивные сущности */
  canViewArchived: boolean;
  /** Дополнительные CSS классы */
  className?: string;
  /** Размер компонента */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Компонент для фильтрации сущностей по статусу (активные/архивные/все).
 * Поддерживает пустое состояние когда ни один тоггл не активен.
 * Автоматически ограничивает доступные опции на основе прав пользователя.
 */
export function StatusFilter({
  value,
  onChange,
  canViewArchived,
  className = '',
  size = 'sm',
}: StatusFilterProps) {
  // Определяем доступные опции на основе прав доступа
  const allOptions: StatusFilterOption[] = [
    { value: 'active', label: 'Активные' },
    { value: 'archived', label: 'Архивные' },
    { value: 'all', label: 'Все' },
  ];

  const availableOptions = canViewArchived 
    ? allOptions 
    : allOptions.filter(option => option.value === 'active');

  // Обработчик изменения с проверкой доступности
  const handleChange = (newValue: string) => {
    if (!newValue) return; // ToggleGroup может передать пустую строку при deselect
    
    const selectedValue = newValue as EntityStatus;
    
    // Проверяем, доступна ли выбранная опция
    const isAvailable = availableOptions.some(option => option.value === selectedValue);
    if (!isAvailable) {
      console.warn(`Status '${selectedValue}' is not available for current user. Falling back to 'active'.`);
      onChange('active');
      return;
    }
    
    onChange(selectedValue);
  };

  // Если у пользователя нет доступа к архиву и только одна опция, показываем индикатор
  if (!canViewArchived && availableOptions.length === 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`} data-testid="status-indicator">
        <span className="text-sm text-muted-foreground">Режим:</span>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-muted text-sm">
          <span>Активные</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="status-filter">
      <span className="text-sm text-muted-foreground">Показать все:</span>
      <ToggleGroup
        type="single"
        value={value || ''} // ✅ Поддержка пустого состояния
        onValueChange={handleChange}
        size={size}
        data-testid="status-toggle-group"
      >
        {availableOptions.map((option) => (
          <ToggleGroupItem 
            key={option.value} 
            value={option.value} 
            variant="outline"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
} 