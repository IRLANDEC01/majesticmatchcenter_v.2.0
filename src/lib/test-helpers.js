import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectToDatabase, clearDatabase, disconnectFromDatabase } from './db.js';
import models from '../models/index.js';
import { LIFECYCLE_STATUSES as STATUSES, CURRENCY_TYPES, RESULT_TIERS, MAP_TEMPLATE_STATUSES } from './constants.js';
import MapTemplate from '@/models/map/MapTemplate';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import { clearMemoryCache } from '@/lib/cache';

let mongoServer;

const {
  Family,
  Player,
  Map,
  Tournament,
  FamilyTournamentParticipation,
  FamilyMapParticipation,
  PlayerTournamentParticipation,
  PlayerEarning,
  FamilyEarning,
  PlayerMapParticipation,
} = models;

/**
 * Подключается к тестовой базе данных.
 * Предназначен для вызова в `beforeAll()`.
 */
export const dbConnect = async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await connectToDatabase();
  // Дожидаемся, пока все модели построят свои индексы.
  // Это критически важно для тестов, проверяющих уникальные ограничения.
  await Promise.all(Object.values(mongoose.models).map(model => model.syncIndexes()));
};

/**
 * Отключается от тестовой базы данных.
 * Предназначен для вызова в `afterAll()`.
 */
export const dbDisconnect = async () => {
  await disconnectFromDatabase();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Полностью очищает все коллекции в тестовой базе данных.
 * Предназначен для вызова в `afterEach()` или `beforeEach()` для изоляции тестов.
 */
export const dbClear = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// =================================================================
// НОВЫЕ ХЕЛПЕРЫ ДЛЯ УПРАВЛЕНИЯ ЖИЗНЕННЫМ ЦИКЛОМ БД В ТЕСТАХ
// =================================================================
let testMongoServer;

export const connectToTestDB = async () => {
  testMongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = testMongoServer.getUri();
  await connectToDatabase();
  await Promise.all(Object.values(mongoose.models).map(model => model.syncIndexes()));
};

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  // Очищаем кэш после очистки базы данных для полной изоляции тестов
  clearMemoryCache();
};

export const disconnectFromTestDB = async () => {
  await disconnectFromDatabase();
  if (testMongoServer) {
    await testMongoServer.stop();
  }
};

/**
 * Создает тестовый шаблон карты с уникальными значениями по умолчанию.
 * Использует репозиторий для корректной работы с кэшем.
 */
export const createTestMapTemplate = async (overrides = {}) => {
  const uniqueId = new mongoose.Types.ObjectId().toString();
  const defaults = {
    name: uniqueId,
    // ✅ ИСПРАВЛЕНО: Добавлены обязательные поля для новой схемы S3
    imageUrls: {
      icon: `https://test-cdn.example.com/maps/${uniqueId}/icon.webp`,
      medium: `https://test-cdn.example.com/maps/${uniqueId}/medium.webp`,
      original: `https://test-cdn.example.com/maps/${uniqueId}/original.jpg`,
    },
    imageKeys: {
      icon: `maps/${uniqueId}/icon.webp`,
      medium: `maps/${uniqueId}/medium.webp`,
      original: `maps/${uniqueId}/original.jpg`,
    },
  };

  const templateData = { ...defaults, ...overrides };
  
  // ✅ ИСПРАВЛЕНО: Обрабатываем флаг архивации для тестов (как в createTestTournamentTemplate)
  if (templateData.isArchived) {
    templateData.archivedAt = new Date();
    delete templateData.isArchived;
  }
  
  return await mapTemplateRepo.create(templateData);
};

/**
 * Создает тестовый шаблон турнира с уникальными значениями по умолчанию.
 * Использует репозиторий для корректной работы с кэшем.
 */
export const createTestTournamentTemplate = async (overrides = {}) => {
  // Если mapTemplates не переданы, создаем один уникальный по умолчанию для валидации
  let mapTemplates = overrides.mapTemplates;
  if (!mapTemplates || mapTemplates.length === 0) {
    // Каждый раз создаем уникальный шаблон карты с уникальным именем
    const uniqueId = new mongoose.Types.ObjectId().toString().slice(-8);
    const uniqueMapTemplate = await mapTemplateRepo.create({
      name: `Map Template ${uniqueId}`,
      // ✅ ИСПРАВЛЕНО: Добавлены обязательные поля для новой схемы S3
      imageUrls: {
        icon: `https://test-cdn.example.com/maps/${uniqueId}/icon.webp`,
        medium: `https://test-cdn.example.com/maps/${uniqueId}/medium.webp`,
        original: `https://test-cdn.example.com/maps/${uniqueId}/original.jpg`,
      },
      imageKeys: {
        icon: `maps/${uniqueId}/icon.webp`,
        medium: `maps/${uniqueId}/medium.webp`,
        original: `maps/${uniqueId}/original.jpg`,
      },
    });
    mapTemplates = [uniqueMapTemplate._id];
  }

  const defaults = {
    name: new mongoose.Types.ObjectId().toString(),
    imageUrls: { medium: 'https://example.com/default-tournament.png', icon: '', original: '' },
    description: 'Test tournament template description',
    maxParticipants: 8,
    gameRules: 'Test game rules',
    mapTemplates: mapTemplates,
    isArchived: false,
    isActive: true,
  };

  const templateData = { ...defaults, ...overrides };
  
  // Обрабатываем флаг архивации для тестов
  if (templateData.isArchived) {
    // @ts-ignore - динамически добавляем поле archivedAt
    templateData.archivedAt = new Date();
    delete templateData.isArchived;
  }
  
  return await tournamentTemplateRepo.create(templateData);
};

