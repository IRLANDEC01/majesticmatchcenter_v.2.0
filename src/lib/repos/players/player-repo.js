import Player from '@/models/player/Player.js';
import BaseRepo from '../base-repo.js';

/**
 * @class PlayerRepository
 * @description Репозиторий для работы с данными игроков.
 * @extends {BaseRepo}
 */
class PlayerRepository extends BaseRepo {
  constructor() {
    // Передаем модель и префикс для кеша в родительский конструктор
    super(Player, 'player');
  }

  /**
   * Находит игрока по слагу.
   * @param {string} slug - Слаг игрока.
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    return this.model.findOne({ slug, archivedAt: null }).lean();
  }

  /**
   * Находит игрока по имени и "публичной" фамилии (собственной или семейной).
   * Использует aggregation pipeline для $lookup данных семьи.
   * @param {string} firstName - Имя игрока.
   * @param {string} lastName - Фамилия для поиска (может быть displayLastName семьи).
   * @returns {Promise<object|null>}
   */
  async findByNameWithFamily(firstName, lastName) {
    const results = await this.model.aggregate([
      // Шаг 1: Найти кандидатов по имени и статусу
      {
        $match: {
          firstName,
          archivedAt: null,
        },
      },
      // Шаг 2: Подтянуть (join) данные из коллекции семей
      {
        $lookup: {
          from: 'families', // Имя коллекции в MongoDB
          localField: 'currentFamily',
          foreignField: '_id',
          as: 'familyData',
        },
      },
      // Шаг 3: Развернуть массив familyData (он всегда будет из одного элемента или пуст)
      {
        $unwind: {
          path: '$familyData',
          preserveNullAndEmptyArrays: true, // Сохранить игроков без семьи
        },
      },
      // Шаг 4: Финальная фильтрация по фамилии
      {
        $match: {
          $or: [
            { lastName }, // Проверяем собственную фамилию
            { 'familyData.displayLastName': lastName }, // Проверяем фамилию семьи
          ],
        },
      },
      // Шаг 5: Ограничить результат одним документом
      { $limit: 1 },
    ]);

    // aggregate возвращает массив, поэтому берем первый элемент или null
    return results[0] || null;
  }

  /**
   * Находит игрока по имени и фамилии.
   * @deprecated Используйте findByNameWithFamily для учета логики displayLastName
   * @param {string} firstName - Имя игрока.
   * @param {string} lastName - Фамилия игрока.
   * @returns {Promise<object|null>}
   */
  async findByName(firstName, lastName) {
    return this.model.findOne({ firstName, lastName, archivedAt: null }).lean();
  }

  /**
   * Находит всех игроков.
   * @param {object} [options] - Опции.
   * @param {object} [options.filter={}] - MongoDB-фильтр.
   * @param {boolean} [options.includeArchived=false] - Включить архивированных игроков.
   * @returns {Promise<Array<object>>}
   */
  async findAll({ includeArchived = false, filter = {} } = {}) {
    const finalFilter = includeArchived ? filter : { ...filter, archivedAt: null };
    return this.model.find(finalFilter).lean();
  }

  // Методы findById, create, update, archive, restore наследуются из BaseRepo
  // и автоматически обрабатывают кеш.

  /**
   * Архивирует игрока и убирает его из семьи.
   * @override
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async archive(id) {
    // Переопределяем базовый метод, чтобы добавить логику отвязки от семьи
    return this.update(id, { archivedAt: new Date(), family: null });
  }

  /**
   * Атомарно увеличивает рейтинг игрока.
   * @param {string} playerId - ID игрока.
   * @param {number} amount - Величина, на которую нужно увеличить рейтинг.
   * @returns {Promise<void>}
   */
  async incrementRating(playerId, amount) {
    if (amount === 0) return;
    const player = await this.model.findByIdAndUpdate(
      playerId,
      { $inc: { rating: amount } },
      { new: true }
    ).lean();

    if (player) {
      await this.cache.delete(this.getCacheKey(playerId));
    }
  }

  /**
   * Устанавливает семью для игрока.
   * @param {string} playerId - ID игрока.
   * @param {string} familyId - ID семьи.
   * @returns {Promise<object>}
   */
  async setFamily(playerId, familyId) {
    return this.update(playerId, { family: familyId });
  }

  /**
   * Убирает игрока из семьи.
   * @param {string} playerId - ID игрока.
   * @returns {Promise<object>}
   */
  async unsetFamily(playerId) {
    return this.update(playerId, { $unset: { family: 1 } });
  }
}

const playerRepo = new PlayerRepository();
export default playerRepo;