import React, { useState } from 'react';
import { PLAYER_SKINS, PlayerSkin } from '../types/game';
import { X, User, Check } from 'lucide-react';
import { sounds } from '../game/audio';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  selectedSkinId: string;
  onSaveCharacter: (name: string, skinId: string) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  playerName,
  selectedSkinId,
  onSaveCharacter,
}) => {
  const [name, setName] = useState(playerName);
  const [skinId, setSkinId] = useState(selectedSkinId);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = name.trim().slice(0, 16) || 'Игрок';
    onSaveCharacter(trimmed, skinId);
    sounds.playCraftSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="mc-panel flex max-h-[85vh] w-full max-w-md flex-col rounded-xl p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-stone-400 pb-2">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            <h2 className="font-pixel text-xs sm:text-sm font-bold text-stone-800">
              Выбор персонажа
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mc-btn flex h-7 w-7 items-center justify-center rounded text-stone-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Content */}
        <div className="my-3 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Name input */}
          <div>
            <label className="mb-1 block text-xs font-bold text-stone-700">Имя игрока:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              placeholder="Ваше имя..."
              className="w-full rounded border-2 border-stone-400 bg-white px-3 py-2 text-sm font-bold text-stone-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Skins Grid */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-stone-700">
              Выберите скин для персонажа:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PLAYER_SKINS.map((skin) => {
                const isSelected = skin.id === skinId;
                return (
                  <button
                    key={skin.id}
                    onClick={() => {
                      setSkinId(skin.id);
                      sounds.playStep();
                    }}
                    className={`flex items-center gap-2.5 rounded-lg border-2 p-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-100 shadow-md ring-2 ring-emerald-400/50'
                        : 'border-stone-300 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <span className="text-3xl select-none">{skin.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-xs text-stone-900">{skin.name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="h-3 w-3 rounded-full border border-black/20"
                          style={{ backgroundColor: skin.bodyColor }}
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-black/20"
                          style={{ backgroundColor: skin.legsColor }}
                        />
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer save */}
        <div className="mt-2 flex justify-end gap-2 border-t border-stone-300 pt-3">
          <button
            onClick={onClose}
            className="mc-btn rounded px-4 py-2 text-xs font-bold text-stone-200"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="mc-btn-green rounded px-5 py-2 text-xs font-bold text-white shadow"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