/**
 * Создает тестовый турнир для использования в интеграционных тестах.
 * @param {object} [overrides] - Объект для перезаписи полей по умолчанию.
 * @returns {Promise<import('@/models/tournament/Tournament').ITournament>}
 */
export const createTestTournament = async (overrides = {}) => {
  const defaults = {
    name: `Default Tournament ${new mongoose.Types.ObjectId().toString()}`,
    slug: 'default-tournament-template',
    template: new mongoose.Types.ObjectId(),
    tournamentType: 'family',
    status: STATUSES.ACTIVE,
    startDate: new Date(),
    participants: [],
  };

  const finalData = { ...defaults, ...overrides };

  // Обрабатываем флаг архивации для тестов
  if (finalData.isArchived) {
    finalData.archivedAt = new Date();
    delete finalData.isArchived;
  }

  return Tournament.create(finalData);
};

/**
 * Наполняет базу данных ВАЛИДНЫМ и консистентным набором данных для тестов.
 * @param {object} [config] - Конфигурация для кастомизации создаваемых данных.
 * @returns {Promise<{testData: object}>} Объект с ключом testData, содержащий созданные Mongoose-документы.
 */
export const populateDb = async (config = {}) => {
  const context = {};

  // --- Конфигурация по умолчанию ---
  const {
    numFamilies = 2,
    numPlayers = 2,
    numTournamentTemplates = 1,
    numTournaments = 1,
  } = config;

  // --- Предопределенные данные для избежания ошибок валидации ---
  const playerNames = [
    { firstName: 'Tom', lastName: 'Gucci' },
    { firstName: 'Aza', lastName: 'Uzi' },
    { firstName: 'Leo', lastName: 'Messi' },
    { firstName: 'Cris', lastName: 'Ronaldo' },
    { firstName: 'John', lastName: 'Doe' },
  ];
  const familyNames = ['Gucci', 'Uzi', 'Faze', 'Navi', 'Vitality'];

  // --- Шаблоны ---
  context.mapTemplateDust2 = await createTestMapTemplate({ name: 'Dust 2', slug: 'de_dust2' });
  context.mapTemplateMirage = await createTestMapTemplate({ name: 'Mirage', slug: 'de_mirage' });
  
  context.tournamentTemplates = [];
  if (numTournamentTemplates > 0) {
    for (let i = 0; i < numTournamentTemplates; i++) {
      const template = await createTestTournamentTemplate({
        name: `Majestic Cup: Season ${i + 1}`,
        slug: `majestic-cup-season-${i + 1}`,
        mapTemplates: [context.mapTemplateDust2._id, context.mapTemplateMirage._id],
        prizePool: [
          {
            target: { tier: RESULT_TIERS.WINNER, rank: 1 },
            amount: 1000000,
            currency: CURRENCY_TYPES.GTA_DOLLARS,
          },
        ],
      });
      context.tournamentTemplates.push(template);
    }
    context.tournamentTemplate = context.tournamentTemplates[0];
    // Для старых тестов, которые могут использовать это имя
    context.tournamentTemplateMain = context.tournamentTemplate;
  }

  // --- Семьи и Игроки ---
  const families = [];
  const players = [];
  for (let i = 0; i < Math.min(numFamilies, numPlayers, familyNames.length, playerNames.length); i++) {
      const player = await Player.create({
          firstName: playerNames[i].firstName,
          lastName: playerNames[i].lastName,
          rating: 1000 + i * 50
      });
      players.push(player);

      const family = await Family.create({
          name: familyNames[i],
          displayLastName: familyNames[i],
          rating: 1200 + i * 50,
          owner: player._id,
          members: [{ player: player._id, role: 'owner' }]
      });
      await Player.findByIdAndUpdate(player._id, { currentFamily: family._id });
      families.push(family);
  }

  context.players = players;
  context.player = players[0];
  context.playerGucci = players[0]; // legacy
  context.playerUzi = players.length > 1 ? players[1] : null; // legacy
  
  context.families = families;
  context.family = families.length > 0 ? families[0] : null;
  context.familyGucci = families.length > 0 ? families[0] : null; // legacy
  context.familyUzi = families.length > 1 ? families[1] : null; // legacy


  // --- Турниры ---
  if (numTournaments > 0 && context.tournamentTemplate) {
      const tournamentData = config.tournaments?.[0] || {};
      context.tournament = await Tournament.create({
        name: 'Majestic Summer Cup 2024',
        slug: 'majestic-summer-cup-2024-1',
        template: context.tournamentTemplate._id,
        tournamentType: 'family',
        status: STATUSES.ACTIVE,
        startDate: new Date(),
        participants: families.map(f => ({ participantType: 'family', family: f._id })),
        ...tournamentData,
      });
      context.tournaments = [context.tournament];
  }
  
  // --- Участие в турнирах ---
  if (context.tournament) {
      const ftpData = config.familyTournamentParticipations
        ? (typeof config.familyTournamentParticipations === 'function' ? config.familyTournamentParticipations(context) : config.familyTournamentParticipations)
        : families.map(f => ({ family: f._id, tournament: context.tournament._id }));

      if (ftpData && ftpData.length > 0) {
        await FamilyTournamentParticipation.insertMany(ftpData);
        context.familyTournamentParticipations = await FamilyTournamentParticipation.find({ tournament: context.tournament._id }).lean();
      }
  }


  // --- Карты ---
  const mapsConfig = config.maps === null ? [] : (config.maps || [{}]);
  context.maps = [];
  if (mapsConfig.length > 0) {
    const defaultMapData = {
        name: 'Dust 2 - Grand Final',
        slug: 'dust-2-grand-final',
        tournament: context.tournament?._id,
        template: context.mapTemplateDust2._id,
        status: STATUSES.ACTIVE,
        startDateTime: new Date(),
        participants: context.families?.map(f => ({ participant: f._id, players: f.members.map(m => m.player) })) || [],
    };

    for (const mapConfig of mapsConfig) {
        const finalMapData = { ...defaultMapData, ...mapConfig };
        if (finalMapData.tournament) {
            context.maps.push(await Map.create(finalMapData));
        }
    }
    if(context.maps.length > 0) {
        context.map = context.maps[0];
    }
  }
  
  // --- Участие игроков на картах (статистика) ---
  if (config.playerMapParticipations) {
    const pmpData = typeof config.playerMapParticipations === 'function'
      ? config.playerMapParticipations(context)
      : config.playerMapParticipations;
    if (pmpData && pmpData.length > 0) {
      await PlayerMapParticipation.insertMany(pmpData);
    }
  }

  // --- Участие семей на картах (статистика) ---
  if (config.familyMapParticipations) {
    const fmpData = typeof config.familyMapParticipations === 'function'
      ? config.familyMapParticipations(context)
      : config.familyMapParticipations;
    if (fmpData && fmpData.length > 0) {
      await FamilyMapParticipation.insertMany(fmpData);
    }
  }

  // Перечитываем документы из базы, чтобы получить "чистые" данные без методов Mongoose
  const finalContext = {};
  for(const key in context) {
      if(context[key] && context[key].constructor.name === 'model') {
          finalContext[key] = await context[key].constructor.findById(context[key]._id).lean();
      } else {
          finalContext[key] = context[key];
      }
  }

  return { testData: finalContext };
};

