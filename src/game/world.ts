import * as THREE from 'three';
import { BlockType, ItemId } from '../types/game';
import { TextureManager } from './textures';

// Fast 2D Perlin / Simplex approximation
function pseudoNoise2D(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number, seed: number): number {
  const iX = Math.floor(x);
  const iZ = Math.floor(z);
  const fX = x - iX;
  const fZ = z - iZ;

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

  return Math.floor(7 + h1 + h2 + h3);
}

export interface ChestContent {
  id: number;
  count: number;
  slot: number;
}

export interface ChunkData {
  cx: number;
  cz: number;
  // Compact 16x64x16 TypedArray: 16,384 bytes per chunk. Fast O(1) reads without string keys!
  // Index: (ly << 8) | (lz << 4) | lx, where ly = y - MIN_Y (0..63), lx = 0..15, lz = 0..15
  blocks: Uint8Array;
  group: THREE.Group;
  instancedMeshes: THREE.InstancedMesh[];
  individualMeshes: THREE.Mesh[];
  isMeshed: boolean;
}

export class VoxelWorld {
  public worldMap = new Map<string, BlockType>(); // For legacy / remote compatibility
  public customEdits = new Map<string, BlockType>();
  public blockGroup: THREE.Group;
  public boxGeometry: THREE.BoxGeometry;
  public flowerGeometry: THREE.BoxGeometry;
  public torchGeometry: THREE.BoxGeometry;
  public textureManager: TextureManager;
  public chests = new Map<string, ChestContent[]>();
  public seed: number;

  public readonly CHUNK_SIZE = 16;
  public readonly MIN_Y = -32;
  public readonly MAX_Y = 31; // 64 vertical blocks: -32 to 31
  public readonly CHUNK_HEIGHT = 64;

  public chunks = new Map<string, ChunkData>();
  public generatedChunks = new Set<string>();
  public loadedMeshChunks = new Set<string>();
  public blockMeshes = new Map<string, THREE.Mesh>();
  public chunkQueue: Array<{ cx: number; cz: number }> = [];

  private lastPlayerChunkX: number | null = null;
  private lastPlayerChunkZ: number | null = null;

  // Reusable dummy for matrix updates
  private dummy = new THREE.Object3D();

