export interface MeiliIndexConfig {
  indexName: string;
  modelName: string;
  primaryKey?: string;
  searchableAttributes: string[];
  filterableAttributes?: string[];
  sortableAttributes?: string[];
}

export const meilisearchConfig: Record<string, MeiliIndexConfig> = {
  mapTemplates: {
    indexName: 'map_templates',
    modelName: 'MapTemplate',
    primaryKey: 'id',
    searchableAttributes: ['name', 'description'],
    filterableAttributes: ['isArchived'],
    sortableAttributes: ['createdAt', 'updatedAt'],
  },
  tournamentTemplates: {
    indexName: 'tournament_templates',
    modelName: 'TournamentTemplate',
    primaryKey: 'id',
    searchableAttributes: ['name', 'description'],
    filterableAttributes: ['isArchived'],
    sortableAttributes: ['createdAt', 'updatedAt'],
  },
  // TODO: Добавить сюда конфигурации для 'players', 'families', 'tournaments' и т.д.
}; 