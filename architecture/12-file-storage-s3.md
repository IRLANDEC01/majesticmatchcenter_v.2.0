# S3 File Storage Architecture

> **Статус:** ✅ Полностью реализовано  
> **Обновлено:** Январь 2025  
> **Reference Implementation:** Map Templates

## 📋 Обзор

Система файлового хранения построена на S3-совместимом API (Рег.ру) и обеспечивает:
- **Автоматическое создание вариантов** изображений (icon, medium, original)
- **Публичный доступ** к файлам через CDN
- **Атомарные операции** с rollback при ошибках
- **Унифицированную схему** для всех сущностей
- **Интеграцию с формами** через react-dropzone

## 🏗️ Архитектура компонентов

### 1. S3 Client Configuration
```typescript
// src/lib/s3/client.ts
export const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,           // https://s3.regru.cloud
  region: env.S3_REGION,              // ru-1
  forcePathStyle: env.S3_FORCE_PATH_STYLE, // true для Рег.ру
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3,
  requestHandler: {
    requestTimeout: 30000,
  },
});
```

### 2. Image Processing Pipeline
```typescript
// src/lib/image-processing/variants.ts
export async function makeVariants(
  inputBuffer: Buffer,
  specs: VariantSpec[]
): Promise<ImageVariant[]> {
  return Promise.all(
    specs.map(async (spec) => {
      const processed = await sharp(inputBuffer)
        .resize(spec.width, spec.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: spec.quality })
        .toBuffer();
        
      return {
        name: spec.name,
        buffer: processed,
        width: spec.width,
        height: spec.height,
        size: processed.length,
      };
    })
  );
}
```

### 3. Upload Service
```typescript
// src/lib/s3/upload.ts
export async function uploadImageVariants(
  file: File,
  entityType: string,
  entityId?: string
): Promise<UploadResult> {
  // 1. Валидация файла
  const inputBuffer = await validateAndPrepareImage(file, MAX_SIZE);
  
  // 2. Создание вариантов
  const specs = getVariantSpecs(entityType);
  const variants = await makeVariants(inputBuffer, specs);
  
  // 3. Генерация UUID для группировки
  const baseUuid = entityId || crypto.randomUUID();
  
  // 4. Параллельная загрузка с rollback
  const uploadedKeys: string[] = [];
  
  try {
    await Promise.all(
      variants.map(async (variant) => {
        const key = generateS3Key(entityType, variant.name, baseUuid);
        
        await s3Client.send(new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: variant.buffer,
          ContentType: 'image/webp',
          ACL: 'public-read', // КРИТИЧНО для публичного доступа
          Metadata: {
            variant: variant.name,
            entityType,
            originalName: file.name,
            width: variant.width.toString(),
            height: variant.height.toString(),
          },
        }));
        
        uploadedKeys.push(key);
      })
    );
    
    // 5. Формирование результата
    return {
      keys: Object.fromEntries(variants.map((v, i) => [v.name, uploadedKeys[i]])),
      urls: Object.fromEntries(variants.map((v, i) => [v.name, getS3PublicUrl(uploadedKeys[i])])),
      metadata: { originalSize: file.size, variants }
    };
    
  } catch (error) {
    // Rollback: удаление всех загруженных файлов
    await Promise.allSettled(
      uploadedKeys.map(key =>
        s3Client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
      )
    );
    throw error;
  }
}
```

## 📊 Схема данных

### ImageSet Schema
```typescript
// src/models/shared/image-set-schema.ts
export interface IImageSet {
  /** URL иконки 64x64px для списков и миниатюр */
  icon: string;
  /** URL изображения среднего размера (ширина 640px) для карточек */
  medium: string;
  /** URL изображения оригинального размера (ширина 1920px) для детального просмотра */
  original: string;
}

export interface IImageKeys {
  /** S3-ключ иконки для удаления */
  icon: string;
  /** S3-ключ среднего изображения для удаления */
  medium: string;
  /** S3-ключ оригинального изображения для удаления */
  original: string;
}
```

