import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from './db.js';
import models from '../models/index.js';

const {
  Family,
  Player,
  Map,
  Tournament,
  MapTemplate,
  TournamentTemplate,
} = models;

/**
 * Подключается к тестовой базе данных.
 * Предназначен для вызова в `beforeAll()`.
 */
export const dbConnect = async () => {
  await connectToDatabase();
};

/**
 * Отключается от тестовой базы данных.
 * Предназначен для вызова в `afterAll()`.
 */
export const dbDisconnect = async () => {
  await disconnectFromDatabase();
};

/**
 * Полностью очищает все коллекции в тестовой базе данных.
 * Предназначен для вызова в `afterEach()` или `beforeEach()` для изоляции тестов.
 */
export const dbClear = async () => {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    // Использование { w: 1 } может немного ускорить тесты, не дожидаясь полной записи на диск
    await collection.deleteMany({}, { w: 1 });
  }
};

/**
 * Наполняет базу данных ВАЛИДНЫМ и консистентным набором данных для тестов.
 * @param {object} [config] - Конфигурация для кастомизации создаваемых данных.
 * @returns {Promise<object>} Объект с созданными Mongoose-документами.
 */
export const populateDb = async (config = {}) => {
  const context = {};

  // --- Шаблоны ---
  context.mapTemplate1 = await MapTemplate.create({ name: 'Dust 2', slug: 'de_dust2' });
  context.mapTemplate2 = await MapTemplate.create({ name: 'Mirage', slug: 'de_mirage' });
  context.tournamentTemplate = await TournamentTemplate.create({
    name: 'Majestic Cup: Summer',
    slug: 'majestic-cup-summer',
    mapTemplates: [context.mapTemplate1._id, context.mapTemplate2._id],
  });

  // --- Семьи и Игроки ---
  const player1_1 = await Player.create({ firstName: 'Tom', lastName: 'Gucci', rating: 1250 });
  const player2_1 = await Player.create({ firstName: 'Aza', lastName: 'Uzi', rating: 1150 });
  
  const family1 = await Family.create({ name: 'Gucci', displayLastName: 'Gucci', rating: 1200, owner: player1_1._id, members: [{ player: player1_1._id, role: 'owner' }] });
  const family2 = await Family.create({ name: 'Uzi', displayLastName: 'Uzi', rating: 1100, owner: player2_1._id, members: [{ player: player2_1._id, role: 'owner' }] });
  
  const updatedPlayer1_1 = await Player.findByIdAndUpdate(player1_1._id, { currentFamily: family1._id }, { new: true }).lean();
  const updatedPlayer2_1 = await Player.findByIdAndUpdate(player2_1._id, { currentFamily: family2._id }, { new: true }).lean();
  
  context.families = [family1, family2];
  context.players = [updatedPlayer1_1, updatedPlayer2_1];

  // --- Турниры ---
  const tournamentData = config.tournaments?.[0] || {};
  context.tournaments = [
    await Tournament.create({
      name: 'Majestic Summer Cup 2024',
      slug: 'majestic-summer-cup-2024-1',
      template: context.tournamentTemplate._id,
      tournamentType: 'family',
      status: 'active',
      startDate: new Date(),
      participants: [
        { participantType: 'family', family: family1._id },
        { participantType: 'family', family: family2._id },
      ],
      ...tournamentData,
    })
  ];
  context.tournament = context.tournaments[0]; // для обратной совместимости

  // --- Карты ---
  const mapsConfig = typeof config.maps === 'function' ? config.maps(context) : (config.maps || []);
  context.maps = [];
  if (mapsConfig.length > 0) {
    for (const mapConfig of mapsConfig) {
      context.maps.push(await Map.create(mapConfig));
    }
  } else {
    context.maps.push(await Map.create({
        name: 'Dust 2 - Grand Final',
        slug: 'dust-2-grand-final',
        tournament: context.tournament._id,
        template: context.mapTemplate1._id,
        status: 'active',
        startDateTime: new Date(),
        participants: [
            { participant: family1._id, players: [player1_1._id] },
            { participant: family2._id, players: [player2_1._id] },
        ],
    }));
  }
  context.map = context.maps[0]; // для обратной совместимости

  // --- Участие в картах ---
  if (config.familyMapParticipations) {
    const participationsData = typeof config.familyMapParticipations === 'function'
      ? config.familyMapParticipations(context)
      : config.familyMapParticipations;
      
    // Убедимся, что у каждой записи есть tournamentId
    const dataWithTournamentId = participationsData.map(p => ({
      ...p,
      tournamentId: p.tournamentId || context.tournament._id,
    }));
      
    context.familyMapParticipations = await models.FamilyMapParticipation.create(dataWithTournamentId);
  }
  
  // --- Участие в турнирах ---
  if (config.familyTournamentParticipations) {
    const participationsData = typeof config.familyTournamentParticipations === 'function'
      ? config.familyTournamentParticipations(context)
      : config.familyTournamentParticipations;
    context.familyTournamentParticipations = await models.FamilyTournamentParticipation.create(participationsData);
  }

  // Для обратной совместимости со старыми тестами
  context.mapTemplates = [context.mapTemplate1, context.mapTemplate2];

  return context;
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