/**
 * Тестовые данные статистики для игроков.
 * Извлечено из JSON-файла для надежности импорта в Jest.
 */
export const GUCCI_STATS = [
  {
    "firstName": "Tom",
    "lastName": "Gucci",
    "kills": 18,
    "deaths": 7,
    "damageDealt": 2310,
    "shotsFired": 125,
    "hits": 81,
    "hitAccuracy": 64.8,
    "headshots": 23,
    "headshotAccuracy": 28.4,
    "weaponStats": [
      {
        "weapon": "AK-47",
        "shotsFired": 78,
        "hits": 52,
        "kills": 12,
        "damage": 1580,
        "headshots": 18,
        "headshotAccuracy": 34.62
      },
      {
        "weapon": "AWP",
        "shotsFired": 15,
        "hits": 11,
        "kills": 4,
        "damage": 440,
        "headshots": 3,
        "headshotAccuracy": 27.27
      },
      {
        "weapon": "Glock-18",
        "shotsFired": 32,
        "hits": 18,
        "kills": 2,
        "damage": 290,
        "headshots": 2,
        "headshotAccuracy": 11.11
      }
    ]
  },
  {
    "firstName": "Aza",
    "lastName": "Uzi",
    "kills": 14,
    "deaths": 12,
    "damageDealt": 1890,
    "shotsFired": 156,
    "hits": 92,
    "hitAccuracy": 58.97,
    "headshots": 16,
    "headshotAccuracy": 17.39,
    "weaponStats": [
      {
        "weapon": "M4A4",
        "shotsFired": 89,
        "hits": 58,
        "kills": 8,
        "damage": 1120,
        "headshots": 12,
        "headshotAccuracy": 20.69
      },
      {
        "weapon": "AWP",
        "shotsFired": 12,
        "hits": 8,
        "kills": 3,
        "damage": 380,
        "headshots": 2,
        "headshotAccuracy": 25.0
      },
      {
        "weapon": "USP-S",
        "shotsFired": 35,
        "hits": 18,
        "kills": 2,
        "damage": 250,
        "headshots": 1,
        "headshotAccuracy": 5.56
      },
      {
        "weapon": "Knife",
        "shotsFired": 20,
        "hits": 8,
        "kills": 1,
        "damage": 140,
        "headshots": 1,
        "headshotAccuracy": 12.5
      }
    ]
  }
]; 