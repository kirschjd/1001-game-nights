import React from 'react';

interface MapInfo {
  id: string;
  name: string;
  description?: string;
}

interface HeistCityOptionsProps {
  selectedMap: string;
  availableMaps: MapInfo[];
  isLeader: boolean;
  onMapChange: (mapId: string) => void;
}

const HeistCityOptions: React.FC<HeistCityOptionsProps> = ({
  selectedMap,
  availableMaps,
  isLeader,
  onMapChange,
}) => {
  if (!isLeader) return null;

  const selectedMapInfo = availableMaps.find(m => m.id === selectedMap);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Map Selection
      </label>
      <select
        value={selectedMap}
        onChange={(e) => onMapChange(e.target.value)}
        className="w-full px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lion"
      >
        {availableMaps.map((map) => (
          <option key={map.id} value={map.id}>{map.name}</option>
        ))}
      </select>
      {selectedMapInfo?.description && (
        <div className="text-xs text-gray-400 mt-2">
          {selectedMapInfo.description}
        </div>
      )}
    </div>
  );
};

export default HeistCityOptions;
