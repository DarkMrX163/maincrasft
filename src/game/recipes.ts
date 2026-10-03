import { BlockType, ItemId, Recipe } from '../types/game';

export const RECIPES: Recipe[] = [
  // 2x2 Basic Recipes
  {
    id: 'log_to_planks',
    name: 'Доски из дерева',
    gridWidth: 2,
    gridHeight: 2,
    pattern: [
      BlockType.OAK_LOG, null,
      null, null
    ],
    result: { id: BlockType.PLANKS, count: 4 },
  },
  {
    id: 'planks_to_sticks',
    name: 'Палки',
    gridWidth: 2,
    gridHeight: 2,
    pattern: [
      BlockType.PLANKS, null,
      BlockType.PLANKS, null
    ],
    result: { id: ItemId.STICK, count: 4 },
  },
  {
    id: 'crafting_table',
    name: 'Верстак',
    gridWidth: 2,
    gridHeight: 2,
    pattern: [
      BlockType.PLANKS, BlockType.PLANKS,
      BlockType.PLANKS, BlockType.PLANKS
    ],
    result: { id: BlockType.CRAFTING_TABLE, count: 1 },
  },
  {
    id: 'torch_from_coal',
    name: 'Факелы',
    gridWidth: 2,
    gridHeight: 2,
    pattern: [
      ItemId.COAL, null,
      ItemId.STICK, null
    ],
    result: { id: BlockType.TORCH, count: 4 },
  },
  {
    id: 'dirt_to_bricks',
    name: 'Кирпичи',
    gridWidth: 2,
    gridHeight: 2,
    pattern: [
      BlockType.DIRT, BlockType.DIRT,
      BlockType.DIRT, BlockType.DIRT
    ],
    result: { id: BlockType.BRICKS, count: 4 },
  },
  {
    id: 'sand_to_glass',
    name: 'Стекло',
    gridWidth: 2,
    gridHeight: 2,
    pattern: [
      BlockType.SAND, BlockType.SAND,
      BlockType.SAND, BlockType.SAND
    ],
    result: { id: BlockType.GLASS, count: 4 },
  },
  {
    id: 'wool_red',
    name: 'Красная шерсть',
    gridWidth: 2,
    gridHeight: 2,
    pattern: [
      BlockType.RED_FLOWER, BlockType.DIRT,
      null, null
    ],
    result: { id: BlockType.RED_WOOL, count: 2 },
  },
  {
    id: 'wool_yellow',
    name: 'Желтая шерсть',
    gridWidth: 2,
    gridHeight: 2,
    pattern: [
      BlockType.YELLOW_FLOWER, BlockType.DIRT,
      null, null
    ],
    result: { id: BlockType.YELLOW_WOOL, count: 2 },
  },

  // 3x3 Crafting Table Recipes
  {
    id: 'chest',
    name: 'Сундук',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
      BlockType.PLANKS, null,              BlockType.PLANKS,
      BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
    ],
    result: { id: BlockType.CHEST, count: 1 },
  },
  {
    id: 'furnace',
    name: 'Печь',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE,
      BlockType.COBBLESTONE, null,                  BlockType.COBBLESTONE,
      BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE,
    ],
    result: { id: BlockType.FURNACE, count: 1 },
  },
  {
    id: 'wooden_pickaxe',
    name: 'Деревянная кирка',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
      null,             ItemId.STICK,      null,
      null,             ItemId.STICK,      null,
    ],
    result: { id: ItemId.WOODEN_PICKAXE, count: 1 },
  },
  {
    id: 'stone_pickaxe',
    name: 'Каменная кирка',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE,
      null,                  ItemId.STICK,          null,
      null,                  ItemId.STICK,          null,
    ],
    result: { id: ItemId.STONE_PICKAXE, count: 1 },
  },
  {
    id: 'iron_pickaxe',
    name: 'Железная кирка',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      ItemId.IRON_INGOT, ItemId.IRON_INGOT, ItemId.IRON_INGOT,
      null,              ItemId.STICK,      null,
      null,              ItemId.STICK,      null,
    ],
    result: { id: ItemId.IRON_PICKAXE, count: 1 },
  },
  {
    id: 'diamond_pickaxe',
    name: 'Алмазная кирка',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      ItemId.DIAMOND, ItemId.DIAMOND, ItemId.DIAMOND,
      null,           ItemId.STICK,   null,
      null,           ItemId.STICK,   null,
    ],
    result: { id: ItemId.DIAMOND_PICKAXE, count: 1 },
  },
  {
    id: 'wooden_sword',
    name: 'Деревянный меч',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      null, BlockType.PLANKS, null,
      null, BlockType.PLANKS, null,
      null, ItemId.STICK,      null,
    ],
    result: { id: ItemId.WOODEN_SWORD, count: 1 },
  },
  {
    id: 'iron_sword',
    name: 'Железный меч',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      null, ItemId.IRON_INGOT, null,
      null, ItemId.IRON_INGOT, null,
      null, ItemId.STICK,      null,
    ],
    result: { id: ItemId.IRON_SWORD, count: 1 },
  },
  {
    id: 'diamond_sword',
    name: 'Алмазный меч',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      null, ItemId.DIAMOND, null,
      null, ItemId.DIAMOND, null,
      null, ItemId.STICK,   null,
    ],
    result: { id: ItemId.DIAMOND_SWORD, count: 1 },
  },
  {
    id: 'wooden_shovel',
    name: 'Деревянная лопата',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      null, BlockType.PLANKS, null,
      null, ItemId.STICK,      null,
      null, ItemId.STICK,      null,
    ],
    result: { id: ItemId.WOODEN_SHOVEL, count: 1 },
  },
  {
    id: 'iron_shovel',
    name: 'Железная лопата',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      null, ItemId.IRON_INGOT, null,
      null, ItemId.STICK,      null,
      null, ItemId.STICK,      null,
    ],
    result: { id: ItemId.IRON_SHOVEL, count: 1 },
  },
  {
    id: 'tnt',
    name: 'Динамит',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      ItemId.COAL,     BlockType.SAND, ItemId.COAL,
      BlockType.SAND,  ItemId.COAL,    BlockType.SAND,
      ItemId.COAL,     BlockType.SAND, ItemId.COAL,
    ],
    result: { id: BlockType.TNT, count: 1 },
  },
  {
    id: 'cake',
    name: 'Торт дружбы',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      ItemId.RED_APPLE, ItemId.RED_APPLE, ItemId.RED_APPLE,
      ItemId.BREAD,     ItemId.BREAD,     ItemId.BREAD,
      BlockType.DIRT,   BlockType.DIRT,   BlockType.DIRT,
    ],
    result: { id: ItemId.CAKE, count: 2 },
  },
  {
    id: 'golden_apple',
    name: 'Золотое яблоко',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      ItemId.GOLD_INGOT, ItemId.GOLD_INGOT, ItemId.GOLD_INGOT,
      ItemId.GOLD_INGOT, ItemId.RED_APPLE,  ItemId.GOLD_INGOT,
      ItemId.GOLD_INGOT, ItemId.GOLD_INGOT, ItemId.GOLD_INGOT,
    ],
    result: { id: ItemId.GOLDEN_APPLE, count: 1 },
  },
  {
    id: 'bookshelf',
    name: 'Книжная полка',
    gridWidth: 3,
    gridHeight: 3,
    pattern: [
      BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
      ItemId.STICK,     ItemId.STICK,     ItemId.STICK,
      BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
    ],
    result: { id: BlockType.BOOKSHELF, count: 1 },
  },
];

export function findMatchingRecipe(grid: (number | null)[], size: 2 | 3): Recipe | null {
  // Trim empty rows/cols to allow flexible placement
  for (const recipe of RECIPES) {
    if (recipe.gridWidth > size || recipe.gridHeight > size) continue;

    if (size === 2 && recipe.gridWidth === 2 && recipe.gridHeight === 2) {
      let match = true;
      for (let i = 0; i < 4; i++) {
        const itemInGrid = grid[i] ?? null;
        const itemInRecipe = recipe.pattern[i] ?? null;
        if (itemInGrid !== itemInRecipe) {
          match = false;
          break;
        }
      }
      if (match) return recipe;
    } else if (size === 3) {
      if (recipe.gridWidth === 3 && recipe.gridHeight === 3) {
        let match = true;
        for (let i = 0; i < 9; i++) {
          const itemInGrid = grid[i] ?? null;
          const itemInRecipe = recipe.pattern[i] ?? null;
          if (itemInGrid !== itemInRecipe) {
            match = false;
            break;
          }
        }
        if (match) return recipe;
      }
    }
  }
  return null;
}
