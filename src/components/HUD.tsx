import React from 'react';
import { InventorySlot, ITEM_DEFS, RemotePlayer } from '../types/game';
import { VoxelWorld } from '../game/world';
import { MiniMap } from './MiniMap';
import { Heart, Compass, Eye, Shield, Feather, Sparkles } from 'lucide-react';

interface HUDProps {
  hotbar: InventorySlot[];
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  health: number;
  maxHealth: number;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  remotePlayers: RemotePlayer[];
  world: VoxelWorld | null;
  isSpectating: boolean;
  spectatingTargetName?: string;
  onExitSpectator: () => void;
  isFlying: boolean;
  isSneaking: boolean;
  onlineCount: number;
  onOpenInventory: () => void;
  onOpenChat: () => void;
  onOpenSpectator: () => void;
  onOpenMultiplayer: () => void;
  gameTime: number; // 0 to 24000
  weather: 'clear' | 'rain' | 'snow' | 'thunderstorm';
  onChangeWeather: (w: 'clear' | 'rain' | 'snow' | 'thunderstorm') => void;
}

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  selectedSlot,
  onSelectSlot,
  health,
  maxHealth,
  playerPos,
  playerYaw,
  remotePlayers,
  world,
  isSpectating,
  spectatingTargetName,
  onExitSpectator,
  isFlying,
  isSneaking,
  onlineCount,
  onOpenInventory,
  onOpenChat,
  onOpenSpectator,
  onOpenMultiplayer,
  gameTime,
  weather,
  onChangeWeather,
}) => {
  const [showWeatherMenu, setShowWeatherMenu] = React.useState(false);
  const activeItem = hotbar[selectedSlot];
  const itemDef = activeItem && activeItem.id ? ITEM_DEFS[activeItem.id] : null;

  // Day/Night indicator
  const isNight = gameTime > 13000 && gameTime < 23000;

  const weatherIcons: Record<string, { label: string; icon: string }> = {
    clear: { label: 'Ясно', icon: '☀️' },
    rain: { label: 'Дождь', icon: '🌧️' },
    snow: { label: 'Снег', icon: '❄️' },
    thunderstorm: { label: 'Гроза', icon: '⚡' },
  };

  const currentWeatherInfo = weatherIcons[weather] || weatherIcons.clear;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 select-none">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between">
        {/* Left: Player Stats & Coords */}
        <div className="pointer-events-auto flex flex-col gap-2">
          {/* Coordinates & Biome */}
          <div className="mc-panel-dark flex items-center gap-2 rounded px-3 py-1.5 text-xs text-stone-200 backdrop-blur-md">
            <Compass className="h-4 w-4 text-emerald-400" />
            <span className="font-mono font-bold tracking-wide">
              X: {Math.round(playerPos.x)} | Y: {Math.round(playerPos.y)} | Z: {Math.round(playerPos.z)}
            </span>
            <span className="ml-1 rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-300">
              {isNight ? '🌙 Ночь' : '☀️ День'}
            </span>

            {/* Weather Button */}
            <div className="relative">
              <button
                onClick={() => setShowWeatherMenu(!showWeatherMenu)}
                className="flex items-center gap-1 rounded bg-sky-900/60 hover:bg-sky-800/80 px-2 py-0.5 text-[10px] text-sky-200 transition-colors cursor-pointer border border-sky-500/40"
                title="Сменить погоду"
              >
                <span>{currentWeatherInfo.icon}</span>
                <span className="font-bold">{currentWeatherInfo.label}</span>
              </button>

              {/* Weather Popover */}
              {showWeatherMenu && (
                <div className="mc-panel absolute left-0 top-full mt-1.5 z-30 flex flex-col gap-1 p-1.5 rounded shadow-xl min-w-[120px]">
                  {(['clear', 'rain', 'snow', 'thunderstorm'] as const).map((wKey) => (
                    <button
                      key={wKey}
                      onClick={() => {
                        onChangeWeather(wKey);
                        setShowWeatherMenu(false);
                      }}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-bold text-left transition-colors cursor-pointer ${
                        weather === wKey
                          ? 'bg-emerald-600 text-white'
                          : 'hover:bg-stone-200 text-stone-800'
                      }`}
                    >
                      <span className="text-base">{weatherIcons[wKey].icon}</span>
                      <span>{weatherIcons[wKey].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Health Hearts */}
          {!isSpectating && (
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(maxHealth / 2) }).map((_, i) => {
                const heartValue = health - i * 2;
                const isFull = heartValue >= 2;
                const isHalf = heartValue === 1;
                return (
                  <Heart
                    key={i}
                    className={`h-5 w-5 drop-shadow-md transition-all ${
                      isFull
                        ? 'fill-red-500 text-red-600'
                        : isHalf
                        ? 'fill-red-400 text-red-500 opacity-80'
                        : 'fill-stone-800 text-stone-900 opacity-40'
                    }`}
                  />
                );
              })}
            </div>
          )}

          {/* Flying or Sneaking status badge */}
          <div className="flex gap-1.5">
            {isFlying && (
              <span className="rounded bg-sky-600/90 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                🕊️ Режим полета (Пробел / Shift)
              </span>
            )}
            {isSneaking && (
              <span className="rounded bg-amber-600/90 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                👟 Крадется
              </span>
            )}
          </div>
        </div>

        {/* Top Center: Spectating banner */}
        {isSpectating && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-sky-400/40 bg-sky-950/80 px-4 py-2 text-white shadow-xl backdrop-blur-md">
            <Eye className="h-5 w-5 animate-pulse text-sky-400" />
            <div>
              <div className="text-xs text-sky-200">Режим наблюдения</div>
              <div className="font-bold text-sm text-sky-300">
                Смотрим за: <span className="text-white underline">{spectatingTargetName || 'Свободный полет'}</span>
              </div>
            </div>
            <button
              onClick={onExitSpectator}
              className="mc-btn rounded px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
            >
              Выйти
            </button>
          </div>
        )}

        {/* Top Right: Action Buttons & MiniMap */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {/* Top buttons row */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenMultiplayer}
              className="mc-btn flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold shadow-md hover:brightness-110"
              title="Мир и мультиплеер по Wi-Fi"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{onlineCount}</span>
            </button>

            <button
              onClick={onOpenSpectator}
              className="mc-btn flex items-center gap-1 rounded px-2 py-1 text-xs font-bold hover:brightness-110"
              title="Наблюдать за друзьями (Клавиша V)"
            >
              <Eye className="h-3.5 w-3.5 text-sky-300" />
              <span className="hidden sm:inline">Друзья</span>
            </button>

            <button
              onClick={onOpenChat}
              className="mc-btn flex items-center gap-1 rounded px-2 py-1 text-xs font-bold hover:brightness-110"
              title="Чат (Клавиша Enter или C)"
            >
              💬 <span className="hidden sm:inline">Чат</span>
            </button>

            <button
              onClick={onOpenInventory}
              className="mc-btn-green flex items-center gap-1 rounded px-2 py-1 text-xs font-bold hover:brightness-110"
              title="Инвентарь и крафт (Клавиша E)"
            >
              🎒 <span className="hidden sm:inline">Рюкзак</span>
            </button>
          </div>

          {/* MiniMap radar */}
          <MiniMap
            playerPos={playerPos}
            playerYaw={playerYaw}
            remotePlayers={remotePlayers}
            world={world}
          />
        </div>
      </div>

      {/* Center Crosshair */}
      {!isSpectating && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-5 w-5">
            <div className="absolute left-2 top-0 h-5 w-[2px] bg-white/90 shadow-[0_0_2px_black]" />
            <div className="absolute left-0 top-2 h-[2px] w-5 bg-white/90 shadow-[0_0_2px_black]" />
            <div className="absolute left-[9px] top-[9px] h-1 w-1 bg-black/60" />
          </div>
        </div>
      )}

      {/* Bottom Area: Active item name & Hotbar */}
      <div className="flex flex-col items-center gap-1.5 pb-1">
        {/* Selected Item Label */}
        {itemDef && (
          <div className="mc-panel-dark rounded px-3 py-0.5 text-xs font-bold text-amber-300 drop-shadow backdrop-blur-sm">
            {itemDef.name}
            {itemDef.category === 'tools' && ' ⛏️'}
            {itemDef.category === 'food' && ' 🍏'}
          </div>
        )}

        {/* Hotbar Container (9 slots) */}
        <div className="pointer-events-auto mc-panel flex items-center gap-1 p-1.5 rounded-lg shadow-2xl">
          {hotbar.map((slot, index) => {
            const isSelected = selectedSlot === index;
            const def = slot && slot.id ? ITEM_DEFS[slot.id] : null;

            return (
              <button
                key={index}
                onClick={() => onSelectSlot(index)}
                className={`mc-slot relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded cursor-pointer transition-all ${
                  isSelected ? 'active scale-105' : ''
                }`}
              >
                {/* Hotkey number 1-9 */}
                <span className="absolute left-1 top-0.5 text-[9px] font-bold text-stone-300/70 select-none">
                  {index + 1}
                </span>

                {/* Item Graphic */}
                {def ? (
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="h-6 w-6 rounded shadow-inner border border-black/30 flex items-center justify-center text-[10px]"
                      style={{ backgroundColor: def.iconColor }}
                    >
                      {def.isBlock ? '🧱' : def.category === 'tools' ? '⛏️' : def.category === 'food' ? '🍏' : '✨'}
                    </div>
                    {/* Item count */}
                    {slot.count > 1 && (
                      <span className="font-pixel absolute bottom-0.5 right-1 text-[10px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
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
  );
};
