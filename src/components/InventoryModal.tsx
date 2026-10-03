import React, { useState } from 'react';
import { InventorySlot, ITEM_DEFS, BlockType, ItemId } from '../types/game';
import { findMatchingRecipe, RECIPES } from '../game/recipes';
import { sounds } from '../game/audio';
import { X, BookOpen, Sparkles, Trash2, ArrowRight } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventorySlot[]; // 36 slots: 0-8 hotbar, 9-35 main inventory
  onUpdateInventory: (newInv: InventorySlot[]) => void;
  isWorkbenchOpen?: boolean;
  currentSkinEmoji?: string;
  playerName?: string;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUpdateInventory,
  isWorkbenchOpen = false,
  currentSkinEmoji = '🧔',
  playerName = 'Игрок',
}) => {
  const [craftingGridSize, setCraftingGridSize] = useState<2 | 3>(isWorkbenchOpen ? 3 : 2);
  const [craftingGrid, setCraftingGrid] = useState<(number | null)[]>(
    new Array(isWorkbenchOpen ? 9 : 4).fill(null)
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [showRecipeBook, setShowRecipeBook] = useState(false);

  // Sync if isWorkbenchOpen changed
  React.useEffect(() => {
    const size = isWorkbenchOpen ? 3 : 2;
    setCraftingGridSize(size);
    setCraftingGrid(new Array(size * size).fill(null));
  }, [isWorkbenchOpen]);

  if (!isOpen) return null;

  // Find matching recipe for current crafting grid
  const matchedRecipe = findMatchingRecipe(craftingGrid, craftingGridSize);

  // Handle clicking on crafting grid slot
  const handleCraftSlotClick = (index: number) => {
    if (selectedSlotIndex !== null) {
      // Put one or move selected item to craft slot
      const invItem = inventory[selectedSlotIndex];
      if (invItem && invItem.count > 0) {
        const newGrid = [...craftingGrid];
        const oldGridItem = newGrid[index];

        newGrid[index] = invItem.id;
        setCraftingGrid(newGrid);

        // Deduct 1 from inventory
        const newInv = [...inventory];
        if (invItem.count > 1) {
          newInv[selectedSlotIndex] = { ...invItem, count: invItem.count - 1 };
        } else {
          newInv[selectedSlotIndex] = { id: 0, count: 0 };
          setSelectedSlotIndex(null);
        }
        onUpdateInventory(newInv);
        sounds.playBlockPlace();
      }
    } else {
      // Pick up item from craft slot back into inventory
      const gridItemId = craftingGrid[index];
      if (gridItemId) {
        const newGrid = [...craftingGrid];
        newGrid[index] = null;
        setCraftingGrid(newGrid);

        // Return to inventory
        addItemToInventory(gridItemId, 1);
        sounds.playBlockPlace();
      }
    }
  };

  // Add item to inventory helper
  const addItemToInventory = (itemId: number, count = 1) => {
    const newInv = [...inventory];
    const def = ITEM_DEFS[itemId];
    const maxStack = def ? def.maxStack : 64;

    // Try stacking
    let remaining = count;
    for (let i = 0; i < newInv.length; i++) {
      if (newInv[i].id === itemId && newInv[i].count < maxStack) {
        const canAdd = Math.min(remaining, maxStack - newInv[i].count);
        newInv[i].count += canAdd;
        remaining -= canAdd;
        if (remaining <= 0) break;
      }
    }

    // Try empty slot
    if (remaining > 0) {
      for (let i = 0; i < newInv.length; i++) {
        if (!newInv[i].id || newInv[i].count === 0) {
          newInv[i] = { id: itemId, count: remaining };
          remaining = 0;
          break;
        }
      }
    }

    onUpdateInventory(newInv);
  };

  // Craft output slot click
  const handleCraftResultClick = () => {
    if (!matchedRecipe) return;

    // Check if inventory has room
    addItemToInventory(matchedRecipe.result.id, matchedRecipe.result.count);
    sounds.playCraftSuccess();

    // Consume items from grid
    const newGrid = craftingGrid.map((item) => (item ? null : null)); // consumes 1 of each
    setCraftingGrid(newGrid);
  };

  // Click on inventory slot
  const handleInventorySlotClick = (slotIdx: number) => {
    if (selectedSlotIndex === null) {
      if (inventory[slotIdx] && inventory[slotIdx].id > 0) {
        setSelectedSlotIndex(slotIdx);
        sounds.playStep();
      }
    } else if (selectedSlotIndex === slotIdx) {
      // Deselect
      setSelectedSlotIndex(null);
    } else {
      // Swap or stack
      const newInv = [...inventory];
      const from = newInv[selectedSlotIndex];
      const to = newInv[slotIdx];

      if (from.id === to.id && to.id > 0) {
        // Stack together
        const def = ITEM_DEFS[to.id];
        const maxStack = def ? def.maxStack : 64;
        const available = maxStack - to.count;
        const add = Math.min(available, from.count);
        to.count += add;
        from.count -= add;
        if (from.count <= 0) {
          newInv[selectedSlotIndex] = { id: 0, count: 0 };
          setSelectedSlotIndex(null);
        }
      } else {
        // Swap slots
        newInv[slotIdx] = from;
        newInv[selectedSlotIndex] = to;
        setSelectedSlotIndex(null);
      }
      onUpdateInventory(newInv);
      sounds.playBlockPlace();
    }
  };

  // Fast recipe autofill
  const handleApplyRecipe = (rec: any) => {
    // Switch to required grid size if needed
    if (rec.gridWidth === 3 && craftingGridSize === 2) {
      setCraftingGridSize(3);
    }
    const targetSize = rec.gridWidth === 3 ? 3 : craftingGridSize;
    const newGrid = new Array(targetSize * targetSize).fill(null);

    // Check if player has required items
    let hasAll = true;
    const requiredMap = new Map<number, number>();
    for (const item of rec.pattern) {
      if (item) {
        requiredMap.set(item, (requiredMap.get(item) || 0) + 1);
      }
    }

    const availableMap = new Map<number, number>();
    inventory.forEach((s) => {
      if (s.id > 0) {
        availableMap.set(s.id, (availableMap.get(s.id) || 0) + s.count);
      }
    });

    requiredMap.forEach((need, id) => {
      if ((availableMap.get(id) || 0) < need) {
        hasAll = false;
      }
    });

    if (!hasAll) {
      // Cannot craft full recipe yet
      return;
    }

    // Deduct from inventory and place in grid
    const tempInv = [...inventory];
    for (let i = 0; i < rec.pattern.length; i++) {
      const neededId = rec.pattern[i];
      if (neededId) {
        // Find in tempInv
        for (let j = 0; j < tempInv.length; j++) {
          if (tempInv[j].id === neededId && tempInv[j].count > 0) {
            tempInv[j].count--;
            if (tempInv[j].count === 0) tempInv[j].id = 0;
            newGrid[i] = neededId;
            break;
          }
        }
      }
    }

    setCraftingGrid(newGrid);
    onUpdateInventory(tempInv);
    sounds.playCraftSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="mc-panel flex max-h-[95vh] w-full max-w-2xl flex-col rounded-xl p-3 sm:p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-stone-400 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎒</span>
            <h2 className="font-pixel text-xs sm:text-sm font-bold text-stone-800">
              {craftingGridSize === 3 ? 'Верстак (Крафт 3х3)' : 'Инвентарь игрока'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecipeBook(!showRecipeBook)}
              className="mc-btn flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold"
            >
              <BookOpen className="h-4 w-4 text-amber-300" />
              <span>Рецепты</span>
            </button>
            <button
              onClick={onClose}
              className="mc-btn flex h-7 w-7 items-center justify-center rounded text-stone-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="my-3 flex flex-1 flex-col gap-4 overflow-y-auto">
          {/* Top Section: Character Preview & Crafting Grid */}
          <div className="flex flex-wrap items-center justify-around gap-4 rounded bg-stone-300/60 p-3 shadow-inner">
            {/* Character Doll */}
            <div className="flex flex-col items-center justify-center rounded bg-stone-400/50 p-3 shadow">
              <span className="text-4xl animate-bounce">{currentSkinEmoji}</span>
              <span className="mt-1 text-xs font-bold text-stone-700">{playerName}</span>
            </div>

            {/* Crafting Grid & Output */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="mb-1 text-[11px] font-bold text-stone-700">
                  Сетка крафта ({craftingGridSize}x{craftingGridSize})
                </div>
                <div
                  className="grid gap-1.5 p-1 rounded bg-stone-400/60"
                  style={{
                    gridTemplateColumns: `repeat(${craftingGridSize}, minmax(0, 1fr))`,
                  }}
                >
                  {craftingGrid.map((itemId, idx) => {
                    const def = itemId ? ITEM_DEFS[itemId] : null;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleCraftSlotClick(idx)}
                        className="mc-slot flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded cursor-pointer transition-all hover:scale-105"
                      >
                        {def ? (
                          <div
                            className="h-7 w-7 rounded border border-black/40 flex items-center justify-center text-xs shadow-inner"
                            style={{ backgroundColor: def.iconColor }}
                            title={def.name}
                          >
                            {def.isBlock ? '🧱' : '✨'}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-6 w-6 text-stone-600 animate-pulse" />

              {/* Crafting Result Slot */}
              <div className="flex flex-col items-center">
                <div className="mb-1 text-[11px] font-bold text-stone-700">Результат</div>
                <button
                  onClick={handleCraftResultClick}
                  disabled={!matchedRecipe}
                  className={`mc-slot relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded transition-all ${
                    matchedRecipe ? 'border-amber-400 shadow-[0_0_12px_rgba(250,204,21,0.8)] scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  {matchedRecipe && (
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="h-8 w-8 rounded border border-black/40 flex items-center justify-center text-sm shadow-inner"
                        style={{
                          backgroundColor:
                            ITEM_DEFS[matchedRecipe.result.id]?.iconColor || '#38bdf8',
                        }}
                        title={ITEM_DEFS[matchedRecipe.result.id]?.name}
                      >
                        {ITEM_DEFS[matchedRecipe.result.id]?.isBlock ? '🧱' : '⭐'}
                      </div>
                      <span className="font-pixel absolute bottom-1 right-1 text-xs font-bold text-white drop-shadow">
                        {matchedRecipe.result.count}
                      </span>
                    </div>
                  )}
                </button>
                {matchedRecipe && (
                  <span className="mt-1 text-[10px] font-bold text-emerald-800">
                    {ITEM_DEFS[matchedRecipe.result.id]?.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recipe Book Helper Drawer */}
          {showRecipeBook && (
            <div className="rounded border border-amber-500/50 bg-amber-50/90 p-3 shadow">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Книга рецептов (нажмите для авто-крафта):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                {RECIPES.map((rec) => {
                  const resDef = ITEM_DEFS[rec.result.id];
                  return (
                    <button
                      key={rec.id}
                      onClick={() => handleApplyRecipe(rec)}
                      className="flex items-center gap-2 rounded border border-amber-300 bg-white p-1.5 text-left text-xs hover:bg-amber-100 transition-colors shadow-sm"
                    >
                      <div
                        className="h-6 w-6 rounded border border-black/30 flex items-center justify-center text-[10px] shrink-0"
                        style={{ backgroundColor: resDef?.iconColor || '#e2e8f0' }}
                      >
                        {resDef?.isBlock ? '🧱' : '✨'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate text-[11px] text-stone-800">
                          {rec.name}
                        </div>
                        <div className="text-[9px] text-stone-500">x{rec.result.count}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Inventory Slots (27 slots: index 9 to 35) */}
          <div>
            <div className="mb-1 text-[11px] font-bold text-stone-700">Основной рюкзак</div>
            <div className="grid grid-cols-9 gap-1 sm:gap-1.5 rounded bg-stone-400/60 p-1.5">
              {inventory.slice(9, 36).map((slot, idx) => {
                const actualIndex = 9 + idx;
                const def = slot && slot.id ? ITEM_DEFS[slot.id] : null;
                const isSelected = selectedSlotIndex === actualIndex;

                return (
                  <button
                    key={actualIndex}
                    onClick={() => handleInventorySlotClick(actualIndex)}
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

          {/* Hotbar Slots (9 slots: index 0 to 8) */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-stone-700">
              <span>Панель быстрого доступа (Хотбар 1-9)</span>
              {selectedSlotIndex !== null && (
                <span className="text-amber-800 animate-pulse">
                  Выбран слот #{selectedSlotIndex + 1} (нажмите куда переместить)
                </span>
              )}
            </div>
            <div className="grid grid-cols-9 gap-1 sm:gap-1.5 rounded bg-stone-500/70 p-1.5 border-2 border-stone-600">
              {inventory.slice(0, 9).map((slot, idx) => {
                const def = slot && slot.id ? ITEM_DEFS[slot.id] : null;
                const isSelected = selectedSlotIndex === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => handleInventorySlotClick(idx)}
                    className={`mc-slot relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded cursor-pointer transition-all ${
                      isSelected ? 'active scale-105' : 'hover:scale-105'
                    }`}
                  >
                    <span className="absolute left-1 top-0.5 text-[8px] font-bold text-stone-300">
                      {idx + 1}
                    </span>
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
    </div>
  );
};