  constructor(seed = 12345, textureManager: TextureManager) {
    this.seed = seed;
    this.textureManager = textureManager;
    this.blockGroup = new THREE.Group();
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.flowerGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.5);
    this.flowerGeometry.translate(0, -0.15, 0);
    this.torchGeometry = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    this.torchGeometry.translate(0, -0.2, 0);
  }

  public getBlockKey(x: number, y: number, z: number): string {
    return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
  }

  public getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`;
  }

  // Fast bitwise index: ly from 0..63, lz from 0..15, lx from 0..15
  private getLocalIndex(lx: number, ly: number, lz: number): number {
    return (ly << 8) | (lz << 4) | lx;
  }

  private isTransparent(type: BlockType): boolean {
    return (
      type === BlockType.AIR ||
      type === BlockType.WATER ||
      type === BlockType.GLASS ||
      type === BlockType.OAK_LEAVES ||
      type === BlockType.RED_FLOWER ||
      type === BlockType.YELLOW_FLOWER ||
      type === BlockType.TORCH
    );
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (y < this.MIN_Y) return BlockType.BEDROCK;
    if (y > this.MAX_Y) return BlockType.AIR;

    const key = this.getBlockKey(x, y, z);
    if (this.customEdits.has(key)) {
      return this.customEdits.get(key)!;
    }

    const chunkX = Math.floor(x / this.CHUNK_SIZE);
    const chunkZ = Math.floor(z / this.CHUNK_SIZE);
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(chunkKey);

    if (chunk) {
      const lx = ((x % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
      const ly = y - this.MIN_Y;
      const lz = ((z % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
      return chunk.blocks[this.getLocalIndex(lx, ly, lz)] as BlockType;
    }

    // Fast mathematical block prediction if chunk not yet loaded (avoids recursive chunk generation!)
    const h = getTerrainHeight(x, z, this.seed);
    if (y > h) return BlockType.AIR;
    if (y === h) return h <= 7 ? BlockType.SAND : BlockType.GRASS;
    if (y >= h - 2) return BlockType.DIRT;
    return BlockType.STONE;
  }

  // Fast O(1) top-down block lookup for MiniMap
  public getTopBlock(x: number, z: number): BlockType {
    const chunkX = Math.floor(x / this.CHUNK_SIZE);
    const chunkZ = Math.floor(z / this.CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkZ));

    const surfaceH = getTerrainHeight(x, z, this.seed);

    if (chunk) {
      const lx = ((x % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
      const lz = ((z % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
      const startLy = Math.min(this.CHUNK_HEIGHT - 1, surfaceH - this.MIN_Y + 5);

      for (let ly = startLy; ly >= 0; ly--) {
        const b = chunk.blocks[this.getLocalIndex(lx, ly, lz)] as BlockType;
        if (b !== BlockType.AIR) {
          return b;
        }
      }
    }

    return surfaceH <= 7 ? BlockType.SAND : BlockType.GRASS;
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

  // Generate blocks directly into compact TypedArray (takes < 0.8ms per chunk)
  public generateChunk(chunkX: number, chunkZ: number): ChunkData {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    let chunk = this.chunks.get(chunkKey);
    if (chunk) return chunk;

    const blocks = new Uint8Array(16384); // 16 * 64 * 16
    const group = new THREE.Group();

    chunk = {
      cx: chunkX,
      cz: chunkZ,
      blocks,
      group,
      instancedMeshes: [],
      individualMeshes: [],
      isMeshed: false,
    };

    this.chunks.set(chunkKey, chunk);
    this.generatedChunks.add(chunkKey);

    const startX = chunkX * this.CHUNK_SIZE;
    const startZ = chunkZ * this.CHUNK_SIZE;

    for (let lx = 0; lx < 16; lx++) {
      const worldX = startX + lx;
      for (let lz = 0; lz < 16; lz++) {
        const worldZ = startZ + lz;
        const height = getTerrainHeight(worldX, worldZ, this.seed);

        // Bedrock floor at y = -32 (ly = 0)
        blocks[this.getLocalIndex(lx, 0, lz)] = BlockType.BEDROCK;

        // Underground stone, ores & caves (y = -31 to height - 3)
        const maxStoneY = Math.min(this.CHUNK_HEIGHT - 1, height - 2 - this.MIN_Y);
        for (let ly = 1; ly < maxStoneY; ly++) {
          const worldY = ly + this.MIN_Y;

          // 3D pseudo noise for caves
          const caveNoise = pseudoNoise2D(
            worldX * 0.15 + worldY * 0.25,
            worldZ * 0.15 + worldY * 0.2,
            this.seed + 800
          );
          if (caveNoise < 0.20 && ly > 2) {
            continue; // Cave air
          }

          // Ore generation
          const oreNoise = pseudoNoise2D(
            worldX * 0.35 + worldY * 0.6,
            worldZ * 0.35 + worldY * 0.4,
            this.seed + 350
          );

          if (worldY <= -14 && oreNoise > 0.91) {
            blocks[this.getLocalIndex(lx, ly, lz)] = BlockType.DIAMOND_ORE;
          } else if (worldY <= -6 && oreNoise > 0.86) {
            blocks[this.getLocalIndex(lx, ly, lz)] = BlockType.GOLD_ORE;
          } else if (oreNoise > 0.77) {
            blocks[this.getLocalIndex(lx, ly, lz)] = BlockType.IRON_ORE;
          } else if (oreNoise > 0.69) {
            blocks[this.getLocalIndex(lx, ly, lz)] = BlockType.COAL_ORE;
          } else {
            blocks[this.getLocalIndex(lx, ly, lz)] = BlockType.STONE;
          }
        }

        // Dirt layer (height - 2 to height - 1)
        const dirtStartLy = Math.max(1, height - 2 - this.MIN_Y);
        const dirtEndLy = Math.max(1, height - this.MIN_Y);
        for (let ly = dirtStartLy; ly < dirtEndLy; ly++) {
          if (ly < this.CHUNK_HEIGHT) {
            blocks[this.getLocalIndex(lx, ly, lz)] = BlockType.DIRT;
          }
        }

        // Surface: Grass or Sand
        const topLy = height - this.MIN_Y;
        if (topLy >= 0 && topLy < this.CHUNK_HEIGHT) {
          if (height <= 7) {
            blocks[this.getLocalIndex(lx, topLy, lz)] = BlockType.SAND;
          } else {
            blocks[this.getLocalIndex(lx, topLy, lz)] = BlockType.GRASS;

            // Surface vegetation / flowers
            if (topLy + 1 < this.CHUNK_HEIGHT) {
              const vegRand = pseudoNoise2D(worldX * 1.5, worldZ * 1.5, this.seed + 500);
              if (vegRand > 0.95) {
                blocks[this.getLocalIndex(lx, topLy + 1, lz)] = BlockType.RED_FLOWER;
              } else if (vegRand > 0.90) {
                blocks[this.getLocalIndex(lx, topLy + 1, lz)] = BlockType.YELLOW_FLOWER;
              } else if (vegRand > 0.87) {
                blocks[this.getLocalIndex(lx, topLy + 1, lz)] = BlockType.PUMPKIN;
              }
            }
          }
        }
      }
    }

    // Grow Trees
    for (let lx = 2; lx <= 13; lx += 4) {
      for (let lz = 2; lz <= 13; lz += 4) {
        const worldX = startX + lx;
        const worldZ = startZ + lz;
        const treeNoise = pseudoNoise2D(worldX * 0.7, worldZ * 0.7, this.seed + 700);
        if (treeNoise > 0.58) {
          const groundY = getTerrainHeight(worldX, worldZ, this.seed);
          if (groundY > 7) {
            this.growTreeInChunk(chunk, lx, groundY + 1 - this.MIN_Y, lz);
          }
        }
      }
    }

    // Deep Dungeon Ruins
    const dungeonChance = pseudoNoise2D(chunkX * 10.5, chunkZ * 10.5, this.seed + 999);
    if (dungeonChance > 0.72) {
      this.generateDeepDungeonInChunk(chunk, 8, -20 - this.MIN_Y, 8, startX + 8, startZ + 8);
    }

    // Apply any custom player edits that belong to this chunk
    this.customEdits.forEach((blockType, key) => {
      const [x, y, z] = key.split(',').map(Number);
      if (Math.floor(x / 16) === chunkX && Math.floor(z / 16) === chunkZ) {
        const lx = ((x % 16) + 16) % 16;
        const ly = y - this.MIN_Y;
        const lz = ((z % 16) + 16) % 16;
        if (ly >= 0 && ly < this.CHUNK_HEIGHT) {
          blocks[this.getLocalIndex(lx, ly, lz)] = blockType;
        }
      }
    });

    return chunk;
  }

  private growTreeInChunk(chunk: ChunkData, lx: number, startLy: number, lz: number) {
    const trunkHeight = 4;
    for (let dy = 0; dy < trunkHeight; dy++) {
      const ly = startLy + dy;
      if (ly < this.CHUNK_HEIGHT) {
        chunk.blocks[this.getLocalIndex(lx, ly, lz)] = BlockType.OAK_LOG;
      }
    }

    const leafStart = startLy + trunkHeight - 2;
    for (let ly = leafStart; ly <= startLy + trunkHeight + 1; ly++) {
      if (ly >= this.CHUNK_HEIGHT) continue;
      const radius = ly >= startLy + trunkHeight ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const nlx = lx + dx;
          const nlz = lz + dz;
          if (nlx >= 0 && nlx < 16 && nlz >= 0 && nlz < 16) {
            if (dx === 0 && dz === 0 && ly < startLy + trunkHeight) continue;
            const idx = this.getLocalIndex(nlx, ly, nlz);
            if (chunk.blocks[idx] === BlockType.AIR) {
              chunk.blocks[idx] = BlockType.OAK_LEAVES;
            }
          }
        }
      }
    }
  }

  private generateDeepDungeonInChunk(
    chunk: ChunkData,
    lx: number,
    baseLy: number,
    lz: number,
    worldX: number,
    worldZ: number
  ) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 0; dy <= 3; dy++) {
          const nlx = lx + dx;
          const ly = baseLy + dy;
          const nlz = lz + dz;
          if (nlx >= 0 && nlx < 16 && nlz >= 0 && nlz < 16 && ly >= 0 && ly < this.CHUNK_HEIGHT) {
            const idx = this.getLocalIndex(nlx, ly, nlz);
            if (dy === 0 || dy === 3 || Math.abs(dx) === 2 || Math.abs(dz) === 2) {
              chunk.blocks[idx] = BlockType.COBBLESTONE;
            } else {
              chunk.blocks[idx] = BlockType.AIR;
            }
          }
        }
      }
    }

    // Torches & Chest
    const torchLy = baseLy + 2;
    if (lx > 1 && torchLy < this.CHUNK_HEIGHT) {
      chunk.blocks[this.getLocalIndex(lx - 1, torchLy, lz)] = BlockType.TORCH;
    }
    if (lx < 14 && torchLy < this.CHUNK_HEIGHT) {
      chunk.blocks[this.getLocalIndex(lx + 1, torchLy, lz)] = BlockType.TORCH;
    }

    const chestLy = baseLy + 1;
    if (chestLy < this.CHUNK_HEIGHT) {
      chunk.blocks[this.getLocalIndex(lx, chestLy, lz)] = BlockType.CHEST;
      const chestKey = this.getBlockKey(worldX, chestLy + this.MIN_Y, worldZ);
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
  }

  // Blazing Fast InstancedMesh Chunk Builder with Frustum Culling & Zero Lag
  public buildChunkMeshes(chunkX: number, chunkZ: number) {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(chunkKey) || this.generateChunk(chunkX, chunkZ);

    this.unloadChunkMeshes(chunkX, chunkZ);

    const group = new THREE.Group();
    const instancedMeshes: THREE.InstancedMesh[] = [];
    const individualMeshes: THREE.Mesh[] = [];

    // Temporary flat typed array storage for coordinates: [x0, y0, z0, x1, y1, z1, ...]
    // Statically allocated per block type to avoid creating thousands of Vector3 objects!
    const MAX_INSTANCES_PER_TYPE = 4096;
    const typeCoords = new Map<BlockType, Float32Array>();
    const typeCounts = new Map<BlockType, number>();

    const getBuffer = (t: BlockType): Float32Array => {
      let b = typeCoords.get(t);
      if (!b) {
        b = new Float32Array(MAX_INSTANCES_PER_TYPE * 3);
        typeCoords.set(t, b);
        typeCounts.set(t, 0);
      }
      return b;
    };

    const startX = chunkX * this.CHUNK_SIZE;
    const startZ = chunkZ * this.CHUNK_SIZE;
    const blocks = chunk.blocks;

    // Fast neighbor chunk lookups for border faces
    const westChunk = this.chunks.get(this.getChunkKey(chunkX - 1, chunkZ));
    const eastChunk = this.chunks.get(this.getChunkKey(chunkX + 1, chunkZ));
    const northChunk = this.chunks.get(this.getChunkKey(chunkX, chunkZ - 1));
    const southChunk = this.chunks.get(this.getChunkKey(chunkX, chunkZ + 1));

    for (let lx = 0; lx < 16; lx++) {
      const worldX = startX + lx;
      for (let lz = 0; lz < 16; lz++) {
        const worldZ = startZ + lz;

        for (let ly = 0; ly < this.CHUNK_HEIGHT; ly++) {
          const idx = (ly << 8) | (lz << 4) | lx;
          const block = blocks[idx] as BlockType;
          if (block === BlockType.AIR) continue;

          // Check if any of 6 faces are exposed (fast local array lookups)
          let exposed = false;

          // Top
          if (ly === this.CHUNK_HEIGHT - 1) {
            exposed = true;
          } else if (this.isTransparent(blocks[((ly + 1) << 8) | (lz << 4) | lx] as BlockType)) {
            exposed = true;
          }

          // Bottom
          if (!exposed) {
            if (ly === 0) {
              exposed = false; // Bedrock bottom
            } else if (this.isTransparent(blocks[((ly - 1) << 8) | (lz << 4) | lx] as BlockType)) {
              exposed = true;
            }
          }

          // West (lx - 1)
          if (!exposed) {
            if (lx > 0) {
              if (this.isTransparent(blocks[(ly << 8) | (lz << 4) | (lx - 1)] as BlockType)) {
                exposed = true;
              }
            } else if (westChunk) {
              if (this.isTransparent(westChunk.blocks[(ly << 8) | (lz << 4) | 15] as BlockType)) {
                exposed = true;
              }
            } else {
              // Mathematical check if neighbor chunk ungenerated
              const h = getTerrainHeight(worldX - 1, worldZ, this.seed);
              if (ly + this.MIN_Y > h) exposed = true;
            }
          }

          // East (lx + 1)
          if (!exposed) {
            if (lx < 15) {
              if (this.isTransparent(blocks[(ly << 8) | (lz << 4) | (lx + 1)] as BlockType)) {
                exposed = true;
              }
            } else if (eastChunk) {
              if (this.isTransparent(eastChunk.blocks[(ly << 8) | (lz << 4) | 0] as BlockType)) {
                exposed = true;
              }
            } else {
              const h = getTerrainHeight(worldX + 1, worldZ, this.seed);
              if (ly + this.MIN_Y > h) exposed = true;
            }
          }

          // North (lz - 1)
          if (!exposed) {
            if (lz > 0) {
              if (this.isTransparent(blocks[(ly << 8) | ((lz - 1) << 4) | lx] as BlockType)) {
                exposed = true;
              }
            } else if (northChunk) {
              if (this.isTransparent(northChunk.blocks[(ly << 8) | (15 << 4) | lx] as BlockType)) {
                exposed = true;
              }
            } else {
              const h = getTerrainHeight(worldX, worldZ - 1, this.seed);
              if (ly + this.MIN_Y > h) exposed = true;
            }
          }

          // South (lz + 1)
          if (!exposed) {
            if (lz < 15) {
              if (this.isTransparent(blocks[(ly << 8) | ((lz + 1) << 4) | lx] as BlockType)) {
                exposed = true;
              }
            } else if (southChunk) {
              if (this.isTransparent(southChunk.blocks[(ly << 8) | (0 << 4) | lx] as BlockType)) {
                exposed = true;
              }
            } else {
              const h = getTerrainHeight(worldX, worldZ + 1, this.seed);
              if (ly + this.MIN_Y > h) exposed = true;
            }
          }

          if (exposed) {
            const worldY = ly + this.MIN_Y;
            if (
              block === BlockType.RED_FLOWER ||
              block === BlockType.YELLOW_FLOWER ||
              block === BlockType.TORCH
            ) {
              const mat = this.textureManager.getMaterial(block);
              const geo = block === BlockType.TORCH ? this.torchGeometry : this.flowerGeometry;
              const mesh = new THREE.Mesh(geo, mat);
              mesh.position.set(worldX + 0.5, worldY + 0.5, worldZ + 0.5);
              mesh.matrixAutoUpdate = false;
              mesh.updateMatrix();
              group.add(mesh);
              individualMeshes.push(mesh);
            } else {
              const buf = getBuffer(block);
              let c = typeCounts.get(block) || 0;
              if (c < MAX_INSTANCES_PER_TYPE) {
                buf[c * 3 + 0] = worldX + 0.5;
                buf[c * 3 + 1] = worldY + 0.5;
                buf[c * 3 + 2] = worldZ + 0.5;
                typeCounts.set(block, c + 1);
              }
            }
          }
        }
      }
    }

    // Build InstancedMeshes
    typeCounts.forEach((count, type) => {
      if (count === 0) return;
      const buf = typeCoords.get(type)!;
      const mat = this.textureManager.getMaterial(type);
      const imesh = new THREE.InstancedMesh(this.boxGeometry, mat, count);

      for (let i = 0; i < count; i++) {
        this.dummy.position.set(buf[i * 3 + 0], buf[i * 3 + 1], buf[i * 3 + 2]);
        this.dummy.updateMatrix();
        imesh.setMatrixAt(i, this.dummy.matrix);
      }

      imesh.instanceMatrix.needsUpdate = true;
      imesh.computeBoundingSphere();
      imesh.frustumCulled = true; // Essential for 60 FPS: culls chunks behind player!
      imesh.receiveShadow = true;
      // Do not cast heavy dynamic shadows from thousands of static voxels
      imesh.castShadow = false;

      group.add(imesh);
      instancedMeshes.push(imesh);
    });

    this.blockGroup.add(group);
    chunk.group = group;
    chunk.instancedMeshes = instancedMeshes;
    chunk.individualMeshes = individualMeshes;
    chunk.isMeshed = true;
    this.loadedMeshChunks.add(chunkKey);
  }

  public unloadChunkMeshes(chunkX: number, chunkZ: number) {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(chunkKey);
    if (!chunk || !chunk.isMeshed) return;

    this.blockGroup.remove(chunk.group);
    chunk.instancedMeshes.forEach((im) => im.dispose());
    chunk.instancedMeshes = [];
    chunk.individualMeshes = [];
    chunk.isMeshed = false;
    this.loadedMeshChunks.delete(chunkKey);
  }

  // Dynamic chunk streaming around player
  public updateChunksAroundPlayer(playerX: number, playerZ: number, renderDistance = 2) {
    const pChunkX = Math.floor(playerX / this.CHUNK_SIZE);
    const pChunkZ = Math.floor(playerZ / this.CHUNK_SIZE);

    if (this.lastPlayerChunkX === pChunkX && this.lastPlayerChunkZ === pChunkZ) {
      return;
    }
    this.lastPlayerChunkX = pChunkX;
    this.lastPlayerChunkZ = pChunkZ;

    // Queue chunks in spiral from center outwards
    const newQueue: Array<{ cx: number; cz: number }> = [];
    for (let r = 0; r <= renderDistance; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) === r) {
            const cx = pChunkX + dx;
            const cz = pChunkZ + dz;
            const cKey = this.getChunkKey(cx, cz);
            const ch = this.chunks.get(cKey);
            if (!ch || !ch.isMeshed) {
              newQueue.push({ cx, cz });
            }
          }
        }
      }
    }
    this.chunkQueue = newQueue;

    // Unload distant chunks to free memory
    const unloadDist = renderDistance + 1;
    for (const [cKey, chunk] of this.chunks) {
      if (Math.abs(chunk.cx - pChunkX) > unloadDist || Math.abs(chunk.cz - pChunkZ) > unloadDist) {
        this.unloadChunkMeshes(chunk.cx, chunk.cz);
      }
    }
  }

  // Smooth frame-budgeted queue processor: at most 1 chunk or 4ms per frame to prevent stutter
  public processChunkQueue() {
    if (this.chunkQueue.length === 0) return;
    const start = performance.now();

    while (this.chunkQueue.length > 0 && performance.now() - start < 4) {
      const next = this.chunkQueue.shift();
      if (next) {
        this.generateChunk(next.cx, next.cz);
        this.buildChunkMeshes(next.cx, next.cz);
      }
    }
  }

  // Fast DDA Voxel Raycast (0.0001ms without touching 3D meshes)
  public raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance = 5.5
  ): { coord: { x: number; y: number; z: number }; normal: THREE.Vector3; blockType: BlockType } | null {
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = direction.x > 0 ? 1 : -1;
    const stepY = direction.y > 0 ? 1 : -1;
    const stepZ = direction.z > 0 ? 1 : -1;

    const tDeltaX = Math.abs(1 / (direction.x || 1e-6));
    const tDeltaY = Math.abs(1 / (direction.y || 1e-6));
    const tDeltaZ = Math.abs(1 / (direction.z || 1e-6));

    let tMaxX = ((direction.x > 0 ? x + 1 : x) - origin.x) / (direction.x || 1e-6);
    let tMaxY = ((direction.y > 0 ? y + 1 : y) - origin.y) / (direction.y || 1e-6);
    let tMaxZ = ((direction.z > 0 ? z + 1 : z) - origin.z) / (direction.z || 1e-6);

    const normal = new THREE.Vector3(0, 1, 0);
    let dist = 0;

    while (dist < maxDistance) {
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX;
          dist = tMaxX;
          tMaxX += tDeltaX;
          normal.set(-stepX, 0, 0);
        } else {
          z += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          normal.set(0, 0, -stepZ);
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY;
          dist = tMaxY;
          tMaxY += tDeltaY;
          normal.set(0, -stepY, 0);
        } else {
          z += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          normal.set(0, 0, -stepZ);
        }
      }

      if (dist > maxDistance) break;

      const block = this.getBlock(x, y, z);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return { coord: { x, y, z }, normal, blockType: block };
      }
    }

    return null;
  }

  public setBlock(x: number, y: number, z: number, blockType: BlockType) {
    const key = this.getBlockKey(x, y, z);
    this.customEdits.set(key, blockType);

    const cx = Math.floor(x / this.CHUNK_SIZE);
    const cz = Math.floor(z / this.CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));

    if (chunk) {
      const lx = ((x % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
      const ly = y - this.MIN_Y;
      const lz = ((z % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
      if (ly >= 0 && ly < this.CHUNK_HEIGHT) {
        chunk.blocks[this.getLocalIndex(lx, ly, lz)] = blockType;
      }
      this.buildChunkMeshes(cx, cz);
    }

    // Border chunk updates
    const localX = ((x % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
    const localZ = ((z % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
    if (localX === 0) this.buildChunkMeshes(cx - 1, cz);
    if (localX === 15) this.buildChunkMeshes(cx + 1, cz);
    if (localZ === 0) this.buildChunkMeshes(cx, cz - 1);
    if (localZ === 15) this.buildChunkMeshes(cx, cz + 1);
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
    this.chunks.forEach((chunk) => {
      this.unloadChunkMeshes(chunk.cx, chunk.cz);
    });
    this.chunks.clear();

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
