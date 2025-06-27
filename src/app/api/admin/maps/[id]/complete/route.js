import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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


export async function POST(request, { params }) {
  const { id } = await params;
  
  try {
    const mapService = getMapService();
    const payload = await request.json(); 

    const completedMap = await mapService.completeMap(id, payload);

    revalidatePath('/admin/maps');
    revalidatePath(`/admin/maps/${id}`);
    revalidatePath(`/admin/tournaments/${completedMap.tournament}`);

    return NextResponse.json(completedMap, { status: 200 });
  } catch (error) {
    return handleApiError(error, `Failed to complete map ${id}`);
  }
}