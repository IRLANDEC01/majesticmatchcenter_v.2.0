import TournamentTemplate, { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import BaseRepo from '../base-repo';

class TournamentTemplateRepo extends BaseRepo<ITournamentTemplate> {
  constructor() {
    super(TournamentTemplate, 'tournament-template');
  }

  async findByName(name: string) {
    return this.model.findOne({ name, archivedAt: null }).exec();
  }
}

const tournamentTemplateRepo = new TournamentTemplateRepo();
export default tournamentTemplateRepo; 