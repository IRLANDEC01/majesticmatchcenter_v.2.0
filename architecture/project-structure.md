# Структура проекта MajesticMatchCenter

Этот документ описывает полную структуру проекта MajesticMatchCenter, соответствующую архитектурным принципам и паттернам, описанным в документации.

## Корневая структура

```
majesticmatchcenter/
├── .github/            # GitHub Actions workflows
├── .next/              # Сборка Next.js (автогенерируемая)
├── configs/            # Конфигурационные файлы
├── docs/               # Документация проекта
├── node_modules/       # Зависимости (автогенерируемая)
├── public/             # Статические файлы
├── scripts/            # Скрипты для деплоя, миграций и т.д.
├── src/                # Исходный код
│   ├── app/            # Next.js App Router
│   ├── components/     # React компоненты
│   ├── lib/            # Утилиты и сервисы
│   └── models/         # Mongoose модели
├── .env.example        # Пример переменных окружения
├── .env.local          # Локальные переменные окружения (git-ignored)
├── .eslintrc.json      # Конфигурация ESLint
├── .gitignore          # Файлы, игнорируемые Git
├── docker-compose.yml  # Конфигурация Docker Compose
├── Dockerfile          # Инструкции для сборки Docker образа
├── jest.config.js      # Конфигурация Jest
├── jsconfig.json       # Конфигурация JavaScript
├── next.config.js      # Конфигурация Next.js
├── package.json        # Зависимости и скрипты
└── README.md           # Документация проекта
```

## Исходный код (src/)

### App Router (src/app/)

```
src/app/
├── (public)/                # Публичная часть сайта
│   ├── tournaments/         # Маршруты для турниров
│   │   ├── [slug]/          # Динамический маршрут турнира
│   │   │   ├── page.jsx     # Страница турнира
│   │   │   └── layout.jsx   # Макет страницы турнира
│   │   └── page.jsx         # Список турниров
│   ├── players/             # Маршруты для игроков
│   │   ├── [slug]/          # Динамический маршрут игрока
│   │   │   └── page.jsx     # Страница игрока
│   │   └── page.jsx         # Список игроков
│   ├── families/            # Маршруты для семей
│   │   ├── [slug]/          # Динамический маршрут семьи
│   │   │   └── page.jsx     # Страница семьи
│   │   └── page.jsx         # Список семей
│   ├── news/                # Маршруты для новостей
│   │   ├── [slug]/          # Динамический маршрут новости
│   │   │   └── page.jsx     # Страница новости
│   │   └── page.jsx         # Список новостей
│   ├── layout.jsx           # Основной макет публичной части
│   └── page.jsx             # Главная страница
├── admin/                   # Административная панель
│   ├── tournaments/         # Управление турнирами
│   │   ├── [id]/            # Редактирование турнира
│   │   │   └── page.jsx     # Форма редактирования
│   │   ├── new/             # Создание турнира
│   │   │   └── page.jsx     # Форма создания
│   │   └── page.jsx         # Список турниров
│   ├── maps/                # Управление картами
│   │   ├── [id]/            # Редактирование карты
│   │   │   └── page.jsx     # Форма редактирования
│   │   ├── new/             # Создание карты
│   │   │   └── page.jsx     # Форма создания
│   │   └── page.jsx         # Список карт
│   ├── players/             # Управление игроками
│   ├── families/            # Управление семьями
│   ├── news/                # Управление новостями
│   ├── settings/            # Настройки системы
│   ├── layout.jsx           # Макет админки с навигацией
│   └── page.jsx             # Дашборд админки
├── api/                     # API маршруты
│   ├── healthz/             # Проверка работоспособности
│   │   └── route.js         # Эндпоинт проверки
│   ├── admin/               # Административные API
│   │   ├── tournaments/     # API для турниров
│   │   ├── maps/            # API для карт
│   │   ├── players/         # API для игроков
│   │   └── families/        # API для семей
│   ├── auth/                # Аутентификация
│   │   └── [...nextauth]/   # Конфигурация NextAuth.js
│   └── public/              # Публичные API
│       ├── tournaments/     # Публичные API для турниров
│       ├── players/         # Публичные API для игроков
│       └── families/        # Публичные API для семей
├── layout.jsx               # Корневой макет
└── page.jsx                 # Корневая страница (редирект)
```

