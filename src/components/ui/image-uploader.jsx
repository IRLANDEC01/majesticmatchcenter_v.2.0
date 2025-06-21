'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';

export default function ImageUploader({ onFileSelect, initialImage = null }) {
  const [preview, setPreview] = useState(initialImage);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        if (onFileSelect) {
          onFileSelect(file); // Возвращаем сам файл для будущей загрузки в S3
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
  });

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setPreview(null);
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary' : 'border-border'}
        ${preview ? 'border-solid' : ''}`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <>
          <img src={preview} alt="Превью" className="mx-auto max-h-48 rounded-md" />
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 transition-transform hover:scale-110"
            aria-label="Удалить изображение"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <UploadCloud className="w-12 h-12 mb-4" />
          <p className="font-semibold">Перетащите файл сюда или нажмите для выбора</p>
          <p className="text-sm">PNG, JPG, GIF до 10MB</p>
        </div>
      )}
    </div>
  );
} 