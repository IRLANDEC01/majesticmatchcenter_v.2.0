import { DuplicateError, NotFoundError, ValidationError, ConflictError } from '@/lib/errors.js';
import familyRepo from '@/lib/repos/families/family-repo.js';
import playerRepo from '@/lib/repos/players/player-repo.js';
import FamilyStats from '@/models/family/FamilyStats.js';
import { FAMILY_MEMBER_ROLES } from '@/lib/constants.js';

/**
 * @class FamilyService
 * @description Сервис для управления бизнес-логикой семей.
 */
class FamilyService {
  constructor(repo, playerRepository) {
    this.repo = repo;
    this.playerRepo = playerRepository;
  }

  async _validateNameUniqueness(name, currentFamilyId = null) {
    const existingActiveFamily = await this.repo.findByNameAndStatus(name, 'active');
    if (existingActiveFamily && (!currentFamilyId || existingActiveFamily._id.toString() !== currentFamilyId)) {
      throw new DuplicateError('Семья с таким названием уже существует среди активных.');
    }
  }

  async createFamily(familyData) {
    const { ownerId, name, displayLastName, description, logo, banner } = familyData;

    const owner = await this.playerRepo.findById(ownerId);
    if (!owner) {
      throw new NotFoundError('Указанный игрок-владелец не найден или архивирован.');
    }

    if (owner.familyId) {
      throw new ConflictError('Игрок уже состоит в другой семье и не может быть назначен владельцем.');
    }

    await this._validateNameUniqueness(name);

    const familyToCreate = {
      name,
      displayLastName,
      description,
      logo,
      banner,
      owner: ownerId,
      members: [
        {
          player: ownerId,
          role: FAMILY_MEMBER_ROLES.OWNER,
          joinedAt: new Date(),
        },
      ],
    };

    const newFamily = await this.repo.create(familyToCreate);
    if (newFamily) {
      await FamilyStats.create({ familyId: newFamily._id });
      await this.playerRepo.update(ownerId, { familyId: newFamily._id });
    }
    return newFamily;
  }

  async getFamilies(options) {
    return this.repo.find(options);
  }

  async getFamilyById(id, { includeArchived = false } = {}) {
    const family = await this.repo.findById(id, { includeArchived });
    if (!family) {
      throw new NotFoundError('Семья не найдена или архивирована.');
    }
    return family;
  }

  async updateFamily(id, familyData) {
    await this.getFamilyById(id); // Проверяем, что семья существует
    if (familyData.name) {
      await this._validateNameUniqueness(familyData.name, id);
    }
    const updatedFamily = await this.repo.update(id, familyData);
    return updatedFamily;
  }

  async addMember(familyId, playerId) {
    const family = await this.getFamilyById(familyId);
    const player = await this.playerRepo.findById(playerId);
    if (!player) {
      throw new NotFoundError('Игрок не найден или архивирован.');
    }

    if (player.familyId) {
      throw new ConflictError('Игрок уже состоит в другой семье.');
    }

    const isAlreadyMember = family.members.some(member => member.player.toString() === playerId);
    if (isAlreadyMember) {
      throw new ConflictError('Игрок уже является участником этой семьи.');
    }

    const memberData = { player: playerId, joinedAt: new Date() };
    const updatedFamily = await this.repo.update(familyId, { $push: { members: memberData } });
    await this.playerRepo.update(playerId, { familyId });

    return updatedFamily;
  }

  async removeMember(familyId, playerId) {
    const family = await this.getFamilyById(familyId);
    const player = await this.playerRepo.findById(playerId);
    if (!player) {
      throw new NotFoundError('Игрок не найден.');
    }

    if (family.owner.toString() === playerId) {
      throw new ValidationError('Нельзя удалить владельца из семьи. Сначала смените владельца.');
    }

    await this.playerRepo.update(playerId, { $unset: { familyId: 1 } });
    return this.repo.update(familyId, { $pull: { members: { player: playerId } } });
  }

  async archiveFamily(id) {
    const family = await this.repo.findById(id, { includeArchived: true }); // Находим даже если архивирован
    if (!family) {
      throw new NotFoundError('Семья не найдена.');
    }
    if (family.archivedAt) {
      throw new ConflictError('Семья уже в архиве.');
    }
    // TODO: Добавить проверку на участие в активных турнирах
    return this.repo.archive(id);
  }

  async restoreFamily(id) {
    const family = await this.repo.findById(id, { includeArchived: true });
     if (!family) {
      throw new NotFoundError('Семья не найдена.');
    }
    if (!family.archivedAt) {
      throw new ConflictError('Семья не находится в архиве.');
    }

    // ПРОВЕРКА: Нельзя восстановить семью, если уже существует активная с таким же именем.
    await this._validateNameUniqueness(family.name);

    return this.repo.restore(id);
  }

  async changeOwner(familyId, newOwnerId) {
    const family = await this.getFamilyById(familyId);
    const newOwner = await this.playerRepo.findById(newOwnerId);

    if (!newOwner) {
      throw new NotFoundError('Кандидат в новые владельцы не найден.');
    }

    const isMember = family.members.some(member => member.player.toString() === newOwnerId);
    if (!isMember) {
      throw new ValidationError('Новый владелец должен быть участником семьи.');
    }

    if (family.owner.toString() === newOwnerId) {
      throw new ConflictError('Этот игрок уже является владельцем семьи.');
    }

    const oldOwnerId = family.owner.toString();
    return this.repo.changeOwner(familyId, oldOwnerId, newOwnerId);
  }
}

const familyService = new FamilyService(familyRepo, playerRepo);
export default familyService;