### Компоненты (src/components/)

```
src/components/
├── ui/                      # Базовые UI компоненты
│   ├── mmc-design-system.jsx # Компоненты дизайн-системы
│   ├── Button.jsx           # Кнопка
│   ├── Card.jsx             # Карточка
│   ├── Input.jsx            # Поле ввода
│   └── ...                  # Другие базовые компоненты
├── admin/                   # Компоненты для админки
│   ├── tournament-form/     # Форма турнира (kebab-case)
│   └── map-form/           # Форма карты (kebab-case)
├── forms/                   # Общие формы
│   ├── TournamentForm.jsx   # Форма турнира (простая)
│   ├── MapForm.jsx          # Форма карты (простая)
│   ├── PlayerForm.jsx       # Форма игрока
│   └── FamilyForm.jsx       # Форма семьи
├── layout/                  # Компоненты макета
│   ├── Header.jsx           # Шапка сайта
│   ├── Footer.jsx           # Подвал сайта
│   ├── Sidebar.jsx          # Боковая панель
│   └── Navigation.jsx       # Навигация
└── ...                      # Другие компоненты
```

### Библиотеки и утилиты (src/lib/)

```
src/lib/
├── cache/                   # Абстракция кэширования
│   ├── index.js             # Точка входа и фабрика кэша
│   ├── cache-adapter.js     # Базовый интерфейс адаптера
│   ├── redis-adapter.js     # Redis имплементация
│   ├── memory-adapter.js    # In-memory имплементация
│   └── examples.js          # Примеры использования
├── domain/                  # Доменные сервисы
│   ├── tournament-service.js # Сервис турниров
│   ├── map-service.js       # Сервис карт
│   ├── rating-service.js    # Сервис рейтингов
│   ├── participation-service.js # Сервис участия
│   ├── prize-service.js     # Сервис призов
│   ├── scheduler-service.js # Сервис планировщика
│   └── status-history-service.js # Сервис истории статусов
├── repos/                   # Репозитории
│   ├── tournament-repo.js   # Репозиторий турниров
│   ├── map-repo.js          # Репозиторий карт
│   ├── player-repo.js       # Репозиторий игроков
│   ├── family-repo.js       # Репозиторий семей
│   └── status-history-repo.js # Репозиторий истории статусов
├── api/                     # API утилиты
│   ├── validators/          # Валидаторы API
│   │   ├── tournament-validators.js
│   │   └── map-validators.js
│   ├── schemas/             # Схемы API
│   │   ├── tournament-schemas.js
│   │   └── map-schemas.js
│   └── responses.js         # Стандартные ответы API
├── utils/                   # Общие утилиты
│   ├── logger.js            # Логирование
│   ├── date-helpers.js      # Работа с датами
│   ├── string-helpers.js    # Работа со строками
│   └── validation.js        # Валидация
├── pubsub/                  # Pub/Sub для событий
│   ├── redis-pubsub.js      # Redis имплементация
│   └── event-handlers.js    # Обработчики событий
├── rate-limiter.js          # Ограничение частоты запросов
├── auth-options.js          # Настройки аутентификации
└── csrf-protection.js       # Защита от CSRF
```

### Модели (src/models/)

```
src/models/
├── tournament/              # Модели и схемы турниров
│   ├── Tournament.js        # Основная модель турнира
│   ├── TournamentTemplate.js # Модель шаблона турнира
│   └── TournamentParticipation.js # Модель участия в турнире
├── map/                     # Модели и схемы карт
│   ├── Map.js               # Основная модель карты
│   ├── MapTemplate.js       # Модель шаблона карты
│   └── MapParticipation.js  # Модель участия в карте
├── family/                  # Модели и схемы семей
│   ├── Family.js            # Основная модель семьи
│   ├── FamilyMembership.js  # Модель членства в семье
│   └── FamilyRatingHistory.js # История рейтинга семьи
├── player/                  # Модели и схемы игроков
│   ├── Player.js            # Основная модель игрока
│   ├── PlayerStatistics.js  # Статистика игрока
│   └── PlayerRatingHistory.js # История рейтинга игрока
├── news/                    # Модели и схемы новостей
│   └── News.js              # Модель новости
└── StatusHistory.js         # Модель истории статусов
```

