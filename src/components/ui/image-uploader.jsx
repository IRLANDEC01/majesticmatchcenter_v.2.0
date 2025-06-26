'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';

export default function ImageUploader({ value, onChange, disabled = false }) {
  const [preview, setPreview] = useState(null);

  // Обновляем превью при изменении value (для редактирования существующих шаблонов)
  useEffect(() => {
    if (typeof value === 'string' && value.startsWith('http')) {
      setPreview(value);
    } else if (value instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(value);
    } else if (!value) {
      setPreview(null);
    }
  }, [value]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && onChange) {
      // Создаем preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Передаем файл в форму - он будет заменен на URL в onSubmit
      onChange(file);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
    disabled,
  });

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setPreview(null);
    if (onChange) {
      onChange(''); // Передаем пустую строку для сброса
    }
  };

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary' : 'border-border'}
        ${preview ? 'border-solid' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <>
          <img src={preview} alt="Превью" className="mx-auto max-h-48 rounded-md" />
          {!disabled && (
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 transition-transform hover:scale-110"
              aria-label="Удалить изображение"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <UploadCloud className="w-12 h-12 mb-4" />
          <p className="font-semibold">
            {disabled ? 'Загрузка отключена' : 'Перетащите файл сюда или нажмите для выбора'}
          </p>
          <p className="text-sm">PNG, JPG, GIF до 10MB</p>
        </div>
      )}
    </div>
  );
} 