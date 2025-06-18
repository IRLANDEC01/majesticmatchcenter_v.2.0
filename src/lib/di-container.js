import { MapService } from './domain/maps/map-service';
import { RatingService } from './domain/ratings/rating-service';
import { StatisticsService } from './domain/statistics/statistics-service';
import { AchievementService } from './domain/achievements/achievement-service';

import { mapRepo } from './repos/maps/map-repo';
import { tournamentRepo } from './repos/tournaments/tournament-repo';
import { mapTemplateRepo } from './repos/map-templates/map-template-repo';
import { familyRepo } from './repos/families/family-repo';
import { playerRepo } from './repos/players/player-repo';
import { playerMapParticipationRepo } from './repos/statistics/player-map-participation-repo';
import { familyMapParticipationRepo } from './repos/statistics/family-map-participation-repo';
import { playerStatsRepo } from './repos/statistics/player-stats-repo';

class DiContainer {
  constructor() {
    this.services = {};
    this.repos = {
      mapRepo,
      tournamentRepo,
      mapTemplateRepo,
      familyRepo,
      playerRepo,
      playerMapParticipationRepo,
      familyMapParticipationRepo,
      playerStatsRepo,
    };
    this.registerServices();
  }

  registerServices() {
    this.services.achievementService = new AchievementService();

    this.services.ratingService = new RatingService({
      familyRepo: this.repos.familyRepo,
      playerRepo: this.repos.playerRepo,
      playerMapParticipationRepo: this.repos.playerMapParticipationRepo,
      familyMapParticipationRepo: this.repos.familyMapParticipationRepo,
    });
    
    this.services.statisticsService = new StatisticsService({
      playerRepo: this.repos.playerRepo,
      playerMapParticipationRepo: this.repos.playerMapParticipationRepo,
      familyMapParticipationRepo: this.repos.familyMapParticipationRepo,
      playerStatsRepo: this.repos.playerStatsRepo,
    });

    this.services.mapService = new MapService(
      { ...this.repos },
      {
        ratingService: this.services.ratingService,
        statisticsService: this.services.statisticsService,
        achievementService: this.services.achievementService,
      }
    );
  }

  get(name) {
    if (this.services[name]) {
      return this.services[name];
    }
    if (this.repos[name]) {
      return this.repos[name];
    }
    throw new Error(`Service or repository with name "${name}" not found.`);
  }
}

const container = new DiContainer();

export default container; 