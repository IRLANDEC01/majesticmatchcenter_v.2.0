'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import Image from 'next/image';
import { toast } from 'sonner';
import { UploadCloud, Edit3 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { IMAGE_UPLOAD_CONFIG } from '@/lib/constants';

// Конфигурация из центрального файла
const { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_MB } = IMAGE_UPLOAD_CONFIG;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPT: Accept = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

interface FileDropzoneProps {
  value: File | string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FileDropzone({ value, onChange, disabled, placeholder }: FileDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        toast.error('Ошибка валидации файла', {
          description: rejectedFiles[0].errors[0].message,
        });
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        onChange(file);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    disabled,
    noClick: !!preview, // Отключаем клик по всей области когда есть превью
  });

  const changeImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    open(); // Открываем диалог выбора файла
  };

  useEffect(() => {
    let objectUrl: string | null = null;
    if (value instanceof File) {
      objectUrl = URL.createObjectURL(value);
      setPreview(objectUrl);
    } else if (typeof value === 'string') {
      setPreview(value);
    } else {
      setPreview(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [value]);

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          'border-muted-foreground/30 hover:border-primary/50',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            'border-primary/60 bg-primary/5': isDragActive,
            'pointer-events-none opacity-50': disabled,
            'p-8 gap-4': !preview,
            'p-0': preview,
            'cursor-default': preview,
            'min-h-[250px]': preview, // Фиксированная минимальная высота вместо aspect-video
          }
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          // Изображение заполняет весь контейнер без обрезки
          <Image
            src={preview}
            alt="Предпросмотр изображения"
            fill
            className="rounded-lg object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="h-12 w-12" />
            <p className="font-semibold">{placeholder || 'Перетащите файл или кликните для выбора'}</p>
            <p className="text-xs">Максимальный размер: {MAX_FILE_SIZE_MB}MB</p>
            <p className="text-xs">Поддерживаемые форматы: JPG, PNG, WebP</p>
          </div>
        )}
      </div>

      {/* Единственная кнопка управления */}
      {preview && !disabled && (
        <div className="flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={changeImage}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Изменить изображение
          </Button>
        </div>
      )}
    </div>
  );
} 