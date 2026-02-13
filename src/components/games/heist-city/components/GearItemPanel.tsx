import React, { useState, useEffect, useCallback } from 'react';
import { MapItem as MapItemType, MapState } from '../types';
import { getAllEquipment, getEquipmentById } from '../data/equipmentLoader';

interface GearItemPanelProps {
  item: MapItemType;
  mapState: MapState;
  onMapStateChange?: (mapState: MapState) => void;
}

const GearItemPanel: React.FC<GearItemPanelProps> = ({
  item,
  mapState,
  onMapStateChange,
}) => {
  // Track equipment assignment for this gear item
  const [gearEquipment, setGearEquipment] = useState<Record<string, string>>({});

  // Initialize from mapState items
  useEffect(() => {
    const initialGearEquipment: Record<string, string> = {};
    mapState.items.forEach(mapItem => {
      if (mapItem.type === 'gear' && mapItem.properties?.selectedEquipment) {
        initialGearEquipment[mapItem.id] = mapItem.properties.selectedEquipment;
      }
    });
    setGearEquipment(initialGearEquipment);
  }, [mapState.items]);

  const updateGearEquipment = useCallback((itemId: string, equipmentId: string) => {
    setGearEquipment(prev => ({
      ...prev,
      [itemId]: equipmentId
    }));

    if (onMapStateChange) {
      const updatedItems = mapState.items.map(mapItem => {
        if (mapItem.id === itemId) {
          return {
            ...mapItem,
            properties: {
              ...mapItem.properties,
              selectedEquipment: equipmentId || undefined
            }
          };
        }
        return mapItem;
      });
      onMapStateChange({
        ...mapState,
        items: updatedItems
      });
    }
  }, [mapState, onMapStateChange]);

  const allEquipment = getAllEquipment();
  const selectedEquipmentId = gearEquipment[item.id] || '';
  const selectedEquipment = selectedEquipmentId ? getEquipmentById(selectedEquipmentId) : null;

  return (
    <div className="bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-lg">
      {/* Name and Position Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-bold text-white">Gear</h3>
        <span className="text-xs text-gray-400">
          ({item.position.x.toFixed(1)}", {item.position.y.toFixed(1)}")
        </span>
      </div>

      {/* Equipment Selection Dropdown */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-yellow-400 mb-2">Equipment:</p>
        <div className="flex gap-2">
          <select
            value={selectedEquipmentId}
            onChange={(e) => {
              updateGearEquipment(item.id, e.target.value);
            }}
            className="flex-1 px-2 py-1.5 bg-gray-800 border border-yellow-500/30 rounded text-white text-xs hover:border-yellow-500/50 focus:outline-none focus:border-yellow-500"
          >
            <option value="">-- Select Equipment --</option>
            {allEquipment.map((equip) => (
              <option key={equip.id} value={equip.id}>{equip.id}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const randomIndex = Math.floor(Math.random() * allEquipment.length);
              const randomEquip = allEquipment[randomIndex];
              updateGearEquipment(item.id, randomEquip.id);
            }}
            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors font-semibold"
            title="Select random equipment"
          >
            Random
          </button>
        </div>
      </div>

      {/* Equipment Stats Display */}
      {selectedEquipment && (
        <div className="space-y-1 text-xs text-white">
          <div className="flex justify-between">
            <span className="text-gray-400">Type:</span>
            <span className="font-semibold">{selectedEquipment.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Cost:</span>
            <span className="font-semibold">{selectedEquipment.Cost}</span>
          </div>
          {selectedEquipment.Attacks !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Attacks:</span>
              <span className="font-semibold">{selectedEquipment.Attacks}</span>
            </div>
          )}
          {selectedEquipment.Range !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Range:</span>
              <span className="font-semibold">{selectedEquipment.Range}"</span>
            </div>
          )}
          {selectedEquipment.Damage !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Damage:</span>
              <span className="font-semibold">{selectedEquipment.Damage}</span>
            </div>
          )}
          {selectedEquipment.Size !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Size:</span>
              <span className="font-semibold">{selectedEquipment.Size}</span>
            </div>
          )}
          {selectedEquipment.Description && (
            <div className="mt-2 pt-2 border-t border-yellow-500/30">
              <p className="text-gray-300 italic">{selectedEquipment.Description}</p>
            </div>
          )}
          {selectedEquipment.Notice && Object.keys(selectedEquipment.Notice).length > 0 && (
            <div className="mt-2 pt-2 border-t border-yellow-500/30">
              <p className="text-xs font-semibold text-yellow-400 mb-1">Notice:</p>
              {Object.entries(selectedEquipment.Notice).map(([key, value]) => (
                value && <div key={key} className="text-xs text-gray-300">• {key}</div>
              ))}
            </div>
          )}
          {selectedEquipment.Special && Object.keys(selectedEquipment.Special).length > 0 && (
            <div className="mt-2 pt-2 border-t border-yellow-500/30">
              <p className="text-xs font-semibold text-yellow-400 mb-1">Special:</p>
              {Object.entries(selectedEquipment.Special).map(([key, value]) => (
                value && <div key={key} className="text-xs text-gray-300">• {key}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GearItemPanel;
