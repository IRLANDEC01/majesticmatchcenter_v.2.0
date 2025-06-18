// Этот файл служит центральной точкой для регистрации всех моделей Mongoose.
// Импортируя этот файл (например, в jest.setup.js), мы гарантируем,
// что Mongoose знает обо всех схемах до того, как начнутся операции с базой данных.

import Family from './family/Family.js';
import FamilyStats from './family/FamilyStats.js';
import FamilyMapParticipation from './family/FamilyMapParticipation.js';
import FamilyTournamentParticipation from './family/FamilyTournamentParticipation.js';

import MapModel from './map/Map.js';
import MapTemplate from './map/MapTemplate.js';

import Player from './player/Player.js';
import PlayerAchievement from './player/PlayerAchievement.js';
import PlayerFamilyHistory from './player/PlayerFamilyHistory.js';
import PlayerMapParticipation from './player/PlayerMapParticipation.js';
import PlayerStats from './player/PlayerStats.js';
import PlayerTournamentParticipation from './player/PlayerTournamentParticipation.js';

import Tournament from './tournament/Tournament.js';
import TournamentTemplate from './tournament/TournamentTemplate.js';

// Импортируем для регистрации, но не экспортируем, т.к. это sub-document схемы
import './shared/earnings-schema.js';
import './shared/seo-schema.js';
import './shared/social-link-schema.js';
import './shared/weapon-stat-schema.js';

const models = {
  Family,
  FamilyStats,
  FamilyMapParticipation,
  FamilyTournamentParticipation,
  Map: MapModel,
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