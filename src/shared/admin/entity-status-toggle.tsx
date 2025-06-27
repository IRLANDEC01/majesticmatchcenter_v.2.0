'use client';

import React from 'react';
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { Archive, CheckCircle } from "lucide-react";

export type EntityStatus = 'active' | 'archived';

interface EntityStatusToggleProps {
  value: EntityStatus;
  onValueChange: (value: EntityStatus) => void;
  className?: string;
}

/**
 * Переключатель статуса сущности (активные/архивные).
 * Переиспользуемый компонент для всех админ страниц.
 */
export function EntityStatusToggle({
  value,
  onValueChange,
  className
}: EntityStatusToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) onValueChange(newValue as EntityStatus);
      }}
      className={className}
    >
      <ToggleGroupItem value="active" variant="outline" size="sm">
        <CheckCircle className="h-4 w-4 mr-2" />
        Активные
      </ToggleGroupItem>
      <ToggleGroupItem value="archived" variant="outline" size="sm">
        <Archive className="h-4 w-4 mr-2" />
        Архивные
      </ToggleGroupItem>
    </ToggleGroup>
  );
} 