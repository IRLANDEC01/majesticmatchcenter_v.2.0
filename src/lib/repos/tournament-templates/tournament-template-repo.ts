import TournamentTemplate, { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import BaseRepo from '../base-repo';

class TournamentTemplateRepo extends BaseRepo<ITournamentTemplate> {
  constructor() {
    super(TournamentTemplate, 'tournament-template');
  }
}

const tournamentTemplateRepo = new TournamentTemplateRepo();
export default tournamentTemplateRepo; 