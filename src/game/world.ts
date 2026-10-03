import * as THREE from 'three';
import { BlockType, ItemId } from '../types/game';
import { TextureManager } from './textures';

// 2D Perlin / Simplex approximation
function pseudoNoise2D(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number, seed: number): number {
  const iX = Math.floor(x);
  const iZ = Math.floor(z);
  const fX = x - iX;
  const fZ = z - iZ;

  // Smoothstep
  const uX = fX * fX * (3 - 2 * fX);
  const uZ = fZ * fZ * (3 - 2 * fZ);

  const n00 = pseudoNoise2D(iX, iZ, seed);
  const n10 = pseudoNoise2D(iX + 1, iZ, seed);
  const n01 = pseudoNoise2D(iX, iZ + 1, seed);
  const n11 = pseudoNoise2D(iX + 1, iZ + 1, seed);

  const nx0 = n00 * (1 - uX) + n10 * uX;
  const nx1 = n01 * (1 - uX) + n11 * uX;

  return nx0 * (1 - uZ) + nx1 * uZ;
}

export function getTerrainHeight(x: number, z: number, seed: number): number {
  const scale1 = 0.035;
  const scale2 = 0.07;
  const scale3 = 0.14;

  const h1 = smoothNoise(x * scale1, z * scale1, seed) * 9;
  const h2 = smoothNoise(x * scale2, z * scale2, seed + 100) * 4.5;
  const h3 = smoothNoise(x * scale3, z * scale3, seed + 200) * 2;

  // Ground base at y = 8
  return Math.floor(7 + h1 + h2 + h3);
}

export interface ChestContent {
  id: number;
  count: number;
  slot: number;
}

export class VoxelWorld {
  public worldMap = new Map<string, BlockType>();
  public customEdits = new Map<string, BlockType>(); // Player edits override procedural terrain
  public blockMeshes = new Map<string, THREE.Mesh>();
  public blockGroup: THREE.Group;
  public boxGeometry: THREE.BoxGeometry;
  public textureManager: TextureManager;
  public chests = new Map<string, ChestContent[]>();
  public seed: number;

  // Dynamic Chunks Management
  public readonly CHUNK_SIZE = 16;
  public readonly MIN_Y = -32; // Deep underground down to -32
  public readonly MAX_Y = 48; // Mountains / trees up to +48
  public generatedChunks = new Set<string>(); // "chunkX,chunkZ"
  public loadedMeshChunks = new Set<string>();

  private lastPlayerChunkX: number | null = null;
  private lastPlayerChunkZ: number | null = null;

  constructor(seed = 12345, textureManager: TextureManager) {
    this.seed = seed;
    this.textureManager = textureManager;
    this.blockGroup = new THREE.Group();
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  }

  public getBlockKey(x: number, y: number, z: number): string {
    return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
  }

  public getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (y < this.MIN_Y) return BlockType.BEDROCK;
    if (y > this.MAX_Y) return BlockType.AIR;

    const key = this.getBlockKey(x, y, z);
    if (this.customEdits.has(key)) {
      return this.customEdits.get(key)!;
    }
    if (this.worldMap.has(key)) {
      return this.worldMap.get(key)!;
    }

    // If chunk not generated yet, generate it on demand
    const chunkX = Math.floor(x / this.CHUNK_SIZE);
    const chunkZ = Math.floor(z / this.CHUNK_SIZE);
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    if (!this.generatedChunks.has(chunkKey)) {
      this.generateChunk(chunkX, chunkZ);
      return this.worldMap.get(key) || BlockType.AIR;
    }

