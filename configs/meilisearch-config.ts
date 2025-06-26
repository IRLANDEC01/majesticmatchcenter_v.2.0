import { HydratedDocument } from 'mongoose';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';

type LeanDoc<T> = Omit<HydratedDocument<T>, '_id'> & { _id: string };

export interface MeiliIndexConfig {
  indexName: string;
  modelName: string;
  primaryKey?: string;
  searchableAttributes: string[];
  filterableAttributes?: string[];
  sortableAttributes?: string[];
  buildSearchEntry: (doc: any) => Record<string, any>;
}

export const meilisearchConfig: Record<string, MeiliIndexConfig> = {
  mapTemplates: {
    indexName: 'map_templates',
    modelName: 'MapTemplate',
    primaryKey: 'id',
    searchableAttributes: ['name', 'description'],
    filterableAttributes: ['isArchived'],
    sortableAttributes: ['name', 'createdAt', 'updatedAt'],
    buildSearchEntry: (doc: LeanDoc<IMapTemplate>) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      isArchived: doc.archivedAt != null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }),
  },
  tournamentTemplates: {
    indexName: 'tournament_templates',
    modelName: 'TournamentTemplate',
    primaryKey: 'id',
    searchableAttributes: ['name', 'description'],
    filterableAttributes: ['isArchived'],
    sortableAttributes: ['createdAt', 'updatedAt'],
    buildSearchEntry: (doc: LeanDoc<ITournamentTemplate>) => {
      return {
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description,
        isArchived: doc.archivedAt != null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    },
  },
  // TODO: Добавить сюда конфигурации для 'players', 'families', 'tournaments' и т.д.
}; 