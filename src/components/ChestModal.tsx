import React, { useState } from 'react';
import { InventorySlot, ITEM_DEFS } from '../types/game';
import { ChestContent } from '../game/world';
import { sounds } from '../game/audio';
import { X, Archive, ArrowDownUp } from 'lucide-react';

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  chestPos: { x: number; y: number; z: number };
  chestItems: ChestContent[];
  onUpdateChestItems: (items: ChestContent[]) => void;
  playerInventory: InventorySlot[];
  onUpdatePlayerInventory: (newInv: InventorySlot[]) => void;
}

export const ChestModal: React.FC<ChestModalProps> = ({
  isOpen,
  onClose,
  chestPos,
  chestItems,
  onUpdateChestItems,
  playerInventory,
  onUpdatePlayerInventory,
}) => {
  const [selectedSource, setSelectedSource] = useState<'chest' | 'inventory' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  // Convert array of ChestContent to 27 slots array
  const chestSlots: (ChestContent | null)[] = new Array(27).fill(null);
  chestItems.forEach((item) => {
    if (item.slot >= 0 && item.slot < 27) {
      chestSlots[item.slot] = item;
    }
  });

  const handleChestSlotClick = (slotIdx: number) => {
    if (selectedSource === 'inventory' && selectedIndex !== null) {
      // Transfer from player inventory to chest
      const invItem = playerInventory[selectedIndex];
      if (invItem && invItem.count > 0) {
        const newChestItems = [...chestItems.filter((i) => i.slot !== slotIdx)];
        newChestItems.push({
          id: invItem.id,
          count: invItem.count,
          slot: slotIdx,
        });

        const newInv = [...playerInventory];
        newInv[selectedIndex] = { id: 0, count: 0 };

        onUpdateChestItems(newChestItems);
        onUpdatePlayerInventory(newInv);
        setSelectedSource(null);
        setSelectedIndex(null);
        sounds.playBlockPlace();
      }
    } else if (selectedSource === 'chest' && selectedIndex === slotIdx) {
      setSelectedSource(null);
      setSelectedIndex(null);
    } else {
      // Select chest slot
      const item = chestSlots[slotIdx];
      if (item && item.count > 0) {
        setSelectedSource('chest');
        setSelectedIndex(slotIdx);
        sounds.playStep();
      }
    }
  };

  const handleInventorySlotClick = (slotIdx: number) => {
    if (selectedSource === 'chest' && selectedIndex !== null) {
      // Transfer from chest to player inventory
      const chestItem = chestSlots[selectedIndex];
      if (chestItem && chestItem.count > 0) {
        const newChestItems = chestItems.filter((i) => i.slot !== selectedIndex);
        const newInv = [...playerInventory];

        const destItem = newInv[slotIdx];
        if (!destItem.id || destItem.count === 0) {
          newInv[slotIdx] = { id: chestItem.id, count: chestItem.count };
          onUpdateChestItems(newChestItems);
          onUpdatePlayerInventory(newInv);
          sounds.playChestOpen();
        } else if (destItem.id === chestItem.id) {
          destItem.count += chestItem.count;
          onUpdateChestItems(newChestItems);
          onUpdatePlayerInventory(newInv);
          sounds.playChestOpen();
        }

        setSelectedSource(null);
        setSelectedIndex(null);
      }
    } else if (selectedSource === 'inventory' && selectedIndex === slotIdx) {
      setSelectedSource(null);
      setSelectedIndex(null);
    } else {
      const item = playerInventory[slotIdx];
      if (item && item.count > 0) {
        setSelectedSource('inventory');
        setSelectedIndex(slotIdx);
        sounds.playStep();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="mc-panel flex max-h-[95vh] w-full max-w-2xl flex-col rounded-xl p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-stone-400 pb-2">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-800" />
            <h2 className="font-pixel text-xs sm:text-sm font-bold text-stone-800">
              Общий сундук ({chestPos.x}, {chestPos.y}, {chestPos.z})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mc-btn flex h-7 w-7 items-center justify-center rounded text-stone-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chest Slots (27 slots: 3 rows of 9) */}
        <div className="my-3">
          <div className="mb-1 text-xs font-bold text-amber-900">Содержимое сундука:</div>
          <div className="grid grid-cols-9 gap-1 sm:gap-1.5 rounded bg-amber-950/30 p-2 border-2 border-amber-900/40">
            {chestSlots.map((item, idx) => {
              const def = item ? ITEM_DEFS[item.id] : null;
              const isSelected = selectedSource === 'chest' && selectedIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => handleChestSlotClick(idx)}
                  className={`mc-slot relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded cursor-pointer transition-all ${
                    isSelected ? 'active scale-105' : 'hover:scale-105'
                  }`}
                >
                  {def ? (
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="h-6 w-6 rounded border border-black/30 flex items-center justify-center text-[10px] shadow-inner"
                        style={{ backgroundColor: def.iconColor }}
                        title={def.name}
                      >
                        {def.isBlock ? '🧱' : def.category === 'tools' ? '⛏️' : def.category === 'food' ? '🍏' : '✨'}
                      </div>
                      {item && item.count > 1 && (
                        <span className="font-pixel absolute bottom-0.5 right-1 text-[9px] font-bold text-white drop-shadow">
                          {item.count}
                        </span>
                      )}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center py-1 text-xs font-bold text-stone-600">
          <ArrowDownUp className="h-4 w-4 mr-1 text-emerald-600" />
          <span>Нажмите на предмет, затем на слот куда хотите переложить</span>
        </div>

        {/* Player Inventory Slots */}
        <div className="my-2">
          <div className="mb-1 text-xs font-bold text-stone-700">Ваш инвентарь:</div>
          <div className="grid grid-cols-9 gap-1 sm:gap-1.5 rounded bg-stone-400/60 p-2">
            {playerInventory.map((slot, idx) => {
              const def = slot && slot.id ? ITEM_DEFS[slot.id] : null;
              const isSelected = selectedSource === 'inventory' && selectedIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => handleInventorySlotClick(idx)}
                  className={`mc-slot relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded cursor-pointer transition-all ${
                    isSelected ? 'active scale-105' : 'hover:scale-105'
                  }`}
                >
                  {def ? (
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="h-6 w-6 rounded border border-black/30 flex items-center justify-center text-[10px] shadow-inner"
                        style={{ backgroundColor: def.iconColor }}
                        title={def.name}
                      >
                        {def.isBlock ? '🧱' : def.category === 'tools' ? '⛏️' : def.category === 'food' ? '🍏' : '✨'}
                      </div>
                      {slot.count > 1 && (
                        <span className="font-pixel absolute bottom-0.5 right-1 text-[9px] font-bold text-white drop-shadow">
                          {slot.count}
                        </span>
                      )}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
