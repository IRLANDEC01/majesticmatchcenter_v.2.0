import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import {
  createTournamentSchema,
  getTournamentsSchema,
} from '@/lib/api/schemas/tournaments/tournament-schemas';

// Import Classes
import TournamentService from '@/lib/domain/tournaments/tournament-service.js';
import TournamentRepo from '@/lib/repos/tournaments/tournament-repo';
import TournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo.js';
import FamilyRepo from '@/lib/repos/families/family-repo';
import PlayerRepo from '@/lib/repos/players/player-repo';
import FamilyTournamentParticipationRepo from '@/lib/repos/families/family-tournament-participation-repo';
import PlayerTournamentParticipationRepo from '@/lib/repos/players/player-tournament-participation-repo';
import FamilyEarningRepo from '@/lib/repos/families/family-earning-repo';
import PlayerEarningRepo from '@/lib/repos/players/player-earning-repo';

// Helper function to instantiate the service and its dependencies
function getTournamentService() {
  const tournamentRepo = new TournamentRepo();
  const tournamentTemplateRepo = new TournamentTemplateRepo();
  const familyRepo = new FamilyRepo();
  const playerRepo = new PlayerRepo();
  const familyTournamentParticipationRepo = new FamilyTournamentParticipationRepo();
  const playerTournamentParticipationRepo = new PlayerTournamentParticipationRepo();
  const familyEarningRepo = new FamilyEarningRepo();
  const playerEarningRepo = new PlayerEarningRepo();

  return new TournamentService({
    tournamentRepo,
    tournamentTemplateRepo,
    familyRepo,
    playerRepo,
    familyTournamentParticipationRepo,
    playerTournamentParticipationRepo,
    familyEarningRepo,
    playerEarningRepo,
  });
}

/**
 * POST /api/admin/tournaments
 * Создает новый турнир.
 * @param {Request} request
 */
export async function POST(request) {
  try {
    const json = await request.json();
    const validationResult = createTournamentSchema.safeParse(json);

    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const tournamentService = getTournamentService();
    const newTournament = await tournamentService.createTournament(validationResult.data);
    return NextResponse.json(newTournament, { status: 201 });
  } catch (error) {
    console.error('ERROR in POST /api/admin/tournaments:', error);
    return handleApiError(error);
  }
}

/**
 * GET /api/admin/tournaments
 * Возвращает список турниров.
 * @param {Request} request
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validationResult = getTournamentsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const tournamentService = getTournamentService();
    const tournaments = await tournamentService.getAll(validationResult.data);
    return NextResponse.json(tournaments, { status: 200 });
  } catch (error) {
    console.error('ERROR in GET /api/admin/tournaments:', error);
    return handleApiError(error);
  }
}
