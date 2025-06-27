import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';

// Классы сервисов
import MapService from '@/lib/domain/maps/map-service';
import RatingService from '@/lib/domain/ratings/rating-service';
import StatisticsService from '@/lib/domain/statistics/statistics-service';
import { AchievementService } from '@/lib/domain/achievements/achievement-service';

// Классы репозиториев
import MapRepository from '@/lib/repos/maps/map-repo';
import TournamentRepository from '@/lib/repos/tournaments/tournament-repo';
import MapTemplateRepository from '@/lib/repos/map-templates/map-template-repo';
import FamilyRepository from '@/lib/repos/families/family-repo';
import PlayerRepository from '@/lib/repos/players/player-repo';
import FamilyMapParticipationRepo from '@/lib/repos/ratings/family-map-participation-repo';
import PlayerMapParticipationRepo from '@/lib/repos/statistics/player-map-participation-repo';
import FamilyTournamentParticipationRepo from '@/lib/repos/families/family-tournament-participation-repo';
import PlayerStatsRepository from '@/lib/repos/statistics/player-stats-repo';
import PlayerRatingHistoryRepository from '@/lib/repos/ratings/player-rating-history-repo';


// Фабричная функция для создания сервиса со всеми зависимостями
function getMapService() {
  const ratingService = new RatingService({
    familyRepo: new FamilyRepository(),
    playerRepo: new PlayerRepository(),
    familyMapParticipationRepo: new FamilyMapParticipationRepo(),
    playerRatingHistoryRepo: new PlayerRatingHistoryRepository(),
    familyTournamentParticipationRepo: new FamilyTournamentParticipationRepo(),
  });
  
  const statisticsService = new StatisticsService({
    playerRepo: new PlayerRepository(),
    playerMapParticipationRepo: new PlayerMapParticipationRepo(),
    playerStatsRepo: new PlayerStatsRepository(),
  });

  return new MapService(
    {
      mapRepo: new MapRepository(),
      tournamentRepo: new TournamentRepository(),
      mapTemplateRepo: new MapTemplateRepository(),
      familyRepo: new FamilyRepository(),
      playerRepo: new PlayerRepository(),
    },
    {
      ratingService,
      statisticsService,
      achievementService: new AchievementService(),
    }
  );
}


/**
 * GET /api/admin/maps/[id]
 * Возвращает карту по ID.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  
  try {
    // Простая валидация формата ID, чтобы отсечь заведомо неверные запросы
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID карты' }, { status: 400 });
    }

    const mapService = getMapService();
    const map = await mapService.getMapById(id);

    if (!map) {
      return NextResponse.json({ message: 'Карта не найдена' }, { status: 404 });
    }

    return NextResponse.json(map);
  } catch (error) {
    return handleApiError(error, `Failed to get map ${id}`);
  }
}

/**
 * PUT /api/admin/maps/[id]
 * Обновляет существующую карту.
 */
export async function PUT(request, { params }) {
  const { id } = await params;
  
  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Некорректный ID карты' }, { status: 400 });
    }
    
    const mapService = getMapService();
    const json = await request.json();
    const updatedMap = await mapService.updateMap(id, json);

    return NextResponse.json(updatedMap);
  } catch (error) {
    return handleApiError(error, `Failed to update map ${id}`);
  }
}

/**
 * PATCH /api/admin/maps/[id]
 * Этот маршрут больше не используется для архивации.
 * Используйте /api/admin/maps/[id]/archive
 */
export async function PATCH(request, { params }) {
    return NextResponse.json(
        { message: 'This endpoint is deprecated. Use /archive or /restore instead.'}, 
        { status: 410 } // 410 Gone
    );
} 