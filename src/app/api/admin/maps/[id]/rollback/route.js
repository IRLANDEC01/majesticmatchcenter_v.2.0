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
import FamilyMapParticipationRepository from '@/lib/repos/ratings/family-map-participation-repo';
import PlayerMapParticipationRepository from '@/lib/repos/statistics/player-map-participation-repo';
import FamilyTournamentParticipationRepository from '@/lib/repos/families/family-tournament-participation-repo';
import PlayerStatsRepository from '@/lib/repos/statistics/player-stats-repo';
import PlayerRatingHistoryRepository from '@/lib/repos/ratings/player-rating-history-repo';

function getMapService() {
  const mapRepo = new MapRepository();
  const tournamentRepo = new TournamentRepository();
  const mapTemplateRepo = new MapTemplateRepository();
  const familyRepo = new FamilyRepository();
  const playerRepo = new PlayerRepository();
  const familyMapParticipationRepo = new FamilyMapParticipationRepository();
  const playerMapParticipationRepo = new PlayerMapParticipationRepository();
  const familyTournamentParticipationRepo = new FamilyTournamentParticipationRepository();
  const playerStatsRepo = new PlayerStatsRepository();
  const playerRatingHistoryRepo = new PlayerRatingHistoryRepository();

  const ratingService = new RatingService({
    familyRepo,
    playerRepo,
    familyMapParticipationRepo,
    playerRatingHistoryRepo,
    familyTournamentParticipationRepo
  });
  
  const statisticsService = new StatisticsService({
    playerRepo,
    playerMapParticipationRepo,
    playerStatsRepo
  });

  return new MapService(
    { mapRepo, tournamentRepo, mapTemplateRepo, familyRepo, playerRepo },
    { ratingService, statisticsService, achievementService: new AchievementService() }
  );
}

export async function POST(request, { params }) {
  try {
    const { id: mapId } = params;
    const mapService = getMapService();

    const rolledBackMap = await mapService.rollbackMapCompletion(mapId);
    
    revalidatePath('/admin/maps');
    revalidatePath(`/admin/maps/${mapId}`);
    revalidatePath(`/admin/tournaments/${rolledBackMap.tournament}`);

    return NextResponse.json(rolledBackMap, { status: 200 });
  } catch (error) {
    return handleApiError(error, `Failed to roll back map ${params.id}`);
  }
} 