import React, { useRef, useEffect, useState } from 'react';
import { RemotePlayer, BlockType, PLAYER_SKINS } from '../types/game';
import { VoxelWorld } from '../game/world';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

interface MiniMapProps {
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  remotePlayers: RemotePlayer[];
  world: VoxelWorld | null;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerPos,
  playerYaw,
  remotePlayers,
  world,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // Keep latest props in refs to avoid re-triggering the RAF effect
  const propsRef = useRef({ playerPos, playerYaw, remotePlayers, world, zoom });
  propsRef.current = { playerPos, playerYaw, remotePlayers, world, zoom };

  useEffect(() => {
    let animId: number;
    let lastRenderTime = 0;

    const blockColors: Record<number, string> = {
      [BlockType.GRASS]: '#4f8a2e',
      [BlockType.DIRT]: '#7c5837',
      [BlockType.OAK_LEAVES]: '#2d5e18',
      [BlockType.OAK_LOG]: '#8c683b',
      [BlockType.PLANKS]: '#8c683b',
      [BlockType.WATER]: '#2563eb',
      [BlockType.SAND]: '#d4c287',
      [BlockType.STONE]: '#6e6e6e',
      [BlockType.COBBLESTONE]: '#4d4d4d',
      [BlockType.BRICKS]: '#944b3c',
      [BlockType.CHEST]: '#f59e0b',
      [BlockType.CRAFTING_TABLE]: '#a16207',
      [BlockType.RED_FLOWER]: '#ef4444',
      [BlockType.YELLOW_FLOWER]: '#facc15',
      [BlockType.DIAMOND_ORE]: '#38bdf8',
      [BlockType.GOLD_ORE]: '#fde047',
      [BlockType.IRON_ORE]: '#e2b694',
      [BlockType.COAL_ORE]: '#18181b',
      [BlockType.TNT]: '#dc2626',
    };

    const drawMiniMap = () => {
      const canvas = canvasRef.current;
      const { playerPos: pPos, playerYaw: pYaw, remotePlayers: rPlayers, world: w, zoom: z } = propsRef.current;
      if (!canvas || !w) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      const blockRadius = Math.round(18 / z);
      const pxPerBlock = width / (blockRadius * 2);

      // Dark background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      const pX = Math.round(pPos.x);
      const pZ = Math.round(pPos.z);

      // Fast O(1) top-down terrain scanning with step of 2 blocks for peak performance
      for (let dx = -blockRadius; dx <= blockRadius; dx += 2) {
        for (let dz = -blockRadius; dz <= blockRadius; dz += 2) {
          const worldX = pX + dx;
          const worldZ = pZ + dz;

          const topBlock = w.getTopBlock(worldX, worldZ);
          if (topBlock !== BlockType.AIR) {
            ctx.fillStyle = blockColors[topBlock] || '#475569';
            const drawX = centerX + dx * pxPerBlock;
            const drawY = centerY + dz * pxPerBlock;
            ctx.fillRect(drawX, drawY, Math.ceil(pxPerBlock * 2), Math.ceil(pxPerBlock * 2));
          }
        }
      }

      // Draw chests as bright pins
      w.chests.forEach((_, key) => {
        const [cx, , cz] = key.split(',').map(Number);
        const dx = cx - pX;
        const dz = cz - pZ;
        if (Math.abs(dx) <= blockRadius && Math.abs(dz) <= blockRadius) {
          const drawX = centerX + dx * pxPerBlock;
          const drawY = centerY + dz * pxPerBlock;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(drawX, drawY, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw remote players
      rPlayers.forEach((p) => {
        const dx = p.x - pX;
        const dz = p.z - pZ;
        if (Math.abs(dx) <= blockRadius && Math.abs(dz) <= blockRadius) {
          const drawX = centerX + dx * pxPerBlock;
          const drawY = centerY + dz * pxPerBlock;
          const skinObj = PLAYER_SKINS.find((s) => s.id === p.skin);

          ctx.fillStyle = skinObj?.bodyColor || '#38bdf8';
          ctx.beginPath();
          ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = 'bold 9px Rubik, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(p.name, drawX, drawY - 6);
        }
      });

      // Player view cone & center pointer
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-pYaw);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 18, -Math.PI / 4, Math.PI / 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(4, 4);
      ctx.lineTo(0, 2);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // North indicator
      ctx.font = 'bold 9px Press Start 2P, monospace';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('N', centerX, 12);
    };

    const render = (time: number) => {
      // Throttle canvas draw to max 8 times per second (125ms interval) to preserve 60 FPS
      if (time - lastRenderTime > 125) {
        lastRenderTime = time;
        drawMiniMap();
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []); // Run continuous loop once without teardown!

  const getDepthLabel = (y: number) => {
    if (y > 6) return '🌲 Равнины';
    if (y > 0) return '🏖️ Побережье';
    if (y > -14) return '🪨 Пещеры';
    return '💎 Глубины';
  };

  return (
    <div
      className={`pointer-events-auto flex flex-col gap-1 transition-all ${
        isExpanded
          ? 'fixed right-4 top-16 z-40 bg-stone-900/90 p-3 rounded-xl border-2 border-stone-600 shadow-2xl backdrop-blur-md'
          : 'relative'
      }`}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={isExpanded ? 240 : 110}
          height={isExpanded ? 240 : 110}
          className={`rounded-full border-2 border-amber-400/80 bg-stone-950/90 shadow-xl transition-all ${
            isExpanded ? 'h-56 w-56' : 'h-24 w-24'
          }`}
        />

        {/* Zoom & Expand Controls */}
        <div className="absolute right-0 top-0 flex flex-col gap-0.5 p-0.5">
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.5))}
            className="flex h-4 w-4 items-center justify-center rounded bg-stone-800/90 text-white hover:bg-stone-700 shadow text-[10px]"
            title="Приблизить"
          >
            <ZoomIn className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
            className="flex h-4 w-4 items-center justify-center rounded bg-stone-800/90 text-white hover:bg-stone-700 shadow text-[10px]"
            title="Отдалить"
          >
            <ZoomOut className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-4 w-4 items-center justify-center rounded bg-stone-800/90 text-white hover:bg-stone-700 shadow text-[10px]"
            title={isExpanded ? 'Свернуть' : 'Развернуть'}
          >
            {isExpanded ? <Minimize2 className="h-2.5 w-2.5" /> : <Maximize2 className="h-2.5 w-2.5" />}
          </button>
        </div>
      </div>

      {/* Coordinates & Biome under map */}
      <div className="mc-panel-dark flex items-center justify-between rounded px-1.5 py-0.5 text-[9px] text-stone-200">
        <span className="font-mono font-bold text-amber-300">
          {Math.round(playerPos.x)}, {Math.round(playerPos.y)}, {Math.round(playerPos.z)}
        </span>
        <span className="text-emerald-400 font-bold ml-1">{getDepthLabel(playerPos.y)}</span>
      </div>
    </div>
  );
};
