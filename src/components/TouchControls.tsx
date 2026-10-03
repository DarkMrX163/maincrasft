import React, { useRef, useState, useEffect } from 'react';

interface TouchControlsProps {
  onMoveChange: (move: { forward: number; strafe: number }) => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onMineStart: () => void;
  onMineEnd: () => void;
  onPlaceBlock: () => void;
  onToggleSneak: () => void;
  isSneaking: boolean;
  onToggleFly: () => void;
  isFlying: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveChange,
  onJumpStart,
  onJumpEnd,
  onMineStart,
  onMineEnd,
  onPlaceBlock,
  onToggleSneak,
  isSneaking,
  onToggleFly,
  isFlying,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });
        onMoveChange({ forward: 0, strafe: 0 });
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = rect.width / 2 - 10;
    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setStickPos({ x: dx, y: dy });

    // Normalize -1 to 1 (dy is inverted for forward)
    const strafe = dx / maxRadius;
    const forward = -dy / maxRadius;

    onMoveChange({ forward, strafe });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Left Virtual Joystick */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/40 bg-black/40 shadow-2xl backdrop-blur-sm"
        >
          {/* Thumb knob */}
          <div
            className="h-14 w-14 rounded-full border-2 border-white/80 bg-emerald-500/80 shadow-lg transition-transform duration-75 flex items-center justify-center text-white font-bold text-xs"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
            }}
          >
            🕹️
          </div>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex flex-col items-end gap-3">
        {/* Mine & Place buttons */}
        <div className="flex items-center gap-3">
          {/* Place Block */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onPlaceBlock();
            }}
            onClick={onPlaceBlock}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-600/90 text-2xl shadow-xl active:scale-95"
            title="Поставить блок"
          >
            🧱
          </button>

          {/* Mine Block */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onMineStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onMineEnd();
            }}
            onMouseDown={onMineStart}
            onMouseUp={onMineEnd}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-sky-400 bg-sky-600/90 text-3xl shadow-xl active:scale-95"
            title="Добывать блок"
          >
            ⛏️
          </button>
        </div>

        {/* Movement modifiers: Jump, Sneak, Fly */}
        <div className="flex items-center gap-2">
          {/* Toggle Fly */}
          <button
            onClick={onToggleFly}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/40 text-base shadow-lg transition-all ${
              isFlying ? 'bg-sky-500 text-white ring-2 ring-sky-300' : 'bg-black/50 text-white/80'
            }`}
            title="Режим полета"
          >
            🕊️
          </button>

          {/* Sneak */}
          <button
            onClick={onToggleSneak}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/40 text-base shadow-lg transition-all ${
              isSneaking ? 'bg-amber-500 text-white ring-2 ring-amber-300' : 'bg-black/50 text-white/80'
            }`}
            title="Красться"
          >
            👟
          </button>

          {/* Jump */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onJumpStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onJumpEnd();
            }}
            onMouseDown={onJumpStart}
            onMouseUp={onJumpEnd}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-600/90 text-2xl shadow-xl active:scale-95"
            title="Прыжок"
          >
            🦘
          </button>
        </div>
      </div>
    </div>
  );
};
