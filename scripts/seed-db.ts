import { connectToDatabase, disconnectFromDatabase } from '../src/lib/db';
import MapTemplate from '../src/models/map/MapTemplate';
import TournamentTemplate from '../src/models/tournament/TournamentTemplate';

const MAP_TEMPLATES = [
  { name: 'Dust 2', slug: 'dust-2', description: 'Классическая карта сбалансированного типа.', mapTemplateImage: 'https://placehold.co/600x400/F4A261/E9C46A?text=Dust+2' },
  { name: 'Mirage', slug: 'mirage', description: 'Популярная карта для соревновательных игр.', mapTemplateImage: 'https://placehold.co/600x400/2A9D8F/E9C46A?text=Mirage' },
  { name: 'Inferno', slug: 'inferno', description: 'Карта с узкими проходами в итальянском сеттинге.', mapTemplateImage: 'https://placehold.co/600x400/E76F51/E9C46A?text=Inferno' },
  { name: 'Nuke', slug: 'nuke', description: 'Многоуровневая карта на атомной электростанции.', mapTemplateImage: 'https://placehold.co/600x400/264653/E9C46A?text=Nuke' },
  { name: 'Train', slug: 'train', description: 'Карта на железнодорожной станции.', mapTemplateImage: 'https://placehold.co/600x400/A8DADC/1D3557?text=Train' },
  { name: 'Cache', slug: 'cache', description: 'Карта в Чернобыльской зоне отчуждения.', mapTemplateImage: 'https://placehold.co/600x400/457B9D/F1FAEE?text=Cache' },
  { name: 'Overpass', slug: 'overpass', description: 'Карта в Германии с каналами и парком.', mapTemplateImage: 'https://placehold.co/600x400/6A994E/E9C46A?text=Overpass' },
  { name: 'Vertigo', slug: 'vertigo', description: 'Карта на небоскребе, требующая вертикального контроля.', mapTemplateImage: 'https://placehold.co/600x400/A9A9A9/E9C46A?text=Vertigo' },
];

async function seedDatabase() {
  console.log('🌱 Начинается наполнение базы данных...');
  try {
    await connectToDatabase();
    console.log('🔌 Успешное подключение к базе данных.');

    // Очистка коллекций перед наполнением
    console.log('🧹 Очистка старых данных...');
    await MapTemplate.deleteMany({});
    await TournamentTemplate.deleteMany({}); // Также чистим шаблоны турниров для консистентности
    console.log('✅ Старые данные успешно удалены.');

    // Создание шаблонов карт
    console.log('🗺️ Создание шаблонов карт...');
    const createdMapTemplates = await MapTemplate.insertMany(MAP_TEMPLATES);
    console.log(`✅ Успешно создано ${createdMapTemplates.length} шаблонов карт.`);

    // Создание тестового шаблона турнира, использующего некоторые из карт
    console.log('🏆 Создание тестового шаблона турнира...');
    const tournamentTemplateData = {
      name: 'Majestic Major 2025',
      description: 'Главный турнир года с классическим набором карт.',
      rules: 'Стандартные правила 5x5.',
      prizePool: [
        { type: 'rank', rank: 1, amount: 10000 },
        { type: 'rank', rank: 2, amount: 5000 },
        { type: 'rank', rank: 3, amount: 2500 },
      ],
      mapTemplates: [
        createdMapTemplates[0]._id, // Dust 2
        createdMapTemplates[1]._id, // Mirage
        createdMapTemplates[2]._id, // Inferno
      ],
    };
    await TournamentTemplate.create(tournamentTemplateData);
    console.log('✅ Тестовый шаблон турнира успешно создан.');

    console.log('🎉 Наполнение базы данных успешно завершено!');
  } catch (error) {
    console.error('❌ Ошибка при наполнении базы данных:', error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
    console.log('🔌 Отключено от базы данных.');
  }
}

// Этот блок выполняется, только если скрипт запущен напрямую, а не импортирован
if (require.main === module) {
  seedDatabase();
} 