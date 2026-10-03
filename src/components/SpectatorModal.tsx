import React from 'react';
import { RemotePlayer, PLAYER_SKINS } from '../types/game';
import { X, Eye, Navigation, Zap, Compass, Users } from 'lucide-react';

interface SpectatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: RemotePlayer[];
  myPos: { x: number; y: number; z: number };
  onStartSpectating: (targetPlayer: RemotePlayer | null) => void;
  onTeleportTo: (x: number, y: number, z: number) => void;
  isCurrentlySpectating: boolean;
  currentSpectatingId: string | null;
  onToggleFreeFly: () => void;
  isFreeFlying: boolean;
}

export const SpectatorModal: React.FC<SpectatorModalProps> = ({
  isOpen,
  onClose,
  players,
  myPos,
  onStartSpectating,
  onTeleportTo,
  isCurrentlySpectating,
  currentSpectatingId,
  onToggleFreeFly,
  isFreeFlying,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="mc-panel flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-stone-400 pb-2">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-sky-600" />
            <h2 className="font-pixel text-xs sm:text-sm font-bold text-stone-800">
              Наблюдение за друзьями
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mc-btn flex h-7 w-7 items-center justify-center rounded text-stone-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Bar for Free Flight */}
        <div className="my-3 flex items-center justify-between rounded-lg bg-stone-300/70 p-3 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕊️</span>
            <div>
              <div className="text-xs font-bold text-stone-800">Режим призрака (Свободный полет)</div>
              <div className="text-[10px] text-stone-600">Летайте сквозь блоки и исследуйте пещеры</div>
            </div>
          </div>
          <button
            onClick={onToggleFreeFly}
            className={`mc-btn rounded px-3 py-1.5 text-xs font-bold ${
              isFreeFlying ? 'bg-amber-600 text-white' : ''
            }`}
          >
            {isFreeFlying ? 'Отключить полет' : 'Включить полет'}
          </button>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-stone-700">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>Друзья в этом мире ({players.length}):</span>
          </div>

          {players.length === 0 ? (
            <div className="rounded-lg bg-stone-100 p-6 text-center text-xs text-stone-500 shadow-inner">
              <p className="font-bold">Пока других игроков в этом мире нет.</p>
              <p className="mt-1">
                Подключите второй компьютер или планшет к вашему Wi-Fi и откройте эту же ссылку!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {players.map((p) => {
                const skinObj = PLAYER_SKINS.find((s) => s.id === p.skin);
                const emoji = skinObj ? skinObj.emoji : '🧔';
                const dist = Math.round(
                  Math.sqrt(
                    Math.pow(p.x - myPos.x, 2) +
                      Math.pow(p.y - myPos.y, 2) +
                      Math.pow(p.z - myPos.z, 2)
                  )
                );
                const isTarget = currentSpectatingId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg border p-3 shadow transition-all ${
                      isTarget
                        ? 'border-sky-500 bg-sky-100/90'
                        : 'border-stone-300 bg-white/90 hover:bg-stone-50'
                    }`}
                  >
                    {/* Player Info */}
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900">{p.name}</span>
                          <span className="text-[10px] rounded bg-stone-200 px-1.5 py-0.5 text-stone-700">
                            {dist} м от вас
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          X: {Math.round(p.x)} Y: {Math.round(p.y)} Z: {Math.round(p.z)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Teleport Button */}
                      <button
                        onClick={() => {
                          onTeleportTo(p.x, p.y + 1, p.z);
                          onClose();
                        }}
                        className="mc-btn flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-bold text-emerald-200 hover:text-white"
                        title="Телепортироваться к другу"
                      >
                        <Zap className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">К нему</span>
                      </button>

                      {/* Spectate Button */}
                      <button
                        onClick={() => {
                          if (isTarget) {
                            onStartSpectating(null);
                          } else {
                            onStartSpectating(p);
                            onClose();
                          }
                        }}
                        className={`mc-btn flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold ${
                          isTarget ? 'bg-sky-600 text-white' : 'text-sky-200 hover:text-white'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-400" />
                        <span>{isTarget ? 'Остановить' : 'Наблюдать'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
