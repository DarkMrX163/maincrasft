import * as THREE from 'three';
import { BlockType } from '../types/game';

// Generates 16x16 pixel art canvas
function createPixelTexture(
  drawFn: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 16
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Noise helper for pixel variations
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Pixel drawer helper
function fillPattern(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  variations: string[],
  seed = 42
) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 16, 16);
  let s = seed;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = seededRandom(s++);
      if (r > 0.4) {
        const vIndex = Math.floor(seededRandom(s++) * variations.length);
        ctx.fillStyle = variations[vIndex];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

export interface BlockMaterials {
  material: THREE.Material | THREE.Material[];
  isTransparent?: boolean;
}

export class TextureManager {
  private materials = new Map<BlockType, BlockMaterials>();
  private breakStages: THREE.CanvasTexture[] = [];
  public defaultMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.defaultMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    this.initBreakTextures();
    this.initBlockMaterials();
  }

  private initBreakTextures() {
    for (let stage = 0; stage < 5; stage++) {
      const tex = createPixelTexture((ctx) => {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        const count = (stage + 1) * 6;
        let s = stage * 10;
        for (let i = 0; i < count; i++) {
          const x = Math.floor(seededRandom(s++) * 16);
          const y = Math.floor(seededRandom(s++) * 16);
          ctx.fillRect(x, y, 1, 1);
          if (seededRandom(s++) > 0.5) {
            ctx.fillRect((x + 1) % 16, y, 1, 1);
          }
        }
      });
      this.breakStages.push(tex);
    }
  }

  public getBreakTexture(progress: number): THREE.CanvasTexture | null {
    if (progress <= 0) return null;
    const stage = Math.min(4, Math.floor(progress * 5));
    return this.breakStages[stage] || null;
  }

  private initBlockMaterials() {
    // Dirt Texture
    const dirtTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#866043', ['#6b4930', '#9c7353', '#79553a'], 10);
    });

    // Grass Top
    const grassTopTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#5c8e32', ['#4f7b28', '#699e3a', '#426920'], 20);
    });

    // Grass Side (green top 3 pixels, dirt bottom)
    const grassSideTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#866043', ['#6b4930', '#9c7353', '#79553a'], 10);
      ctx.fillStyle = '#5c8e32';
      ctx.fillRect(0, 0, 16, 3);
      // Drips of grass
      let s = 30;
      for (let x = 0; x < 16; x++) {
        const drip = Math.floor(seededRandom(s++) * 3);
        if (drip > 0) {
          ctx.fillStyle = '#4f7b28';
          ctx.fillRect(x, 3, 1, drip);
        }
      }
    });

    // Stone Texture
    const stoneTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#737373', ['#606060', '#858585', '#525252'], 40);
    });

    // Cobblestone Texture
    const cobbleTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#686868', ['#4a4a4a', '#858585', '#333333'], 50);
      // Mortar lines
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(0, 4, 16, 1);
      ctx.fillRect(0, 11, 16, 1);
      ctx.fillRect(6, 0, 1, 4);
      ctx.fillRect(12, 5, 1, 6);
      ctx.fillRect(5, 12, 1, 4);
    });

    // Oak Log Side
    const logSideTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#624d31', ['#533f25', '#71593c', '#43311c'], 60);
      // Vertical bark grooves
      ctx.fillStyle = '#382815';
      ctx.fillRect(3, 0, 1, 16);
      ctx.fillRect(8, 0, 1, 16);
      ctx.fillRect(13, 0, 1, 16);
    });

    // Oak Log Top
    const logTopTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#987849', ['#8c6d40', '#a48453'], 70);
      ctx.strokeStyle = '#533f25';
      ctx.lineWidth = 1;
      ctx.strokeRect(3, 3, 10, 10);
      ctx.strokeRect(5, 5, 6, 6);
      ctx.fillStyle = '#382815';
      ctx.fillRect(7, 7, 2, 2);
    });

    // Leaves Texture (translucent cutout effect)
    const leavesTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#3a7522', ['#2d5c1a', '#4a942c', '#204212'], 80);
      ctx.fillStyle = '#1c3a0f';
      for (let i = 0; i < 24; i++) {
        const x = (i * 7) % 16;
        const y = (i * 11) % 16;
        ctx.fillRect(x, y, 1, 1);
      }
    });

    // Planks Texture
    const planksTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#9c7a4f', ['#8c6b41', '#ab875a', '#785b34'], 90);
      ctx.fillStyle = '#543f21';
      ctx.fillRect(0, 4, 16, 1);
      ctx.fillRect(0, 8, 16, 1);
      ctx.fillRect(0, 12, 16, 1);
      // Vertical nail slots
      ctx.fillRect(7, 0, 1, 4);
      ctx.fillRect(11, 4, 1, 4);
      ctx.fillRect(4, 8, 1, 4);
      ctx.fillRect(13, 12, 1, 4);
    });

    // Sand Texture
    const sandTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#dbcb93', ['#cbb97e', '#e7d8a4', '#bfae73'], 100);
    });

    // Glass Texture
    const glassTex = createPixelTexture((ctx) => {
      ctx.fillStyle = 'rgba(215, 240, 255, 0.35)';
      ctx.fillRect(0, 0, 16, 16);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 15, 15);
      // Diagonal glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(3, 3, 2, 2);
      ctx.fillRect(5, 5, 2, 2);
    });

    // Bricks Texture
    const bricksTex = createPixelTexture((ctx) => {
      ctx.fillStyle = '#b5b5b5';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#944b3c';
      // Brick row 1
      ctx.fillRect(0, 0, 7, 3);
      ctx.fillRect(8, 0, 8, 3);
      // Brick row 2
      ctx.fillRect(0, 4, 3, 3);
      ctx.fillRect(4, 4, 7, 3);
      ctx.fillRect(12, 4, 4, 3);
      // Brick row 3
      ctx.fillRect(0, 8, 7, 3);
      ctx.fillRect(8, 8, 8, 3);
      // Brick row 4
      ctx.fillRect(0, 12, 3, 3);
      ctx.fillRect(4, 12, 7, 3);
      ctx.fillRect(12, 12, 4, 3);
    });

    // Ore Helper
    const createOreTexture = (sparkColor: string, deepColor: string) => {
      return createPixelTexture((ctx) => {
        fillPattern(ctx, '#737373', ['#606060', '#858585'], 40);
        ctx.fillStyle = sparkColor;
        const oreSpots = [
          [3, 4], [4, 4], [4, 5],
          [10, 3], [11, 3], [11, 4],
          [6, 9], [7, 9], [7, 10], [8, 10],
          [2, 11], [3, 11],
          [12, 12], [13, 12], [12, 13],
        ];
        oreSpots.forEach(([x, y]) => {
          ctx.fillRect(x, y, 1, 1);
        });
        ctx.fillStyle = deepColor;
        ctx.fillRect(4, 3, 1, 1);
        ctx.fillRect(11, 5, 1, 1);
        ctx.fillRect(8, 9, 1, 1);
      });
    };

    const coalOreTex = createOreTexture('#1f1f1f', '#000000');
    const ironOreTex = createOreTexture('#e2b694', '#bd8b64');
    const goldOreTex = createOreTexture('#fedd3d', '#d99d14');
    const diamondOreTex = createOreTexture('#55ffff', '#21b6c9');

    // Bedrock
    const bedrockTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#262626', ['#111111', '#3b3b3b', '#000000'], 150);
    });

    // Crafting Table
    const craftTopTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#9c7a4f', ['#8c6b41', '#ab875a'], 90);
      ctx.fillStyle = '#543f21';
      ctx.strokeRect(1, 1, 14, 14);
      ctx.strokeRect(4, 4, 8, 8);
    });
    const craftSideTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#9c7a4f', ['#8c6b41', '#ab875a'], 90);
      // Tools hanging on side
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(3, 4, 1, 8);
      ctx.fillRect(4, 4, 3, 2);
      ctx.fillStyle = '#6b4930';
      ctx.fillRect(10, 4, 1, 7);
      ctx.fillStyle = '#a1a1aa';
      ctx.fillRect(9, 3, 3, 2);
    });

    // Chest
    const chestSideTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#8a5c2d', ['#724921', '#9f6f3b'], 180);
      ctx.strokeStyle = '#3a2512';
      ctx.strokeRect(1, 1, 14, 14);
    });
    const chestFrontTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#8a5c2d', ['#724921', '#9f6f3b'], 180);
      ctx.strokeStyle = '#3a2512';
      ctx.strokeRect(1, 1, 14, 14);
      // Silver/gold lock
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(7, 6, 2, 4);
      ctx.fillStyle = '#222222';
      ctx.fillRect(7, 7, 2, 1);
    });

    // TNT
    const tntSideTex = createPixelTexture((ctx) => {
      ctx.fillStyle = '#c4281b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 5, 16, 6);
      ctx.fillStyle = '#111111';
      // "TNT" letters
      ctx.fillRect(2, 6, 3, 1);
      ctx.fillRect(3, 7, 1, 3); // T
      ctx.fillRect(6, 6, 1, 4);
      ctx.fillRect(8, 6, 1, 4);
      ctx.fillRect(7, 7, 1, 2); // N
      ctx.fillRect(10, 6, 3, 1);
      ctx.fillRect(11, 7, 1, 3); // T
    });
    const tntTopTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#c4281b', ['#991b1b', '#dc2626'], 200);
      ctx.fillStyle = '#262626';
      ctx.fillRect(7, 7, 2, 2); // Fuse center
    });

    // Bookshelf
    const bookshelfTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#9c7a4f', ['#8c6b41'], 90);
      // Shelves
      ctx.fillStyle = '#543f21';
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(0, 7, 16, 2);
      ctx.fillRect(0, 14, 16, 2);
      // Books
      const bookColors = ['#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea'];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = bookColors[i % bookColors.length];
        ctx.fillRect(2 + i * 2, 2, 1, 5);
        ctx.fillStyle = bookColors[(i + 2) % bookColors.length];
        ctx.fillRect(2 + i * 2, 9, 1, 5);
      }
    });

    // Colored Wools
    const createWoolTex = (color: string, shade: string) => {
      return createPixelTexture((ctx) => {
        fillPattern(ctx, color, [shade, color], 220);
      });
    };
    const redWoolTex = createWoolTex('#dc2626', '#b91c1c');
    const blueWoolTex = createWoolTex('#2563eb', '#1d4ed8');
    const greenWoolTex = createWoolTex('#16a34a', '#15803d');
    const yellowWoolTex = createWoolTex('#eab308', '#ca8a04');
    const purpleWoolTex = createWoolTex('#9333ea', '#7e22ce');
    const pinkWoolTex = createWoolTex('#ec4899', '#db2777');

    // Flowers (transparent cutout)
    const redFlowerTex = createPixelTexture((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(7, 8, 2, 8); // stem
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(5, 4, 6, 4); // petals
      ctx.fillRect(6, 3, 4, 6);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(7, 5, 2, 2); // center
    });
    const yellowFlowerTex = createPixelTexture((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(7, 8, 2, 8); // stem
      ctx.fillStyle = '#facc15';
      ctx.fillRect(5, 4, 6, 4);
      ctx.fillRect(6, 3, 4, 6);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(7, 5, 2, 2);
    });

    // Pumpkin
    const pumpkinSideTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#d97706', ['#b45309', '#f59e0b'], 250);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(3, 0, 1, 16);
      ctx.fillRect(8, 0, 1, 16);
      ctx.fillRect(13, 0, 1, 16);
    });
    const pumpkinTopTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#d97706', ['#b45309', '#f59e0b'], 250);
      ctx.fillStyle = '#4d7c0f'; // Stem
      ctx.fillRect(7, 7, 2, 2);
    });

    // Glowstone
    const glowstoneTex = createPixelTexture((ctx) => {
      fillPattern(ctx, '#fef08a', ['#fde047', '#eab308', '#ffffff'], 270);
    });

    // Standard materials builder
    const mat = (map: THREE.Texture, transparent = false, opacity = 1.0) => {
      return new THREE.MeshStandardMaterial({
        map,
        roughness: 0.8,
        metalness: 0.1,
        transparent,
        opacity,
        alphaTest: transparent && opacity === 1.0 ? 0.3 : 0,
      });
    };

    // Multi-face box material helper
    // Three.js BoxGeometry material order: [right (+X), left (-X), top (+Y), bottom (-Y), front (+Z), back (-Z)]
    const boxMat = (sides: THREE.Texture, top: THREE.Texture, bottom: THREE.Texture, front?: THREE.Texture) => {
      const sideM = mat(sides);
      const topM = mat(top);
      const botM = mat(bottom);
      const frontM = front ? mat(front) : sideM;
      return [sideM, sideM, topM, botM, frontM, sideM];
    };

    this.materials.set(BlockType.DIRT, { material: mat(dirtTex) });
    this.materials.set(BlockType.GRASS, {
      material: boxMat(grassSideTex, grassTopTex, dirtTex),
    });
    this.materials.set(BlockType.STONE, { material: mat(stoneTex) });
    this.materials.set(BlockType.COBBLESTONE, { material: mat(cobbleTex) });
    this.materials.set(BlockType.OAK_LOG, {
      material: boxMat(logSideTex, logTopTex, logTopTex),
    });
    this.materials.set(BlockType.OAK_LEAVES, {
      material: mat(leavesTex, true, 0.95),
      isTransparent: true,
    });
    this.materials.set(BlockType.PLANKS, { material: mat(planksTex) });
    this.materials.set(BlockType.SAND, { material: mat(sandTex) });
    this.materials.set(BlockType.GLASS, {
      material: mat(glassTex, true, 0.45),
      isTransparent: true,
    });
    this.materials.set(BlockType.BRICKS, { material: mat(bricksTex) });
    this.materials.set(BlockType.COAL_ORE, { material: mat(coalOreTex) });
    this.materials.set(BlockType.IRON_ORE, { material: mat(ironOreTex) });
    this.materials.set(BlockType.GOLD_ORE, { material: mat(goldOreTex) });
    this.materials.set(BlockType.DIAMOND_ORE, { material: mat(diamondOreTex) });
    this.materials.set(BlockType.BEDROCK, { material: mat(bedrockTex) });
    this.materials.set(BlockType.CRAFTING_TABLE, {
      material: boxMat(craftSideTex, craftTopTex, planksTex, craftSideTex),
    });
    this.materials.set(BlockType.CHEST, {
      material: boxMat(chestSideTex, chestSideTex, chestSideTex, chestFrontTex),
    });
    this.materials.set(BlockType.BOOKSHELF, {
      material: boxMat(bookshelfTex, planksTex, planksTex),
    });
    this.materials.set(BlockType.RED_WOOL, { material: mat(redWoolTex) });
    this.materials.set(BlockType.BLUE_WOOL, { material: mat(blueWoolTex) });
    this.materials.set(BlockType.GREEN_WOOL, { material: mat(greenWoolTex) });
    this.materials.set(BlockType.YELLOW_WOOL, { material: mat(yellowWoolTex) });
    this.materials.set(BlockType.PURPLE_WOOL, { material: mat(purpleWoolTex) });
    this.materials.set(BlockType.PINK_WOOL, { material: mat(pinkWoolTex) });
    this.materials.set(BlockType.TNT, {
      material: boxMat(tntSideTex, tntTopTex, tntTopTex),
    });
    this.materials.set(BlockType.PUMPKIN, {
      material: boxMat(pumpkinSideTex, pumpkinTopTex, pumpkinSideTex),
    });
    this.materials.set(BlockType.GLOWSTONE, { material: mat(glowstoneTex) });
    this.materials.set(BlockType.RED_FLOWER, {
      material: mat(redFlowerTex, true, 1.0),
      isTransparent: true,
    });
    this.materials.set(BlockType.YELLOW_FLOWER, {
      material: mat(yellowFlowerTex, true, 1.0),
      isTransparent: true,
    });
    this.materials.set(BlockType.TORCH, {
      material: mat(glowstoneTex),
    });
  }

  public getMaterial(type: BlockType): THREE.Material | THREE.Material[] {
    const entry = this.materials.get(type);
    return entry ? entry.material : this.defaultMaterial;
  }
}