### Стили (src/styles/)

```
src/styles/
├── globals.css              # Глобальные стили и переменные
└── tailwind.css             # Конфигурация Tailwind CSS
```

## Скрипты (scripts/)

```
scripts/
├── backup.sh                # Скрипт резервного копирования
├── create-indexes.js        # Создание индексов MongoDB
├── scheduler.js             # Запуск планировщика задач
└── restore.sh               # Восстановление из резервной копии
```

## Конфигурации (configs/)

```
configs/
├── docker-compose.yml       # Основная конфигурация Docker Compose
├── docker-compose.monitoring.yml # Конфигурация для мониторинга
├── nginx.conf               # Основная конфигурация Nginx
├── sites/                   # Конфигурации виртуальных хостов
│   └── majesticmatchcenter.conf # Конфигурация сайта
├── redis.conf               # Конфигурация Redis
├── mongo-init.js            # Инициализация MongoDB
└── promtail.yml             # Конфигурация Promtail для логов
```

## Документация (docs/)

```
docs/
├── architecture/            # Архитектурная документация
│   ├── README.md            # Содержание
│   ├── 01-overview.md       # Обзор архитектуры
│   ├── 02-patterns.md       # Паттерны программирования
│   ├── 03-redis-implementation.md # Реализация Redis
│   ├── 04-business-logic.md # Бизнес-логика
│   ├── 05-deployment.md     # Деплой и инфраструктура
│   ├── 06-ui-frontend.md    # UI и фронтенд
│   └── project-structure.md # Структура проекта (этот файл)
├── api/                     # Документация API
│   ├── README.md            # Обзор API
│   ├── tournaments.md       # API турниров
│   ├── maps.md              # API карт
│   └── ...                  # Другие API
└── user-guides/             # Руководства пользователя
    ├── admin/               # Для администраторов
    └── player/              # Для игроков
```

## Соответствие архитектурным принципам

Данная структура проекта соответствует следующим архитектурным принципам:

1. **Гексагональная архитектура (Ports and Adapters)**
   - Бизнес-логика изолирована в доменных сервисах (`src/lib/domain/`)
   - Репозитории (`src/lib/repos/`) обеспечивают абстракцию доступа к данным
   - Адаптеры для внешних систем (Redis, S3) изолированы от бизнес-логики

2. **Доменно-ориентированное проектирование (DDD)**
   - Структура организована по доменным областям (tournaments, maps, families, players)
   - Модели отражают бизнес-сущности и их взаимосвязи
   - Доменные сервисы инкапсулируют бизнес-правила и операции

3. **Модульная архитектура компонентов**
   - Компоненты организованы по паттерну Container/View/Hook
   - Презентационные компоненты отделены от компонентов с состоянием
   - Бизнес-логика выделена в хуки для переиспользования

4. **Server Components и App Router**
   - Структура `src/app/` следует рекомендациям Next.js App Router
   - Разделение на серверные и клиентские компоненты
   - Группировка маршрутов по функциональности

5. **Многослойное кэширование**
   - Абстракция кэширования в `src/lib/cache/`
   - Поддержка Redis и in-memory реализаций
   - Единый интерфейс для всех типов кэша

6. **Планировщик задач на базе BullMQ**
   - Отдельный сервис для планировщика (`scripts/scheduler.js`)
   - Интеграция с Redis для распределенных задач
   - Сервисы для автоматического управления статусами

Эта структура обеспечивает четкое разделение ответственности, улучшает тестируемость и поддерживаемость кода, а также позволяет независимо развивать различные части системы. 