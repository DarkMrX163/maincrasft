export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  OAK_LOG = 5,
  OAK_LEAVES = 6,
  PLANKS = 7,
  SAND = 8,
  GLASS = 9,
  BRICKS = 10,
  COAL_ORE = 11,
  IRON_ORE = 12,
  GOLD_ORE = 13,
  DIAMOND_ORE = 14,
  BEDROCK = 15,
  CRAFTING_TABLE = 16,
  CHEST = 17,
  FURNACE = 18,
  BOOKSHELF = 19,
  RED_WOOL = 20,
  BLUE_WOOL = 21,
  GREEN_WOOL = 22,
  YELLOW_WOOL = 23,
  PURPLE_WOOL = 24,
  PINK_WOOL = 25,
  RED_FLOWER = 26,
  YELLOW_FLOWER = 27,
  TORCH = 28,
  TNT = 29,
  WATER = 30,
  PUMPKIN = 31,
  GLOWSTONE = 32,
}

export enum ItemId {
  STICK = 101,
  COAL = 102,
  IRON_INGOT = 103,
  GOLD_INGOT = 104,
  DIAMOND = 105,
  RED_APPLE = 106,
  BREAD = 107,
  CAKE = 108,
  WOODEN_PICKAXE = 109,
  STONE_PICKAXE = 110,
  IRON_PICKAXE = 111,
  DIAMOND_PICKAXE = 112,
  WOODEN_SWORD = 113,
  IRON_SWORD = 114,
  DIAMOND_SWORD = 115,
  WOODEN_SHOVEL = 116,
  IRON_SHOVEL = 117,
  COMPASS = 118,
  GOLDEN_APPLE = 119,
}

export interface ItemDef {
  id: number;
  name: string;
  isBlock: boolean;
  blockType?: BlockType;
  iconColor: string;
  category: 'blocks' | 'tools' | 'materials' | 'food';
  maxStack: number;
  damage?: number;
  miningSpeed?: number;
  foodValue?: number;
  description?: string;
}

export interface InventorySlot {
  id: number; // BlockType or ItemId
  count: number;
}

export interface Recipe {
  id: string;
  name: string;
  gridWidth: 2 | 3;
  gridHeight: 2 | 3;
  pattern: (number | null)[]; // 4 or 9 elements
  result: { id: number; count: number };
}

export interface RemotePlayer {
  id: string;
  name: string;
  skin: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  holdingSlot: number;
  action?: string;
  isSneaking?: boolean;
  isFlying?: boolean;
  spectatingId?: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
  text: string;
  time: number;
  type?: 'chat' | 'system';
}

export interface PlayerSkin {
  id: string;
  name: string;
  emoji: string;
  headColor: string;
  bodyColor: string;
  legsColor: string;
  armsColor: string;
  hairColor: string;
  eyeColor: string;
}

export const PLAYER_SKINS: PlayerSkin[] = [
  {
    id: 'steve',
    name: 'Стив',
    emoji: '🧔',
    headColor: '#c49a6c',
    bodyColor: '#00a8a8',
    legsColor: '#2b3784',
    armsColor: '#c49a6c',
    hairColor: '#492e1b',
    eyeColor: '#1d3368',
  },
  {
    id: 'alex',
    name: 'Алекс',
    emoji: '👩',
    headColor: '#dbb184',
    bodyColor: '#5b8731',
    legsColor: '#6a513b',
    armsColor: '#dbb184',
    hairColor: '#af491e',
    eyeColor: '#1a5c37',
  },
  {
    id: 'diamond_steve',
    name: 'Алмазный Стив',
    emoji: '💎',
    headColor: '#38bdf8',
    bodyColor: '#0284c7',
    legsColor: '#0369a1',
    armsColor: '#38bdf8',
    hairColor: '#075985',
    eyeColor: '#f0fdf4',
  },
  {
    id: 'creeper_boy',
    name: 'Крипер',
    emoji: '💥',
    headColor: '#22c55e',
    bodyColor: '#16a34a',
    legsColor: '#15803d',
    armsColor: '#22c55e',
    hairColor: '#14532d',
    eyeColor: '#052e16',
  },
  {
    id: 'enderman',
    name: 'Эндермен',
    emoji: '🔮',
    headColor: '#18181b',
    bodyColor: '#09090b',
    legsColor: '#09090b',
    armsColor: '#18181b',
    hairColor: '#000000',
    eyeColor: '#c084fc',
  },
  {
    id: 'zombie',
    name: 'Зомби',
    emoji: '🧟',
    headColor: '#4ade80',
    bodyColor: '#0284c7',
    legsColor: '#1e3a8a',
    armsColor: '#4ade80',
    hairColor: '#166534',
    eyeColor: '#052e16',
  },
  {
    id: 'fox',
    name: 'Лисенок',
    emoji: '🦊',
    headColor: '#f97316',
    bodyColor: '#ea580c',
    legsColor: '#27272a',
    armsColor: '#f97316',
    hairColor: '#fff7ed',
    eyeColor: '#0284c7',
  },
  {
    id: 'red_panda',
    name: 'Пандочка',
    emoji: '🐼',
    headColor: '#f43f5e',
    bodyColor: '#be123c',
    legsColor: '#18181b',
    armsColor: '#f43f5e',
    hairColor: '#fff1f2',
    eyeColor: '#18181b',
  },
  {
    id: 'knight',
    name: 'Рыцарь',
    emoji: '🛡️',
    headColor: '#a1a1aa',
    bodyColor: '#71717a',
    legsColor: '#52525b',
    armsColor: '#71717a',
    hairColor: '#3f3f46',
    eyeColor: '#38bdf8',
  },
  {
    id: 'wizard',
    name: 'Чародей',
    emoji: '🧙',
    headColor: '#e0c09e',
    bodyColor: '#7c3aed',
    legsColor: '#5b21b6',
    armsColor: '#7c3aed',
    hairColor: '#e2e8f0',
    eyeColor: '#a855f7',
  },
];

