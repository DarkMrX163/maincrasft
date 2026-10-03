import React, { useRef, useEffect, useState } from 'react';
import { RemotePlayer, BlockType, PLAYER_SKINS } from '../types/game';
import { VoxelWorld } from '../game/world';
import { Compass, ZoomIn, ZoomOut, Maximize2, Minimize2, MapPin } from 'lucide-react';

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
  const [zoom, setZoom] = useState<number>(1); // 1 = 32 blocks radius, 0.5 = 64 blocks, 2 = 16 blocks
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !world) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Radius in blocks
    const blockRadius = Math.round(24 / zoom);
    const pxPerBlock = width / (blockRadius * 2);

    ctx.clearRect(0, 0, width, height);

    // Rounded background
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, width / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    // Fill background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const pX = Math.round(playerPos.x);
    const pZ = Math.round(playerPos.z);

    // Color mapper for blocks
    const getBlockColor = (type: BlockType): string => {
      switch (type) {
        case BlockType.GRASS:
          return '#4f8a2e';
        case BlockType.DIRT:
          return '#7c5837';
        case BlockType.OAK_LEAVES:
          return '#2d5e18';
        case BlockType.OAK_LOG:
        case BlockType.PLANKS:
          return '#8c683b';
        case BlockType.WATER:
          return '#2563eb';
        case BlockType.SAND:
          return '#d4c287';
        case BlockType.STONE:
          return '#6e6e6e';
        case BlockType.COBBLESTONE:
          return '#4d4d4d';
        case BlockType.BRICKS:
          return '#944b3c';
        case BlockType.CHEST:
          return '#f59e0b';
        case BlockType.CRAFTING_TABLE:
          return '#a16207';
        case BlockType.RED_FLOWER:
          return '#ef4444';
        case BlockType.YELLOW_FLOWER:
          return '#facc15';
        case BlockType.DIAMOND_ORE:
          return '#38bdf8';
        case BlockType.GOLD_ORE:
          return '#fde047';
        case BlockType.IRON_ORE:
          return '#e2b694';
        case BlockType.COAL_ORE:
          return '#18181b';
        case BlockType.TNT:
          return '#dc2626';
        case BlockType.BOOKSHELF:
          return '#7c2d12';
        default:
          return '#475569';
      }
    };

    // Draw top-down block colors
    for (let dx = -blockRadius; dx <= blockRadius; dx++) {
      for (let dz = -blockRadius; dz <= blockRadius; dz++) {
        const worldX = pX + dx;
        const worldZ = pZ + dz;

        // Find highest visible block at this coordinate
        let topBlock: BlockType = BlockType.AIR;
        const currentY = Math.min(30, Math.round(playerPos.y) + 8);
        for (let y = currentY; y >= -30; y--) {
          const block = world.getBlock(worldX, y, worldZ);
          if (block !== BlockType.AIR) {
            topBlock = block;
            break;
          }
        }

        if (topBlock !== BlockType.AIR) {
          ctx.fillStyle = getBlockColor(topBlock);
          const drawX = centerX + dx * pxPerBlock;
          const drawY = centerY + dz * pxPerBlock;
          ctx.fillRect(drawX, drawY, Math.ceil(pxPerBlock), Math.ceil(pxPerBlock));
        }
      }
    }

    // Grid lines for chunks (every 16 blocks)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let dx = -blockRadius; dx <= blockRadius; dx++) {
      const worldX = pX + dx;
      if (worldX % 16 === 0) {
        const drawX = centerX + dx * pxPerBlock;
        ctx.beginPath();
        ctx.moveTo(drawX, 0);
        ctx.lineTo(drawX, height);
        ctx.stroke();
      }
    }
    for (let dz = -blockRadius; dz <= blockRadius; dz++) {
      const worldZ = pZ + dz;
      if (worldZ % 16 === 0) {
        const drawY = centerY + dz * pxPerBlock;
        ctx.beginPath();
        ctx.moveTo(0, drawY);
        ctx.lineTo(width, drawY);
        ctx.stroke();
      }
    }

    // Draw chests as glowing icons
    world.chests.forEach((items, key) => {
      const [cx, cy, cz] = key.split(',').map(Number);
      const dx = cx - pX;
      const dz = cz - pZ;
      if (Math.abs(dx) <= blockRadius && Math.abs(dz) <= blockRadius) {
        const drawX = centerX + dx * pxPerBlock;
        const drawY = centerY + dz * pxPerBlock;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Draw remote players
    remotePlayers.forEach((p) => {
      const dx = p.x - pX;
      const dz = p.z - pZ;
      if (Math.abs(dx) <= blockRadius && Math.abs(dz) <= blockRadius) {
        const drawX = centerX + dx * pxPerBlock;
        const drawY = centerY + dz * pxPerBlock;

        const skinObj = PLAYER_SKINS.find((s) => s.id === p.skin);
        const color = skinObj?.bodyColor || '#38bdf8';

        // Player dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Player name text
        ctx.font = 'bold 10px Rubik, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, drawX, drawY - 8);
      }
    });

    // Draw center local player marker & view cone
    ctx.save();
    ctx.translate(centerX, centerY);

    // View direction cone
    ctx.rotate(-playerYaw); // Negative because 2D canvas Y is downward
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 22, -Math.PI / 4, Math.PI / 4);
    ctx.closePath();
    ctx.fill();

    // Direction arrow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // North indicator (N)
    ctx.font = 'bold 10px Press Start 2P, monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, 14);

    ctx.restore();
  }, [playerPos, playerYaw, remotePlayers, world, zoom, isExpanded]);

  // Determine biome / depth label
  const getDepthLabel = (y: number) => {
    if (y > 6) return '🌲 Равнины';
    if (y > 0) return '🏖️ Побережье';
    if (y > -16) return '🪨 Пещеры';
    return '💎 Глубины (Алмазы)';
  };

  return (
    <div
      className={`pointer-events-auto flex flex-col gap-1 transition-all ${
        isExpanded
          ? 'fixed right-4 top-16 z-40 bg-stone-900/90 p-3 rounded-xl border-2 border-stone-600 shadow-2xl backdrop-blur-md'
          : 'relative'
      }`}
    >
      {/* Mini-map Container */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={isExpanded ? 280 : 130}
          height={isExpanded ? 280 : 130}
          className={`rounded-full border-2 border-amber-400/80 bg-stone-950/90 shadow-xl backdrop-blur-sm transition-all ${
            isExpanded ? 'h-64 w-64' : 'h-28 w-28'
          }`}
        />

        {/* Zoom & Expand Controls */}
        <div className="absolute right-0 top-0 flex flex-col gap-1 p-0.5">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.5))}
            className="flex h-5 w-5 items-center justify-center rounded bg-stone-800/80 text-white hover:bg-stone-700 shadow text-xs font-bold"
            title="Приблизить"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
            className="flex h-5 w-5 items-center justify-center rounded bg-stone-800/80 text-white hover:bg-stone-700 shadow text-xs font-bold"
            title="Отдалить"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-5 w-5 items-center justify-center rounded bg-stone-800/80 text-white hover:bg-stone-700 shadow text-xs font-bold"
            title={isExpanded ? 'Свернуть' : 'Развернуть карту'}
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Coordinates & Biome under map */}
      <div className="mc-panel-dark flex items-center justify-between rounded px-2 py-0.5 text-[10px] text-stone-200">
        <span className="font-mono font-bold text-amber-300">
          {Math.round(playerPos.x)}, {Math.round(playerPos.y)}, {Math.round(playerPos.z)}
        </span>
        <span className="text-emerald-400 font-bold ml-1">
          {getDepthLabel(playerPos.y)}
        </span>
      </div>
    </div>
  );
};
