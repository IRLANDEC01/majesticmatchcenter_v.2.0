// Этот файл служит центральной точкой для регистрации всех моделей Mongoose.
// Импортируя этот файл (например, в jest.setup.js), мы гарантируем,
// что Mongoose знает обо всех схемах до того, как начнутся операции с базой данных.

import Family from './family/Family';
import FamilyEarning from './family/FamilyEarning';
import FamilyRatingHistory from './family/FamilyRatingHistory';
import FamilyStats from './family/FamilyStats';
import FamilyMapParticipation from './family/FamilyMapParticipation';
import FamilyTournamentParticipation from './family/FamilyTournamentParticipation';

import Map from './map/Map';
import MapTemplate from './map/MapTemplate';

import Player from './player/Player';
import PlayerAchievement from './player/PlayerAchievement';
import PlayerFamilyHistory from './player/PlayerFamilyHistory';
import PlayerMapParticipation from './player/PlayerMapParticipation';
import PlayerStats from './player/PlayerStats';
import PlayerTournamentParticipation from './player/PlayerTournamentParticipation';

import Tournament from './tournament/Tournament';
import TournamentTemplate from './tournament/TournamentTemplate';

// Импортируем для регистрации, но не экспортируем, т.к. это sub-document схемы
import './shared/earnings-schema';
import './shared/seo-schema';
import './shared/social-link-schema';
import './shared/weapon-stat-schema';

const models = {
  Family,
  FamilyEarning,
  FamilyRatingHistory,
  FamilyStats,
  FamilyMapParticipation,
  FamilyTournamentParticipation,
  Map,
  MapTemplate,
  Player,
  PlayerAchievement,
  PlayerFamilyHistory,
  PlayerMapParticipation,
  PlayerStats,
  PlayerTournamentParticipation,
  Tournament,
  TournamentTemplate,
};

export default models; 