/**
 * Примеры использования универсальной системы поиска для разных сущностей.
 * Этот файл служит документацией и reference для разработчиков.
 */

import { EntitySearch } from '@/components/ui/entity-search';
import { useState } from 'react';

// =====================================================
// ПРИМЕР 1: Поиск шаблонов карт (самый простой случай)
// =====================================================
export function MapTemplatesSearchExample() {
  const [searchResults, setSearchResults] = useState([]);

  return (
    <div>
      <EntitySearch
        entities="mapTemplates"
        placeholder="Поиск шаблонов карт..."
        onResults={(results) => setSearchResults(results)}
        className="w-full max-w-sm"
      />
      
      {/* Отображение результатов */}
      <div className="mt-4">
        {searchResults.map((template) => (
          <div key={template._id} className="p-2 border rounded">
            {template.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// ПРИМЕР 2: Поиск игроков с более сложной логикой
// =====================================================
export function PlayersSearchExample() {
  const [players, setPlayers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleResults = (results, meta) => {
    setPlayers(results);
    setIsSearching(meta.isLoading);
  };

  return (
    <div>
      <EntitySearch
        entities="players"
        onResults={handleResults}
        className="w-full max-w-md"
        minLength={3} // Для игроков требуем минимум 3 символа
      />
      
      {isSearching && <p>Поиск игроков...</p>}
      
      <div className="grid grid-cols-2 gap-4 mt-4">
        {players.map((player) => (
          <div key={player._id} className="p-4 bg-gray-100 rounded">
            <h3>{player.firstName} {player.lastName}</h3>
            <p>Рейтинг: {player.rating}</p>
            <p>Семья: {player.currentFamily?.name || 'Без семьи'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// ПРИМЕР 3: Мультипоиск по нескольким сущностям
// =====================================================
export function MultiEntitySearchExample() {
  const [allResults, setAllResults] = useState({});

  const handleResults = (results) => {
    setAllResults(results);
  };

  return (
    <div>
      <EntitySearch
        entities={['mapTemplates', 'tournamentTemplates', 'players']}
        placeholder="Глобальный поиск..."
        onResults={handleResults}
        className="w-full"
      />
      
      <div className="mt-6 grid grid-cols-3 gap-6">
        {/* Шаблоны карт */}
        <div>
          <h3 className="font-semibold mb-2">Шаблоны карт ({allResults.mapTemplates?.length || 0})</h3>
          {allResults.mapTemplates?.map((template) => (
            <div key={template._id} className="p-2 bg-blue-50 rounded mb-1">
              {template.name}
            </div>
          ))}
        </div>
        
        {/* Шаблоны турниров */}
        <div>
          <h3 className="font-semibold mb-2">Шаблоны турниров ({allResults.tournamentTemplates?.length || 0})</h3>
          {allResults.tournamentTemplates?.map((template) => (
            <div key={template._id} className="p-2 bg-green-50 rounded mb-1">
              {template.name}
            </div>
          ))}
        </div>
        
        {/* Игроки */}
        <div>
          <h3 className="font-semibold mb-2">Игроки ({allResults.players?.length || 0})</h3>
          {allResults.players?.map((player) => (
            <div key={player._id} className="p-2 bg-yellow-50 rounded mb-1">
              {player.firstName} {player.lastName}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ПРИМЕР 4: Поиск с кастомной логикой через хук
// =====================================================
import { useSearch } from '@/lib/hooks/use-search';

export function CustomSearchLogicExample() {
  // Используем только хук без UI компонента
  const {
    searchTerm,
    setSearchTerm,
    results,
    isLoading,
    clearSearch,
    hasSearch,
  } = useSearch({
    entities: 'families',
    minLength: 2,
  });

  return (
    <div>
      {/* Собственный UI */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Найти семью..."
          className="border p-2 rounded flex-1"
        />
        <button 
          onClick={clearSearch}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Очистить
        </button>
      </div>
      
      {/* Кастомная логика отображения */}
      {isLoading && <div className="mt-2 text-blue-600">Загрузка семей...</div>}
      
      {hasSearch && results.length === 0 && !isLoading && (
        <div className="mt-2 text-gray-500">
          Семьи с запросом "{searchTerm}" не найдены
        </div>
      )}
      
      <div className="mt-4 space-y-2">
        {results.map((family) => (
          <div key={family._id} className="p-3 border-l-4 border-purple-500 bg-purple-50">
            <h4 className="font-medium">{family.name}</h4>
            <p className="text-sm text-gray-600">
              Владелец: {family.owner?.firstName} {family.owner?.lastName}
            </p>
            <p className="text-sm text-gray-600">
              Участников: {family.members?.length || 0} | Рейтинг: {family.rating}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 