    return BlockType.AIR;
  }

  public isSolid(x: number, y: number, z: number): boolean {
    const block = this.getBlock(x, y, z);
    if (block === BlockType.AIR || block === BlockType.WATER) return false;
    if (
      block === BlockType.RED_FLOWER ||
      block === BlockType.YELLOW_FLOWER ||
      block === BlockType.TORCH
    ) {
      return false;
    }
    return true;
  }

  // Generate blocks in a 16x16 chunk in depth (Y = -32 to +32) and width
  public generateChunk(chunkX: number, chunkZ: number) {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    if (this.generatedChunks.has(chunkKey)) return;
    this.generatedChunks.add(chunkKey);

    const startX = chunkX * this.CHUNK_SIZE;
    const endX = startX + this.CHUNK_SIZE - 1;
    const startZ = chunkZ * this.CHUNK_SIZE;
    const endZ = startZ + this.CHUNK_SIZE - 1;

    for (let x = startX; x <= endX; x++) {
      for (let z = startZ; z <= endZ; z++) {
        const height = getTerrainHeight(x, z, this.seed);

        // 1. Bedrock Floor (Indestructible bottom layer at -32)
        this.worldMap.set(this.getBlockKey(x, this.MIN_Y, z), BlockType.BEDROCK);

        // 2. Deep Underground Caves & Ores (-31 down to -1)
        for (let y = this.MIN_Y + 1; y < 0; y++) {
          const key = this.getBlockKey(x, y, z);
          if (this.customEdits.has(key)) continue;

          // 3D Cave Noise for deep underground tunnels
          const caveNoise = pseudoNoise2D(x * 0.15 + y * 0.25, z * 0.15 + y * 0.2, this.seed + 800);
          if (caveNoise < 0.22 && y > this.MIN_Y + 2) {
            // Natural underground cave pocket / tunnel!
            continue;
          }

          // Deep Ore generation
          const oreNoise = pseudoNoise2D(x * 0.35 + y * 0.6, z * 0.35 + y * 0.4, this.seed + 350);

          if (y <= -14 && oreNoise > 0.91) {
            // Diamond ore in the depths!
            this.worldMap.set(key, BlockType.DIAMOND_ORE);
          } else if (y <= -6 && oreNoise > 0.86) {
            // Gold ore
            this.worldMap.set(key, BlockType.GOLD_ORE);
          } else if (oreNoise > 0.78) {
            // Iron ore
            this.worldMap.set(key, BlockType.IRON_ORE);
          } else if (oreNoise > 0.70) {
            // Coal ore
            this.worldMap.set(key, BlockType.COAL_ORE);
          } else {
            // Deep stone
            this.worldMap.set(key, BlockType.STONE);
          }
        }

        // 3. Upper Stone Layer (0 up to height - 2)
        for (let y = 0; y < height - 2; y++) {
          const key = this.getBlockKey(x, y, z);
          if (this.customEdits.has(key)) continue;

          const caveNoise = pseudoNoise2D(x * 0.15 + y * 0.25, z * 0.15 + y * 0.2, this.seed + 850);
          if (caveNoise < 0.18 && y > 2) {
            // Upper cave
            continue;
          }

          const r = pseudoNoise2D(x * 0.3 + y * 0.7, z * 0.3 + y * 0.5, this.seed + 300);
          if (r > 0.88) {
            this.worldMap.set(key, BlockType.IRON_ORE);
          } else if (r > 0.76) {
            this.worldMap.set(key, BlockType.COAL_ORE);
          } else {
            this.worldMap.set(key, BlockType.STONE);
          }
        }

        // 4. Dirt Layer
        for (let y = Math.max(0, height - 2); y < height; y++) {
          const key = this.getBlockKey(x, y, z);
          if (!this.customEdits.has(key)) {
            this.worldMap.set(key, BlockType.DIRT);
          }
        }

        // 5. Surface Layer: Grass or Sand
        const topKey = this.getBlockKey(x, height, z);
        if (!this.customEdits.has(topKey)) {
          if (height <= 7) {
            this.worldMap.set(topKey, BlockType.SAND);
          } else {
            this.worldMap.set(topKey, BlockType.GRASS);

            // Flowers & Pumpkins
            const vegRand = pseudoNoise2D(x * 1.5, z * 1.5, this.seed + 500);
            if (vegRand > 0.94) {
              this.worldMap.set(this.getBlockKey(x, height + 1, z), BlockType.RED_FLOWER);
            } else if (vegRand > 0.88) {
              this.worldMap.set(this.getBlockKey(x, height + 1, z), BlockType.YELLOW_FLOWER);
            } else if (vegRand > 0.85) {
              this.worldMap.set(this.getBlockKey(x, height + 1, z), BlockType.PUMPKIN);
            }
          }
        }
      }
    }

    // 6. Trees in this chunk
    for (let x = startX + 2; x <= endX - 2; x += 4) {
      for (let z = startZ + 2; z <= endZ - 2; z += 4) {
        const treeNoise = pseudoNoise2D(x * 0.7, z * 0.7, this.seed + 700);
        if (treeNoise > 0.56) {
          const groundY = getTerrainHeight(x, z, this.seed);
          if (groundY > 7 && this.getBlock(x, groundY, z) === BlockType.GRASS) {
            this.growTree(x, groundY + 1, z);
          }
        }
      }
    }

    // 7. Hidden Deep Underground Dungeon with Treasure Chest (at y = -20)
    const dungeonChance = pseudoNoise2D(chunkX * 10.5, chunkZ * 10.5, this.seed + 999);
    if (dungeonChance > 0.72) {
      this.generateDeepDungeon(startX + 8, -20, startZ + 8);
    }
  }

  private growTree(x: number, startY: number, z: number) {
    const trunkHeight = 4 + Math.floor(pseudoNoise2D(x, z, this.seed) * 2);

    // Trunk
    for (let y = 0; y < trunkHeight; y++) {
      const key = this.getBlockKey(x, startY + y, z);
      if (!this.customEdits.has(key)) {
        this.worldMap.set(key, BlockType.OAK_LOG);
      }
    }

    // Leaves
    const leafStart = startY + trunkHeight - 2;
    for (let ly = leafStart; ly <= startY + trunkHeight + 1; ly++) {
      const radius = ly >= startY + trunkHeight ? 1 : 2;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (lx === 0 && lz === 0 && ly < startY + trunkHeight) continue;
          if (Math.abs(lx) === radius && Math.abs(lz) === radius && ly === startY + trunkHeight + 1) {
            continue;
          }
          const leafKey = this.getBlockKey(x + lx, ly, z + lz);
          if (!this.worldMap.has(leafKey) && !this.customEdits.has(leafKey)) {
            this.worldMap.set(leafKey, BlockType.OAK_LEAVES);
          }
        }
      }
    }
  }

  private generateDeepDungeon(cx: number, cy: number, cz: number) {
    // 5x5 cobblestone dungeon room
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 0; dy <= 3; dy++) {
          const key = this.getBlockKey(cx + dx, cy + dy, cz + dz);
          if (dy === 0) {
            this.worldMap.set(key, BlockType.COBBLESTONE); // Floor
          } else if (dy === 3 || Math.abs(dx) === 2 || Math.abs(dz) === 2) {
            this.worldMap.set(key, BlockType.COBBLESTONE); // Walls & ceiling
          } else {
            this.worldMap.set(key, BlockType.AIR); // Hollow room
          }
        }
      }
    }

    // Torches
    this.worldMap.set(this.getBlockKey(cx - 1, cy + 2, cz), BlockType.TORCH);
    this.worldMap.set(this.getBlockKey(cx + 1, cy + 2, cz), BlockType.TORCH);

    // Deep Treasure Chest!
    const chestKey = this.getBlockKey(cx, cy + 1, cz);
    this.worldMap.set(chestKey, BlockType.CHEST);
    const loot: ChestContent[] = [
      { id: ItemId.DIAMOND, count: 4, slot: 0 },
      { id: ItemId.DIAMOND_PICKAXE, count: 1, slot: 2 },
      { id: ItemId.GOLDEN_APPLE, count: 3, slot: 4 },
      { id: ItemId.CAKE, count: 2, slot: 6 },
      { id: BlockType.TORCH, count: 32, slot: 8 },
      { id: ItemId.DIAMOND_SWORD, count: 1, slot: 10 },
      { id: BlockType.TNT, count: 8, slot: 12 },
    ];
    this.chests.set(chestKey, loot);
  }

  // Check if at least one adjacent face is transparent/air
  public isBlockExposed(x: number, y: number, z: number): boolean {
    const neighbors = [
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y + 1, z],
      [x, y - 1, z],
      [x, y, z + 1],
      [x, y, z - 1],
    ];

    for (const [nx, ny, nz] of neighbors) {
      const block = this.getBlock(nx, ny, nz);
      if (
        block === BlockType.AIR ||
        block === BlockType.GLASS ||
        block === BlockType.OAK_LEAVES ||
        block === BlockType.RED_FLOWER ||
        block === BlockType.YELLOW_FLOWER ||
        block === BlockType.TORCH ||
        block === BlockType.WATER
      ) {
        return true;
      }
    }
    return false;
  }

  // Dynamic chunk loading as player walks or approaches the edge
  public updateChunksAroundPlayer(playerX: number, playerZ: number, renderDistance = 3) {
    const pChunkX = Math.floor(playerX / this.CHUNK_SIZE);
    const pChunkZ = Math.floor(playerZ / this.CHUNK_SIZE);

    if (this.lastPlayerChunkX === pChunkX && this.lastPlayerChunkZ === pChunkZ) {
      return;
    }
    this.lastPlayerChunkX = pChunkX;
    this.lastPlayerChunkZ = pChunkZ;

    // Load / generate chunks in radius
    for (let dx = -renderDistance; dx <= renderDistance; dx++) {
      for (let dz = -renderDistance; dz <= renderDistance; dz++) {
        const cx = pChunkX + dx;
        const cz = pChunkZ + dz;
        const cKey = this.getChunkKey(cx, cz);

        if (!this.generatedChunks.has(cKey)) {
          this.generateChunk(cx, cz);
        }

        if (!this.loadedMeshChunks.has(cKey)) {
          this.buildChunkMeshes(cx, cz);
          this.loadedMeshChunks.add(cKey);
        }
      }
    }

    // Unload distant chunks to save memory and keep 60 FPS
    const unloadDist = renderDistance + 2;
    for (const cKey of this.loadedMeshChunks) {
      const [cx, cz] = cKey.split(',').map(Number);
      if (Math.abs(cx - pChunkX) > unloadDist || Math.abs(cz - pChunkZ) > unloadDist) {
        this.unloadChunkMeshes(cx, cz);
        this.loadedMeshChunks.delete(cKey);
      }
    }
  }

  public buildChunkMeshes(chunkX: number, chunkZ: number) {
    const startX = chunkX * this.CHUNK_SIZE;
    const endX = startX + this.CHUNK_SIZE - 1;
    const startZ = chunkZ * this.CHUNK_SIZE;
    const endZ = startZ + this.CHUNK_SIZE - 1;

    for (let x = startX; x <= endX; x++) {
      for (let z = startZ; z <= endZ; z++) {
        for (let y = this.MIN_Y; y <= this.MAX_Y; y++) {
          const key = this.getBlockKey(x, y, z);
          const blockType = this.customEdits.has(key)
            ? this.customEdits.get(key)!
            : this.worldMap.get(key);

          if (blockType && (blockType as number) !== BlockType.AIR) {
            if (this.isBlockExposed(x, y, z)) {
              this.createBlockMesh(x, y, z, blockType);
            }
          }
        }
      }
    }
  }

  public unloadChunkMeshes(chunkX: number, chunkZ: number) {
    const startX = chunkX * this.CHUNK_SIZE;
    const endX = startX + this.CHUNK_SIZE - 1;
    const startZ = chunkZ * this.CHUNK_SIZE;
    const endZ = startZ + this.CHUNK_SIZE - 1;

    for (let x = startX; x <= endX; x++) {
      for (let z = startZ; z <= endZ; z++) {
        for (let y = this.MIN_Y; y <= this.MAX_Y; y++) {
          const key = this.getBlockKey(x, y, z);
          const mesh = this.blockMeshes.get(key);
          if (mesh) {
            this.blockGroup.remove(mesh);
            this.blockMeshes.delete(key);
          }
        }
      }
    }
  }

  public createBlockMesh(x: number, y: number, z: number, blockType: BlockType): THREE.Mesh {
    const key = this.getBlockKey(x, y, z);
    const existing = this.blockMeshes.get(key);
    if (existing) {
      this.blockGroup.remove(existing);
      this.blockMeshes.delete(key);
    }

    const material = this.textureManager.getMaterial(blockType);

    let geo = this.boxGeometry;
    let yOffset = 0;
    if (blockType === BlockType.RED_FLOWER || blockType === BlockType.YELLOW_FLOWER) {
      geo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
      yOffset = -0.15;
    } else if (blockType === BlockType.TORCH) {
      geo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
      yOffset = -0.2;
    }

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x + 0.5, y + 0.5 + yOffset, z + 0.5);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();

    mesh.userData = { x, y, z, blockType, key };
    mesh.castShadow = blockType !== BlockType.GLASS && blockType !== BlockType.AIR;
    mesh.receiveShadow = true;

    this.blockGroup.add(mesh);
    this.blockMeshes.set(key, mesh);
    return mesh;
  }

  public setBlock(x: number, y: number, z: number, blockType: BlockType) {
    const key = this.getBlockKey(x, y, z);
    this.customEdits.set(key, blockType);

    if (blockType === BlockType.AIR) {
      this.worldMap.delete(key);
      const mesh = this.blockMeshes.get(key);
      if (mesh) {
        this.blockGroup.remove(mesh);
        this.blockMeshes.delete(key);
      }
    } else {
      this.worldMap.set(key, blockType);
      this.createBlockMesh(x, y, z, blockType);
    }

    // Update 6 neighbor block meshes
    const neighbors = [
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y + 1, z],
      [x, y - 1, z],
      [x, y, z + 1],
      [x, y, z - 1],
    ];

    neighbors.forEach(([nx, ny, nz]) => {
      const nKey = this.getBlockKey(nx, ny, nz);
      const nType = this.getBlock(nx, ny, nz);
      if (!nType || (nType as number) === BlockType.AIR) return;

      const nExposed = this.isBlockExposed(nx, ny, nz);
      const hasMesh = this.blockMeshes.has(nKey);

      if (nExposed && !hasMesh) {
        this.createBlockMesh(nx, ny, nz, nType);
      } else if (!nExposed && hasMesh) {
        const mesh = this.blockMeshes.get(nKey);
        if (mesh) {
          this.blockGroup.remove(mesh);
          this.blockMeshes.delete(nKey);
        }
      }
    });
  }

  public applyRemoteBlockChange(x: number, y: number, z: number, blockId: number) {
    this.setBlock(x, y, z, blockId as BlockType);
  }

  public exportWorldData() {
    const customBlocks: Record<string, number> = {};
    this.customEdits.forEach((blockType, key) => {
      customBlocks[key] = blockType;
    });

    const chestData: Record<string, ChestContent[]> = {};
    this.chests.forEach((contents, key) => {
      chestData[key] = contents;
    });

    return {
      version: 2,
      seed: this.seed,
      blocks: customBlocks,
      chests: chestData,
      timestamp: Date.now(),
    };
  }

  public importWorldData(data: any) {
    if (!data) return;
    if (data.seed) {
      this.seed = data.seed;
    }
    this.worldMap.clear();
    this.customEdits.clear();
    this.generatedChunks.clear();
    this.loadedMeshChunks.clear();

    if (data.blocks) {
      Object.entries(data.blocks).forEach(([key, blockId]) => {
        this.customEdits.set(key, blockId as BlockType);
      });
    }

    if (data.chests) {
      this.chests.clear();
      Object.entries(data.chests).forEach(([key, items]) => {
        this.chests.set(key, items as ChestContent[]);
      });
    }

    this.lastPlayerChunkX = null;
    this.lastPlayerChunkZ = null;
  }
}
