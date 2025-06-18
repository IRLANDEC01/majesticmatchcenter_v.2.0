# Решение проблемы интеграции Jest и DI-контейнера

Этот документ описывает финальное, рабочее решение проблемы с кешированием модулей Jest, которая приводила к ошибкам `TypeError` (некорректные зависимости) и `MongooseError` (таймаут БД) в интеграционных тестах API.

## Краткое описание проблемы

В среде Jest, при использовании `jest.resetModules()` для изоляции тестов, статические импорты (`import { POST } from './route'`) выполнялись *до* сброса кеша. В результате обработчик API получал "протухший", некорректно собранный экземпляр сервиса из DI-контейнера, что приводило к каскадным ошибкам.

## Ключевой элемент решения: Динамический импорт

Единственный надежный способ заставить Jest использовать "свежий" код после сброса кеша — это динамически импортировать тестируемый модуль **внутри самого теста**.

## Эталонный паттерн для тестов API с DI

Вот каноническая структура тестового файла, которая решает все обнаруженные проблемы:

```javascript
// src/app/api/.../route.test.js

// 1. Статически импортируем только то, что нужно для настройки
import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase, clearDatabase } from '@/lib/db';
import MyModel from '@/models/MyModel';
// ...другие модели

// 2. НЕ ИМПОРТИРУЕМ тестируемый обработчик (POST, GET и т.д.) статически

describe('POST /api/my-endpoint', () => {

  // 3. Управляем подключением к БД локально для каждого тестового набора.
  // Это необходимо, т.к. jest.resetModules() может сбрасывать глобальное состояние Mongoose.
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  // 4. В beforeEach ОБЯЗАТЕЛЬНО сбрасываем кеш и очищаем БД.
  beforeEach(async () => {
    jest.resetModules(); // Шаг А: Сбросить все модули
    await clearDatabase();   // Шаг Б: Очистить данные
    // Шаг В: Подготовить базовые тестовые данные...
    await MyModel.create({ ... });
  });

  it('должен успешно выполнить операцию и вернуть 200', async () => {
    // Arrange: готовим данные, специфичные для этого теста
    const requestData = { name: 'Test' };
    const request = new Request('http://localhost/api/...', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    // Act: 5. Динамически импортируем обработчик ПОСЛЕ сброса кеша.
    // Это гарантирует, что он и вся его цепочка зависимостей (di-container) будут "свежими".
    const { POST } = await import('./route');
    const response = await POST(request);

    // Assert: проверяем результат
    expect(response.status).toBe(201);
    const dbItem = await MyModel.findOne({ name: 'Test' });
    expect(dbItem).not.toBeNull();
  });
});
```

Этот паттерн обеспечивает полную изоляцию тестов и гарантирует, что каждый тест работает с чистой базой данных и свежим, правильно сконфигурированным экземпляром сервиса из DI-контейнера. 