### Использование в моделях
```typescript
// src/models/map/MapTemplate.ts
const mapTemplateSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  
  // S3 интеграция
  imageUrls: { 
    type: imageSetSchema, 
    required: false,
    comment: 'Публичные URL для отображения в UI' 
  },
  imageKeys: { 
    type: imageKeysSchema, 
    required: false,
    comment: 'S3-ключи для управления файлами' 
  },
  
  // Архивация
  archivedAt: { type: Date, default: null },
}, {
  timestamps: true,
  collection: 'mapTemplates',
});
```

## 🎨 Frontend интеграция

### FileDropzone Component
```typescript
// src/shared/ui/file-dropzone.tsx
export function FileDropzone({ 
  value, 
  onChange, 
  onRemove,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
  maxSize = 5 * 1024 * 1024, // 5MB
}) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) onChange?.(file);
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        
        {value ? (
          <div className="space-y-4">
            <div className="relative w-full max-w-[280px] h-[200px] mx-auto">
              <Image
                src={URL.createObjectURL(value)}
                alt="Preview"
                fill
                className="object-contain rounded"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
            >
              Изменить изображение
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isDragActive ? 'Отпустите файл здесь' : 'Перетащите изображение или нажмите для выбора'}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, JPEG или WEBP до 5MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### React Hook Form Integration
```typescript
// Использование в формах
export function MapTemplateDialog({ template, onSuccess }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(mapTemplateFormSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      image: null,
    },
  });

  const imageValue = watch('image');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Название *</Label>
          <Input
            id="name"
            {...register('name')}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label>Изображение</Label>
          <FileDropzone
            value={imageValue}
            onChange={(file) => setValue('image', file)}
            onRemove={() => setValue('image', null)}
          />
          {errors.image && (
            <p className="text-sm text-destructive mt-1">{errors.image.message}</p>
          )}
        </div>
      </div>
    </form>
  );
}
```

## 🔧 Server Actions Integration

### Form Processing
```typescript
// src/features/map-templates-management/api/actions.server.ts
export async function createMapTemplateAction(
  prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await connectToDatabase();

    // 1. Валидация данных
    const validatedData = mapTemplateCreateSchema.parse({
      name: formData.get('name'),
      description: formData.get('description'),
      image: formData.get('image'),
    });

    let imageUrls: IImageSet | undefined;
    let imageKeys: IImageKeys | undefined;

    // 2. Обработка изображения
    if (validatedData.image) {
      const uploadResult = await uploadImageVariants(
        validatedData.image,
        'map-template'
      );
      
      imageUrls = uploadResult.urls as IImageSet;
      imageKeys = uploadResult.keys as IImageKeys;
    }

    // 3. Создание в БД
    const template = await mapTemplateService.createMapTemplate({
      name: validatedData.name,
      description: validatedData.description,
      imageUrls,
      imageKeys,
    });

    // 4. Инвалидация кэша
    revalidatePath('/admin/map-templates');

    return {
      success: true,
      message: 'Шаблон карты создан успешно',
      errors: {},
    };

  } catch (error) {
    return {
      success: false,
      message: 'Ошибка при создании шаблона карты',
      errors: { root: error.message },
    };
  }
}
```

## 🖼️ UI Display Patterns

### Table Icons
```typescript
// Отображение иконок в таблицах
{template.imageUrls?.icon && (
  <Image
    src={template.imageUrls.icon}
    alt={template.name}
    width={32}
    height={32}
    className="h-8 w-8 object-cover rounded border border-border"
  />
)}
```

### Card Images
```typescript
// Отображение в карточках
{template.imageUrls?.medium && (
  <Image
    src={template.imageUrls.medium}
    alt={template.name}
    width={640}
    height={360}
    className="w-full h-48 object-cover rounded-lg"
  />
)}
```

### Modal/Detail View
```typescript
// Полноразмерное изображение
{template.imageUrls?.original && (
  <Image
    src={template.imageUrls.original}
    alt={template.name}
    width={1920}
    height={1080}
    className="w-full h-auto object-contain"
  />
)}
```

## ⚙️ Configuration

### Next.js Image Domains
```javascript
// next.config.mjs
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.regru.cloud',
        port: '',
        pathname: '/majesticmatchcenter/**', // Ограничиваем нашим bucket
      },
    ],
  },
};
```

### Environment Variables
```bash
# .env.local
S3_ENDPOINT=https://s3.regru.cloud
S3_REGION=ru-1
S3_BUCKET=majesticmatchcenter
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_FORCE_PATH_STYLE=true
```

### Image Specifications
```typescript
// src/lib/image-processing/specs.ts
export const IMAGE_SPECS: Record<EntityType, VariantSpec[]> = {
  'map-template': [
    {
      name: 'icon',
      width: 64,
      height: 64,
      quality: 80,
      description: 'Иконка для списков и миниатюр',
    },
    {
      name: 'medium',
      width: 640,
      height: 640,
      quality: 85,
      description: 'Среднее изображение для карточек',
    },
    {
      name: 'original',
      width: 1920,
      height: 1920,
      quality: 90,
      description: 'Оригинальное изображение для детального просмотра',
    },
  ],
};
```

## 🧪 Testing

### Unit Tests
```typescript
// src/lib/s3/upload.test.ts
describe('uploadImageVariants', () => {
  it('should upload all variants with correct ACL', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await uploadImageVariants(mockFile, 'map-template');
    
    expect(result.keys).toHaveProperty('icon');
    expect(result.keys).toHaveProperty('medium');
    expect(result.keys).toHaveProperty('original');
    expect(result.urls.icon).toMatch(/^https:\/\/s3\.regru\.cloud/);
  });

  it('should rollback on failure', async () => {
    // Тест rollback логики
  });
});
```

### Integration Tests
```typescript
// src/app/api/admin/map-templates/route.test.ts
describe('POST /api/admin/map-templates', () => {
  it('should create template with image upload', async () => {
    const formData = new FormData();
    formData.append('name', 'Test Template');
    formData.append('image', mockImageFile);

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: formData,
    }));

    expect(response.status).toBe(201);
    
    const template = await MapTemplate.findOne({ name: 'Test Template' });
    expect(template.imageUrls).toBeDefined();
    expect(template.imageKeys).toBeDefined();
  });
});
```

## 🚀 Migration Guide

### Adding S3 to Existing Entity

1. **Update Schema**
```typescript
// Add to existing schema
const entitySchema = new Schema({
  // ... existing fields
  imageUrls: { type: imageSetSchema, required: false },
  imageKeys: { type: imageKeysSchema, required: false },
});
```

2. **Add Image Specs**
```typescript
// src/lib/image-processing/specs.ts
export const IMAGE_SPECS: Record<EntityType, VariantSpec[]> = {
  // ... existing specs
  'your-entity': [
    { name: 'icon', width: 64, height: 64, quality: 80 },
    { name: 'medium', width: 640, height: 640, quality: 85 },
    { name: 'original', width: 1920, height: 1920, quality: 90 },
  ],
};
```

3. **Update Server Actions**
```typescript
// Add image processing to create/update actions
if (validatedData.image) {
  const uploadResult = await uploadImageVariants(
    validatedData.image,
    'your-entity'
  );
  imageUrls = uploadResult.urls as IImageSet;
  imageKeys = uploadResult.keys as IImageKeys;
}
```

4. **Update Forms**
```typescript
// Add FileDropzone to form
<FileDropzone
  value={imageValue}
  onChange={(file) => setValue('image', file)}
  onRemove={() => setValue('image', null)}
/>
```

5. **Update UI Components**
```typescript
// Display images in table/cards
{entity.imageUrls?.icon && (
  <Image
    src={entity.imageUrls.icon}
    alt={entity.name}
    width={32}
    height={32}
    className="h-8 w-8 object-cover rounded"
  />
)}
```

## 📈 Performance Considerations

### CDN Benefits
- **Быстрая доставка** файлов через Рег.ру CDN
- **Кэширование** на уровне браузера
- **Параллельная загрузка** вариантов изображений

### Optimization
- **WebP формат** для всех изображений
- **Адаптивные размеры** для разных контекстов
- **Lazy loading** через Next.js Image
- **Rollback механизм** предотвращает orphaned файлы

### Monitoring
- **S3 метрики** через AWS SDK
- **Upload errors** логируются в консоль
- **File size limits** валидируются на клиенте и сервере

---

> **Следующие шаги:** Применить эти паттерны к остальным сущностям (Players, Tournaments, Families) по мере необходимости. 