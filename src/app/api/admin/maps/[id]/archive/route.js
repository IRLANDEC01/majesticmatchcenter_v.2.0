import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/api/handle-api-error';
import { NotFoundError } from '@/lib/errors';

// Классы сервисов
import MapService from '@/lib/domain/maps/map-service';

// Классы репозиториев
import MapRepository from '@/lib/repos/maps/map-repo';
import TournamentRepository from '@/lib/repos/tournaments/tournament-repo';
import MapTemplateRepository from '@/lib/repos/map-templates/map-template-repo';
import FamilyRepository from '@/lib/repos/families/family-repo';
import PlayerRepository from '@/lib/repos/players/player-repo';

function getMapService() {
  const mapRepo = new MapRepository();
  const tournamentRepo = new TournamentRepository();
  const mapTemplateRepo = new MapTemplateRepository();
  const familyRepo = new FamilyRepository();
  const playerRepo = new PlayerRepository();

  // Для архивации не нужны ratingService и statisticsService
  return new MapService(
    { mapRepo, tournamentRepo, mapTemplateRepo, familyRepo, playerRepo },
    {} // Передаем пустой объект для второстепенных сервисов
  );
}

/**
 * PATCH /api/admin/maps/[id]/archive
 * Архивирует или восстанавливает карту в зависимости от ее текущего состояния.
 * Если карта активна - архивирует. Если заархивирована - восстанавливает.
 */
export async function PATCH(request, { params }) {
  const { id } = await params;
  
  try {
    const mapService = getMapService();

    // Сначала получаем текущее состояние карты, включая архивные
    const map = await mapService.getMapById(id, { includeArchived: true });
    
    if (!map) {
      // getMapById уже вызовет NotFoundError, если нужно, но эта проверка яснее.
      // Блок catch ниже обработает эту ошибку.
      throw new NotFoundError(`Карта с ID ${id} не найдена.`);
    }
    
    let result;
    // Если поле archivedAt существует, значит карта в архиве и ее нужно восстановить
    if (map.archivedAt) {
      result = await mapService.unarchiveMap(id);
    } else {
      // Иначе - архивируем
      result = await mapService.archiveMap(id);
    }

    revalidatePath('/admin/maps');
    revalidatePath(`/admin/maps/${id}`);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, `Failed to update archive status for map ${id}`);
  }
} 