export const ITEM_DEFS: Record<number, ItemDef> = {
  // Blocks
  [BlockType.GRASS]: {
    id: BlockType.GRASS,
    name: 'Блок травы',
    isBlock: true,
    blockType: BlockType.GRASS,
    iconColor: '#5b8a3c',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT,
    name: 'Земля',
    isBlock: true,
    blockType: BlockType.DIRT,
    iconColor: '#866043',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.STONE]: {
    id: BlockType.STONE,
    name: 'Камень',
    isBlock: true,
    blockType: BlockType.STONE,
    iconColor: '#7a7a7a',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE,
    name: 'Булыжник',
    isBlock: true,
    blockType: BlockType.COBBLESTONE,
    iconColor: '#636363',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.OAK_LOG]: {
    id: BlockType.OAK_LOG,
    name: 'Древесина дуба',
    isBlock: true,
    blockType: BlockType.OAK_LOG,
    iconColor: '#674f32',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.OAK_LEAVES]: {
    id: BlockType.OAK_LEAVES,
    name: 'Листва дуба',
    isBlock: true,
    blockType: BlockType.OAK_LEAVES,
    iconColor: '#3c6e28',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.PLANKS]: {
    id: BlockType.PLANKS,
    name: 'Дубовые доски',
    isBlock: true,
    blockType: BlockType.PLANKS,
    iconColor: '#a8824f',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.SAND]: {
    id: BlockType.SAND,
    name: 'Песок',
    isBlock: true,
    blockType: BlockType.SAND,
    iconColor: '#dbcf9a',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.GLASS]: {
    id: BlockType.GLASS,
    name: 'Стекло',
    isBlock: true,
    blockType: BlockType.GLASS,
    iconColor: '#bde0ea',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.BRICKS]: {
    id: BlockType.BRICKS,
    name: 'Кирпичи',
    isBlock: true,
    blockType: BlockType.BRICKS,
    iconColor: '#964d42',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.COAL_ORE]: {
    id: BlockType.COAL_ORE,
    name: 'Угольная руда',
    isBlock: true,
    blockType: BlockType.COAL_ORE,
    iconColor: '#2b2b2b',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.IRON_ORE]: {
    id: BlockType.IRON_ORE,
    name: 'Железная руда',
    isBlock: true,
    blockType: BlockType.IRON_ORE,
    iconColor: '#d8af93',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.GOLD_ORE]: {
    id: BlockType.GOLD_ORE,
    name: 'Золотая руда',
    isBlock: true,
    blockType: BlockType.GOLD_ORE,
    iconColor: '#fcee4b',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.DIAMOND_ORE]: {
    id: BlockType.DIAMOND_ORE,
    name: 'Алмазная руда',
    isBlock: true,
    blockType: BlockType.DIAMOND_ORE,
    iconColor: '#5decf5',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.CRAFTING_TABLE]: {
    id: BlockType.CRAFTING_TABLE,
    name: 'Верстак',
    isBlock: true,
    blockType: BlockType.CRAFTING_TABLE,
    iconColor: '#a3713f',
    category: 'blocks',
    maxStack: 64,
    description: 'Позволяет крафтить предметы в сетке 3х3',
  },
  [BlockType.CHEST]: {
    id: BlockType.CHEST,
    name: 'Сундук',
    isBlock: true,
    blockType: BlockType.CHEST,
    iconColor: '#b87d3b',
    category: 'blocks',
    maxStack: 64,
    description: 'Общий сундук для хранения вещей с друзьями',
  },
  [BlockType.FURNACE]: {
    id: BlockType.FURNACE,
    name: 'Печь',
    isBlock: true,
    blockType: BlockType.FURNACE,
    iconColor: '#5c5c5c',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.BOOKSHELF]: {
    id: BlockType.BOOKSHELF,
    name: 'Книжная полка',
    isBlock: true,
    blockType: BlockType.BOOKSHELF,
    iconColor: '#7d5c36',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.RED_WOOL]: {
    id: BlockType.RED_WOOL,
    name: 'Красная шерсть',
    isBlock: true,
    blockType: BlockType.RED_WOOL,
    iconColor: '#dc2626',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.BLUE_WOOL]: {
    id: BlockType.BLUE_WOOL,
    name: 'Синяя шерсть',
    isBlock: true,
    blockType: BlockType.BLUE_WOOL,
    iconColor: '#2563eb',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.GREEN_WOOL]: {
    id: BlockType.GREEN_WOOL,
    name: 'Зеленая шерсть',
    isBlock: true,
    blockType: BlockType.GREEN_WOOL,
    iconColor: '#16a34a',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.YELLOW_WOOL]: {
    id: BlockType.YELLOW_WOOL,
    name: 'Желтая шерсть',
    isBlock: true,
    blockType: BlockType.YELLOW_WOOL,
    iconColor: '#eab308',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.PURPLE_WOOL]: {
    id: BlockType.PURPLE_WOOL,
    name: 'Фиолетовая шерсть',
    isBlock: true,
    blockType: BlockType.PURPLE_WOOL,
    iconColor: '#9333ea',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.PINK_WOOL]: {
    id: BlockType.PINK_WOOL,
    name: 'Розовая шерсть',
    isBlock: true,
    blockType: BlockType.PINK_WOOL,
    iconColor: '#ec4899',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.RED_FLOWER]: {
    id: BlockType.RED_FLOWER,
    name: 'Красный мак',
    isBlock: true,
    blockType: BlockType.RED_FLOWER,
    iconColor: '#ef4444',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.YELLOW_FLOWER]: {
    id: BlockType.YELLOW_FLOWER,
    name: 'Одуванчик',
    isBlock: true,
    blockType: BlockType.YELLOW_FLOWER,
    iconColor: '#facc15',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.TORCH]: {
    id: BlockType.TORCH,
    name: 'Факел',
    isBlock: true,
    blockType: BlockType.TORCH,
    iconColor: '#f97316',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.TNT]: {
    id: BlockType.TNT,
    name: 'Динамит (ТНТ)',
    isBlock: true,
    blockType: BlockType.TNT,
    iconColor: '#b91c1c',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.PUMPKIN]: {
    id: BlockType.PUMPKIN,
    name: 'Тыква-фонарь',
    isBlock: true,
    blockType: BlockType.PUMPKIN,
    iconColor: '#ea580c',
    category: 'blocks',
    maxStack: 64,
  },
  [BlockType.GLOWSTONE]: {
    id: BlockType.GLOWSTONE,
    name: 'Светящийся камень',
    isBlock: true,
    blockType: BlockType.GLOWSTONE,
    iconColor: '#fde047',
    category: 'blocks',
    maxStack: 64,
  },

  // Tools & Materials
  [ItemId.STICK]: {
    id: ItemId.STICK,
    name: 'Палка',
    isBlock: false,
    iconColor: '#8a6538',
    category: 'materials',
    maxStack: 64,
  },
  [ItemId.COAL]: {
    id: ItemId.COAL,
    name: 'Уголь',
    isBlock: false,
    iconColor: '#262626',
    category: 'materials',
    maxStack: 64,
  },
  [ItemId.IRON_INGOT]: {
    id: ItemId.IRON_INGOT,
    name: 'Железный слиток',
    isBlock: false,
    iconColor: '#e2e8f0',
    category: 'materials',
    maxStack: 64,
  },
  [ItemId.GOLD_INGOT]: {
    id: ItemId.GOLD_INGOT,
    name: 'Золотой слиток',
    isBlock: false,
    iconColor: '#facc15',
    category: 'materials',
    maxStack: 64,
  },
  [ItemId.DIAMOND]: {
    id: ItemId.DIAMOND,
    name: 'Алмаз',
    isBlock: false,
    iconColor: '#38bdf8',
    category: 'materials',
    maxStack: 64,
  },
  [ItemId.RED_APPLE]: {
    id: ItemId.RED_APPLE,
    name: 'Яблоко',
    isBlock: false,
    iconColor: '#ef4444',
    category: 'food',
    maxStack: 64,
    foodValue: 4,
  },
  [ItemId.BREAD]: {
    id: ItemId.BREAD,
    name: 'Хлеб',
    isBlock: false,
    iconColor: '#ca8a04',
    category: 'food',
    maxStack: 64,
    foodValue: 5,
  },
  [ItemId.CAKE]: {
    id: ItemId.CAKE,
    name: 'Торт Дружбы',
    isBlock: false,
    iconColor: '#fbcfe8',
    category: 'food',
    maxStack: 16,
    foodValue: 10,
    description: 'Вкусный торт, чтобы угостить друзей!',
  },
  [ItemId.GOLDEN_APPLE]: {
    id: ItemId.GOLDEN_APPLE,
    name: 'Золотое яблоко',
    isBlock: false,
    iconColor: '#fde047',
    category: 'food',
    maxStack: 64,
    foodValue: 10,
  },
  [ItemId.WOODEN_PICKAXE]: {
    id: ItemId.WOODEN_PICKAXE,
    name: 'Деревянная кирка',
    isBlock: false,
    iconColor: '#a8824f',
    category: 'tools',
    maxStack: 1,
    miningSpeed: 2,
  },
  [ItemId.STONE_PICKAXE]: {
    id: ItemId.STONE_PICKAXE,
    name: 'Каменная кирка',
    isBlock: false,
    iconColor: '#9ca3af',
    category: 'tools',
    maxStack: 1,
    miningSpeed: 4,
  },
  [ItemId.IRON_PICKAXE]: {
    id: ItemId.IRON_PICKAXE,
    name: 'Железная кирка',
    isBlock: false,
    iconColor: '#e2e8f0',
    category: 'tools',
    maxStack: 1,
    miningSpeed: 6,
  },
  [ItemId.DIAMOND_PICKAXE]: {
    id: ItemId.DIAMOND_PICKAXE,
    name: 'Алмазная кирка',
    isBlock: false,
    iconColor: '#38bdf8',
    category: 'tools',
    maxStack: 1,
    miningSpeed: 10,
  },
  [ItemId.WOODEN_SWORD]: {
    id: ItemId.WOODEN_SWORD,
    name: 'Деревянный меч',
    isBlock: false,
    iconColor: '#a8824f',
    category: 'tools',
    maxStack: 1,
    damage: 4,
  },
  [ItemId.IRON_SWORD]: {
    id: ItemId.IRON_SWORD,
    name: 'Железный меч',
    isBlock: false,
    iconColor: '#cbd5e1',
    category: 'tools',
    maxStack: 1,
    damage: 6,
  },
  [ItemId.DIAMOND_SWORD]: {
    id: ItemId.DIAMOND_SWORD,
    name: 'Алмазный меч',
    isBlock: false,
    iconColor: '#38bdf8',
    category: 'tools',
    maxStack: 1,
    damage: 8,
  },
  [ItemId.WOODEN_SHOVEL]: {
    id: ItemId.WOODEN_SHOVEL,
    name: 'Деревянная лопата',
    isBlock: false,
    iconColor: '#a8824f',
    category: 'tools',
    maxStack: 1,
  },
  [ItemId.IRON_SHOVEL]: {
    id: ItemId.IRON_SHOVEL,
    name: 'Железная лопата',
    isBlock: false,
    iconColor: '#e2e8f0',
    category: 'tools',
    maxStack: 1,
  },
  [ItemId.COMPASS]: {
    id: ItemId.COMPASS,
    name: 'Компас исследователя',
    isBlock: false,
    iconColor: '#f43f5e',
    category: 'tools',
    maxStack: 1,
  },
};
