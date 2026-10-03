import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  BlockType,
  ItemId,
  InventorySlot,
  RemotePlayer,
  ChatMessage,
  PLAYER_SKINS,
  ITEM_DEFS,
} from './types/game';
import { TextureManager } from './game/textures';
import { VoxelWorld, getTerrainHeight, ChestContent } from './game/world';
import { PlayerCharacter } from './game/playerModel';
import { NetworkManager } from './game/network';
import { sounds } from './game/audio';
import { WeatherSystem, WeatherType } from './game/weather';

import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { ChatModal } from './components/ChatModal';
import { InventoryModal } from './components/InventoryModal';
import { ChestModal } from './components/ChestModal';
import { SpectatorModal } from './components/SpectatorModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { CharacterModal } from './components/CharacterModal';

// Starting inventory for new kids
const DEFAULT_STARTING_INVENTORY: InventorySlot[] = [
  // Hotbar (0 to 8)
  { id: ItemId.STONE_PICKAXE, count: 1 },
  { id: BlockType.OAK_LOG, count: 16 },
  { id: BlockType.PLANKS, count: 32 },
  { id: BlockType.TORCH, count: 16 },
  { id: BlockType.BRICKS, count: 24 },
  { id: BlockType.GLASS, count: 16 },
  { id: BlockType.RED_WOOL, count: 16 },
  { id: ItemId.RED_APPLE, count: 8 },
  { id: BlockType.CRAFTING_TABLE, count: 1 },
  // Main inventory (9 to 35) empty or starter materials
  ...Array.from({ length: 27 }).map((_, i) => {
    if (i === 0) return { id: BlockType.DIRT, count: 32 };
    if (i === 1) return { id: BlockType.COBBLESTONE, count: 32 };
    if (i === 2) return { id: ItemId.CAKE, count: 2 };
    return { id: 0, count: 0 };
  }),
];

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // User State
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('cw_player_name') || 'Строитель_' + Math.floor(Math.random() * 900 + 100);
  });
  const [playerSkin, setPlayerSkin] = useState(() => {
    return localStorage.getItem('cw_player_skin') || 'steve';
  });
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || localStorage.getItem('cw_room_id') || 'WORLD-1';
  });

  // Weather State
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [playerYaw, setPlayerYaw] = useState<number>(0);

  // Gameplay State
  const [inventory, setInventory] = useState<InventorySlot[]>(() => {
    try {
      const saved = localStorage.getItem('cw_inventory');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_STARTING_INVENTORY;
  });
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [health, setHealth] = useState(20);
  const [isFlying, setIsFlying] = useState(false);
  const [isSneaking, setIsSneaking] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 12, z: 0 });
  const [gameTime, setGameTime] = useState(6000); // 6:00 AM morning
  const [onlineCount, setOnlineCount] = useState(1);
  const [lastSavedTime, setLastSavedTime] = useState(Date.now());

  // Spectator State
  const [isSpectating, setIsSpectating] = useState(false);
  const [spectatingTarget, setSpectatingTarget] = useState<RemotePlayer | null>(null);
  const [isFreeFlying, setIsFreeFlying] = useState(false);

  // Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [isChestOpen, setIsChestOpen] = useState(false);
  const [activeChestPos, setActiveChestPos] = useState({ x: 0, y: 0, z: 0 });
  const [activeChestItems, setActiveChestItems] = useState<ChestContent[]>([]);
  const [isSpectatorModalOpen, setIsSpectatorModalOpen] = useState(false);
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);

  // Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [remotePlayersList, setRemotePlayersList] = useState<RemotePlayer[]>([]);

  // References for Three.js Game Loop
  const gameRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    sunLight: THREE.DirectionalLight;
    moonLight: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    skyMesh: THREE.Mesh;
    world: VoxelWorld;
    textureManager: TextureManager;
    network: NetworkManager;
    weatherSystem: WeatherSystem;
    player: {
      pos: THREE.Vector3;
      velocity: THREE.Vector3;
      isGrounded: boolean;
      eyeHeight: number;
    };
    remotePlayers: Map<string, PlayerCharacter>;
    highlightBox: THREE.LineSegments;
    crackMesh: THREE.Mesh;
    miningBlock: { x: number; y: number; z: number; progress: number; startTime: number } | null;
    isPointerLocked: boolean;
    keys: Record<string, boolean>;
    touchMove: { forward: number; strafe: number };
    touchMining: boolean;
    touchLooking: boolean;
    prevTouchPos: { x: number; y: number };
    velocity: THREE.Vector3;
    cameraEuler: THREE.Euler;
    clock: THREE.Clock;
  } | null>(null);

  // Save inventory to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem('cw_inventory', JSON.stringify(inventory));
    } catch (e) {}
  }, [inventory]);

  // Save player preferences
  useEffect(() => {
    localStorage.setItem('cw_player_name', playerName);
    localStorage.setItem('cw_player_skin', playerSkin);
    localStorage.setItem('cw_room_id', roomId);
  }, [playerName, playerSkin, roomId]);

  // Cloud Auto-save every 30 seconds
  const handleCloudSave = useCallback(async () => {
    if (!gameRef.current) return;
    const worldData = gameRef.current.world.exportWorldData();

    try {
      await fetch(`/api/rooms/${roomId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockChanges: worldData.blocks,
          chests: worldData.chests,
        }),
      });
      setLastSavedTime(Date.now());
    } catch (err) {
      console.warn('Could not auto-save to cloud:', err);
    }
  }, [roomId]);

  useEffect(() => {
    const timer = setInterval(() => {
      handleCloudSave();
    }, 30000);
    return () => clearInterval(timer);
  }, [handleCloudSave]);

  // Change weather handler
  const handleChangeWeather = (newWeather: WeatherType) => {
    setWeather(newWeather);
    if (gameRef.current) {
      gameRef.current.weatherSystem.setWeather(newWeather);
      gameRef.current.network.sendWeatherChange(newWeather);
    }
  };

  // Initialize Three.js Game Scene & Loop
  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x78a7ff);
    scene.fog = new THREE.FogExp2(0x78a7ff, 0.018);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    mountRef.current.replaceChildren(renderer.domElement);

    // 2. Lighting & Sky
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 100;
    const d = 25;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const moonLight = new THREE.DirectionalLight(0x4060ff, 0.2);
    moonLight.position.set(-30, -50, -20);
    scene.add(moonLight);

    // Sky dome sphere
    const skyGeo = new THREE.SphereGeometry(90, 16, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x78a7ff,
      side: THREE.BackSide,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // 3. Texture Manager & Voxel World
    const textureManager = new TextureManager();
    const world = new VoxelWorld(12345, textureManager);
    world.updateChunksAroundPlayer(0, 0, 3);
    scene.add(world.blockGroup);

    // 4. Dynamic Weather System
    const weatherSystem = new WeatherSystem(scene);

    // 5. Target Highlight Box & Crack overlay
    const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
    const highlightLineMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
    });
    const highlightBox = new THREE.LineSegments(highlightEdges, highlightLineMat);
    highlightBox.visible = false;
    scene.add(highlightBox);

    const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const crackMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.8,
      depthTest: true,
      depthWrite: false,
    });
    const crackMesh = new THREE.Mesh(crackGeo, crackMat);
    crackMesh.visible = false;
    scene.add(crackMesh);

    // Player State (Jitter-free physics)
    const spawnY = getTerrainHeight(0, 0, world.seed) + 1.0;
    const playerState = {
      pos: new THREE.Vector3(0.5, spawnY, 0.5),
      velocity: new THREE.Vector3(0, 0, 0),
      isGrounded: true,
      eyeHeight: 1.62,
    };
    camera.position.set(
      playerState.pos.x,
      playerState.pos.y + playerState.eyeHeight,
      playerState.pos.z
    );

    // 6. Network Manager
    const remotePlayers = new Map<string, PlayerCharacter>();

    const network = new NetworkManager({
      onInit: (data) => {
        setOnlineCount(data.players.length + 1);
        if (data.seed && data.seed !== world.seed) {
          world.seed = data.seed;
          world.worldMap.clear();
          world.customEdits.clear();
          world.generatedChunks.clear();
          world.loadedMeshChunks.clear();
        }

        if (data.weather) {
          const w = data.weather as WeatherType;
          setWeather(w);
          weatherSystem.setWeather(w);
        }

        // Apply remote block changes
        if (data.blockChanges) {
          Object.entries(data.blockChanges).forEach(([key, blockId]) => {
            const [x, y, z] = key.split(',').map(Number);
            world.applyRemoteBlockChange(x, y, z, blockId);
          });
        }

        // Apply chests
        if (data.chests) {
          Object.entries(data.chests).forEach(([key, items]) => {
            world.chests.set(key, items);
          });
        }

        // Load chunks around spawn
        world.updateChunksAroundPlayer(playerState.pos.x, playerState.pos.z, 3);

        // Spawn existing remote players
        data.players.forEach((p) => {
          if (!remotePlayers.has(p.id)) {
            const char = new PlayerCharacter(p.id, p.name, p.skin, p.color);
            char.group.position.set(p.x, p.y, p.z);
            char.targetPos.set(p.x, p.y, p.z);
            scene.add(char.group);
            remotePlayers.set(p.id, char);
          }
        });

        setRemotePlayersList(data.players);
        setChatMessages(data.chatMessages || []);
      },

      onPlayerJoined: (player) => {
        if (!remotePlayers.has(player.id)) {
          const char = new PlayerCharacter(player.id, player.name, player.skin, player.color);
          char.group.position.set(player.x, player.y, player.z);
          char.targetPos.set(player.x, player.y, player.z);
          scene.add(char.group);
          remotePlayers.set(player.id, char);
        }
        setOnlineCount((c) => c + 1);
        setRemotePlayersList((list) => [...list.filter((p) => p.id !== player.id), player]);
        sounds.playTreasureFound();
      },

      onPlayerLeft: (playerId) => {
        const char = remotePlayers.get(playerId);
        if (char) {
          scene.remove(char.group);
          remotePlayers.delete(playerId);
        }
        setOnlineCount((c) => Math.max(1, c - 1));
        setRemotePlayersList((list) => list.filter((p) => p.id !== playerId));
      },

      onPlayerMoved: (data) => {
        const char = remotePlayers.get(data.playerId);
        if (char) {
          char.targetPos.set(data.x, data.y, data.z);
          char.targetYaw = data.yaw;
          char.targetPitch = data.pitch;
          char.isMoving = true;
          if (data.holdingSlot !== undefined) {
            const itemDef = ITEM_DEFS[data.holdingSlot];
            char.setHeldItem(itemDef ? itemDef.iconColor : null);
          }
        }
        // Update list coordinates
        setRemotePlayersList((list) =>
          list.map((p) =>
            p.id === data.playerId
              ? { ...p, x: data.x, y: data.y, z: data.z, yaw: data.yaw, pitch: data.pitch }
              : p
          )
        );
      },

      onBlockUpdated: (data) => {
        world.applyRemoteBlockChange(data.x, data.y, data.z, data.blockId);
        if (data.blockId === 0) {
          sounds.playBlockBreak();
        } else {
          sounds.playBlockPlace();
        }
      },

      onChestUpdated: (data) => {
        const key = world.getBlockKey(data.x, data.y, data.z);
        world.chests.set(key, data.items);
        if (
          isChestOpen &&
          activeChestPos.x === data.x &&
          activeChestPos.y === data.y &&
          activeChestPos.z === data.z
        ) {
          setActiveChestItems(data.items);
        }
      },

      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev.slice(-90), msg]);
        sounds.playChatPop();
      },

      onWorldReset: (newSeed) => {
        world.importWorldData({ seed: newSeed });
        world.updateChunksAroundPlayer(playerState.pos.x, playerState.pos.z, 2);
        sounds.playExplosion();
      },

      onWeatherChanged: (newWeather) => {
        setWeather(newWeather);
        weatherSystem.setWeather(newWeather);
      },

      onConnectionStatus: () => {},
    });

    network.connect(roomId, playerName, playerSkin, '#3b82f6');

    // 7. Game Reference initialization
    const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    gameRef.current = {
      scene,
      camera,
      renderer,
      sunLight,
      moonLight,
      ambientLight,
      skyMesh,
      world,
      textureManager,
      network,
      weatherSystem,
      player: playerState,
      remotePlayers,
      highlightBox,
      crackMesh,
      miningBlock: null,
      isPointerLocked: false,
      keys: {},
      touchMove: { forward: 0, strafe: 0 },
      touchMining: false,
      touchLooking: false,
      prevTouchPos: { x: 0, y: 0 },
      velocity: new THREE.Vector3(),
      cameraEuler,
      clock: new THREE.Clock(),
    };

    // 8. Input Event Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in chat or modals
      if (
        isChatOpen ||
        isInventoryOpen ||
        isChestOpen ||
        isSpectatorModalOpen ||
        isMultiplayerModalOpen ||
        isCharacterModalOpen
      ) {
        if (e.key === 'Escape') {
          setIsChatOpen(false);
          setIsInventoryOpen(false);
          setIsWorkbenchOpen(false);
          setIsChestOpen(false);
          setIsSpectatorModalOpen(false);
          setIsMultiplayerModalOpen(false);
          setIsCharacterModalOpen(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (isSpectating) {
          setIsSpectating(false);
          setSpectatingTarget(null);
        }
        return;
      }

      if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
        setIsInventoryOpen((prev) => !prev);
        setIsWorkbenchOpen(false);
        document.exitPointerLock?.();
        return;
      }

      if (e.key === 'Enter' || e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') {
        setIsChatOpen(true);
        document.exitPointerLock?.();
        return;
      }

      if (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М') {
        setIsSpectatorModalOpen((prev) => !prev);
        document.exitPointerLock?.();
        return;
      }

      if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        setIsFlying((prev) => !prev);
        return;
      }

      // Hotbar selection 1-9
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        setSelectedSlot(num - 1);
        sounds.playStep();
        return;
      }

      if (gameRef.current) {
        gameRef.current.keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          setIsSneaking(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameRef.current) {
        gameRef.current.keys[e.code] = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          setIsSneaking(false);
        }
      }
    };

    // Pointer Lock & Mouse Look
    const handleCanvasClick = () => {
      if (
        !isChatOpen &&
        !isInventoryOpen &&
        !isChestOpen &&
        !isSpectatorModalOpen &&
        !isMultiplayerModalOpen &&
        !isCharacterModalOpen
      ) {
        renderer.domElement.requestPointerLock?.();
      }
    };

    const handlePointerLockChange = () => {
      if (gameRef.current) {
        gameRef.current.isPointerLocked = document.pointerLockElement === renderer.domElement;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!gameRef.current || !gameRef.current.isPointerLocked) return;

      const sensitivity = 0.0022;
      cameraEuler.y -= e.movementX * sensitivity;
      cameraEuler.x -= e.movementY * sensitivity;
      // Clamp pitch -89 to +89 degrees
      cameraEuler.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, cameraEuler.x));

      camera.quaternion.setFromEuler(cameraEuler);
    };

    // Mouse wheel for hotbar
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        setSelectedSlot((s) => (s + 1) % 9);
      } else {
        setSelectedSlot((s) => (s - 1 + 9) % 9);
      }
    };

    // Mouse Down (Mining or Placing)
    const handleMouseDown = (e: MouseEvent) => {
      if (!gameRef.current || !gameRef.current.isPointerLocked) return;

      if (e.button === 0) {
        startMining();
      } else if (e.button === 2) {
        interactOrPlace();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && gameRef.current) {
        stopMining();
      }
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    // Touch Look drag for tablets/phones
    const handleTouchStart = (e: TouchEvent) => {
      if (e.target === renderer.domElement && e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.clientX > window.innerWidth * 0.35) {
          if (gameRef.current) {
            gameRef.current.touchLooking = true;
            gameRef.current.prevTouchPos = { x: touch.clientX, y: touch.clientY };
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (gameRef.current && gameRef.current.touchLooking && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - gameRef.current.prevTouchPos.x;
        const dy = touch.clientY - gameRef.current.prevTouchPos.y;
        gameRef.current.prevTouchPos = { x: touch.clientX, y: touch.clientY };

        const touchSensitivity = 0.0035;
        cameraEuler.y -= dx * touchSensitivity;
        cameraEuler.x -= dy * touchSensitivity;
        cameraEuler.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, cameraEuler.x));
        camera.quaternion.setFromEuler(cameraEuler);
      }
    };

    const handleTouchEnd = () => {
      if (gameRef.current) {
        gameRef.current.touchLooking = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const dom = renderer.domElement;
    dom.addEventListener('click', handleCanvasClick);
    dom.addEventListener('touchstart', handleTouchStart);
    dom.addEventListener('touchmove', handleTouchMove);
    dom.addEventListener('touchend', handleTouchEnd);
    dom.addEventListener('touchcancel', handleTouchEnd);

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. Mining & Interaction logic
    const getRaycastHit = () => {
      if (!gameRef.current) return null;
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      return world.raycast(camera.position, cameraDir, 5.5);
    };

    const startMining = () => {
      const hit = getRaycastHit();
      if (hit && hit.blockType !== BlockType.BEDROCK && gameRef.current) {
        gameRef.current.miningBlock = {
          x: hit.coord.x,
          y: hit.coord.y,
          z: hit.coord.z,
          progress: 0,
          startTime: performance.now(),
        };
        sounds.playBlockBreak();
      }
    };

    const stopMining = () => {
      if (gameRef.current) {
        gameRef.current.miningBlock = null;
        if (crackMesh) crackMesh.visible = false;
      }
    };

    const interactOrPlace = () => {
      const hit = getRaycastHit();
      if (!hit) return;

      // 1. Check if clicking on Chest
      if (hit.blockType === BlockType.CHEST) {
        const key = world.getBlockKey(hit.coord.x, hit.coord.y, hit.coord.z);
        const existingItems = world.chests.get(key) || [];
        setActiveChestPos(hit.coord);
        setActiveChestItems(existingItems);
        setIsChestOpen(true);
        sounds.playChestOpen();
        document.exitPointerLock?.();
        return;
      }

      // 2. Check if clicking on Crafting Table
      if (hit.blockType === BlockType.CRAFTING_TABLE) {
        setIsWorkbenchOpen(true);
        setIsInventoryOpen(true);
        sounds.playCraftSuccess();
        document.exitPointerLock?.();
        return;
      }

      // 3. Place block from selected hotbar slot
      setInventory((prevInv) => {
        const active = prevInv[selectedSlot];
        if (!active || active.count <= 0) return prevInv;

        const def = ITEM_DEFS[active.id];
        if (!def || !def.isBlock || !def.blockType) return prevInv;

        // Target placement position = hit.coord + normal
        const placeX = hit.coord.x + Math.round(hit.normal.x);
        const placeY = hit.coord.y + Math.round(hit.normal.y);
        const placeZ = hit.coord.z + Math.round(hit.normal.z);

        // Do not place inside player's body
        if (gameRef.current) {
          const p = gameRef.current.player;
          const pX = Math.round(p.pos.x - 0.5);
          const pY1 = Math.round(p.pos.y);
          const pY2 = Math.round(p.pos.y + 1);
          const pZ = Math.round(p.pos.z - 0.5);

          if (placeX === pX && placeZ === pZ && (placeY === pY1 || placeY === pY2)) {
            return prevInv; // Block blocked by player
          }
        }

        // Place block in world
        world.setBlock(placeX, placeY, placeZ, def.blockType);
        network.sendBlockUpdate(placeX, placeY, placeZ, def.blockType);
        sounds.playBlockPlace();

        // If placing TNT, allow ignition sound
        if (def.blockType === BlockType.TNT) {
          sounds.playExplosion();
        }

        // Deduct 1 from hotbar
        const newInv = [...prevInv];
        if (active.count > 1) {
          newInv[selectedSlot] = { ...active, count: active.count - 1 };
        } else {
          newInv[selectedSlot] = { id: 0, count: 0 };
        }
        return newInv;
      });
    };

    // 10. Main Animation Loop (Jitter-free physics + dynamic weather)
    let animationFrameId: number;
    let localTime = 6000;
    let lastNetworkSync = 0;
    let lastTimeSync = 0;
    let lastPosSync = 0;
    let lastYawSync = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min(gameRef.current?.clock.getDelta() || 0.016, 0.05);

      // Advance game day/night time
      localTime = (localTime + delta * 40) % 24000;

      // Throttle React state update of gameTime to 1Hz (prevents 60 FPS re-renders of entire React tree!)
      const now = performance.now();
      if (now - lastTimeSync > 1000) {
        lastTimeSync = now;
        setGameTime(Math.floor(localTime));
      }

      const isNight = localTime > 13000 && localTime < 23000;

      // Sun & Moon orbital rotation
      const timeAngle = (localTime / 24000) * Math.PI * 2 - Math.PI / 2;
      const sunDist = 65;
      sunLight.position.set(
        Math.cos(timeAngle) * sunDist,
        Math.sin(timeAngle) * sunDist,
        20
      );
      moonLight.position.set(
        -Math.cos(timeAngle) * sunDist,
        -Math.sin(timeAngle) * sunDist,
        -20
      );

      // Update Weather System & Particle effects
      const weatherVisuals = weatherSystem.update(delta, camera.position, isNight);

      // Smoothly update environment lighting and fog according to weather
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(weatherVisuals.skyColor, delta * 2.5);
      }
      if (scene.fog) {
        scene.fog.color.lerp(weatherVisuals.fogColor, delta * 2.5);
        if ('density' in scene.fog) {
          scene.fog.density = THREE.MathUtils.lerp(
            scene.fog.density,
            weatherVisuals.fogDensity,
            delta * 2.5
          );
        }
      }
      (skyMesh.material as THREE.MeshBasicMaterial).color.lerp(
        weatherVisuals.skyColor,
        delta * 2.5
      );
      sunLight.intensity = THREE.MathUtils.lerp(
        sunLight.intensity,
        weatherVisuals.sunIntensity,
        delta * 2.5
      );
      ambientLight.intensity = THREE.MathUtils.lerp(
        ambientLight.intensity,
        weatherVisuals.ambientIntensity,
        delta * 2.5
      );
      ambientLight.color.lerp(weatherVisuals.ambientColor, delta * 2.5);

      // Sky mesh follows camera
      skyMesh.position.copy(camera.position);

      // Spectator target camera following
      if (isSpectating && spectatingTarget) {
        const targetPos = new THREE.Vector3(
          spectatingTarget.x + 0.5,
          spectatingTarget.y + 1.6,
          spectatingTarget.z + 0.5
        );

        const offset = new THREE.Vector3(0, 0.8, 2.5).applyEuler(
          new THREE.Euler(0, spectatingTarget.yaw || 0, 0)
        );
        camera.position.lerp(targetPos.clone().add(offset), delta * 8);
        camera.lookAt(targetPos);
      } else {
        // JITTER-FREE PLAYER PHYSICS & CAMERA CONTROLLER
        if (gameRef.current) {
          const { keys, touchMove, player } = gameRef.current;

          // Input direction
          let moveF = 0;
          let moveS = 0;

          if (keys['KeyW'] || keys['ArrowUp']) moveF += 1;
          if (keys['KeyS'] || keys['ArrowDown']) moveF -= 1;
          if (keys['KeyA'] || keys['ArrowLeft']) moveS -= 1;
          if (keys['KeyD'] || keys['ArrowRight']) moveS += 1;

          // Merge touch joystick
          if (touchMove.forward !== 0 || touchMove.strafe !== 0) {
            moveF = touchMove.forward;
            moveS = touchMove.strafe;
          }

          // Camera forward & right vectors (ignoring pitch for ground walking)
          const forward = new THREE.Vector3(0, 0, -1).applyEuler(
            new THREE.Euler(0, cameraEuler.y, 0)
          );
          const right = new THREE.Vector3(1, 0, 0).applyEuler(
            new THREE.Euler(0, cameraEuler.y, 0)
          );

          const moveDir = new THREE.Vector3()
            .addScaledVector(forward, moveF)
            .addScaledVector(right, moveS);

          if (moveDir.lengthSq() > 1) {
            moveDir.normalize();
          }

          const speed = isFlying || isFreeFlying ? 12 : isSneaking ? 2.5 : 5.2;

          if (isFlying || isFreeFlying) {
            // Free Flying / Creative mode
            player.velocity.x = moveDir.x * speed;
            player.velocity.z = moveDir.z * speed;

            if (keys['Space']) player.velocity.y = speed;
            else if (keys['ShiftLeft'] || isSneaking) player.velocity.y = -speed;
            else player.velocity.y = 0;

            player.pos.addScaledVector(player.velocity, delta);
            player.isGrounded = false;
          } else {
            // JITTER-FREE WALKING & GRAVITY PHYSICS
            const r = 0.28; // footprint collision half-width

            // 1. Check ground support beneath feet
            // A probe slightly below player feet (0.05 margin)
            const probeY = Math.floor(player.pos.y - 0.05);
            const corners = [
              [player.pos.x - r, player.pos.z - r],
              [player.pos.x + r, player.pos.z - r],
              [player.pos.x - r, player.pos.z + r],
              [player.pos.x + r, player.pos.z + r],
            ];

            let highestSolidTop: number | null = null;
            for (const [cx, cz] of corners) {
              if (world.isSolid(Math.floor(cx), probeY, Math.floor(cz))) {
                const top = probeY + 1.0;
                if (highestSolidTop === null || top > highestSolidTop) {
                  highestSolidTop = top;
                }
              }
            }

            if (
              highestSolidTop !== null &&
              player.pos.y <= highestSolidTop + 0.15 &&
              player.velocity.y <= 0
            ) {
              // Firmly resting on ground - NO vertical jitter!
              player.pos.y = highestSolidTop;
              player.velocity.y = 0;
              player.isGrounded = true;

              // Jump if pressed
              if (keys['Space']) {
                player.velocity.y = 8.5;
                player.isGrounded = false;
                sounds.playJump();
              }
            } else {
              // In the air (jumping or falling)
              player.isGrounded = false;
              player.velocity.y -= 24 * delta; // standard gravity
              player.velocity.y = Math.max(-28, player.velocity.y); // terminal velocity

              const nextY = player.pos.y + player.velocity.y * delta;
              // Check landing during fall
              const nextProbeY = Math.floor(nextY);
              let landed = false;
              for (const [cx, cz] of corners) {
                if (world.isSolid(Math.floor(cx), nextProbeY, Math.floor(cz))) {
                  player.pos.y = nextProbeY + 1.0;
                  player.velocity.y = 0;
                  player.isGrounded = true;
                  landed = true;
                  break;
                }
              }
              if (!landed) {
                player.pos.y = nextY;
              }
            }

            // 2. Horizontal Movement with smooth axis-aligned wall sliding
            player.velocity.x = moveDir.x * speed;
            player.velocity.z = moveDir.z * speed;

            // X axis movement
            if (player.velocity.x !== 0) {
              const nextX = player.pos.x + player.velocity.x * delta;
              const testX = player.velocity.x > 0 ? nextX + r : nextX - r;
              let collidesX = false;
              for (let hy = 0.2; hy <= (isSneaking ? 1.3 : 1.65); hy += 0.6) {
                const blockY = Math.floor(player.pos.y + hy);
                if (
                  world.isSolid(Math.floor(testX), blockY, Math.floor(player.pos.z - r * 0.8)) ||
                  world.isSolid(Math.floor(testX), blockY, Math.floor(player.pos.z + r * 0.8))
                ) {
                  collidesX = true;
                  break;
                }
              }

              // Sneaking ledge check: don't step into empty air
              if (isSneaking && player.isGrounded && !collidesX) {
                const groundBelow = world.isSolid(
                  Math.floor(nextX),
                  Math.floor(player.pos.y - 0.5),
                  Math.floor(player.pos.z)
                );
                if (!groundBelow) collidesX = true;
              }

              if (!collidesX) {
                player.pos.x = nextX;
              }
            }

            // Z axis movement
            if (player.velocity.z !== 0) {
              const nextZ = player.pos.z + player.velocity.z * delta;
              const testZ = player.velocity.z > 0 ? nextZ + r : nextZ - r;
              let collidesZ = false;
              for (let hy = 0.2; hy <= (isSneaking ? 1.3 : 1.65); hy += 0.6) {
                const blockY = Math.floor(player.pos.y + hy);
                if (
                  world.isSolid(Math.floor(player.pos.x - r * 0.8), blockY, Math.floor(testZ)) ||
                  world.isSolid(Math.floor(player.pos.x + r * 0.8), blockY, Math.floor(testZ))
                ) {
                  collidesZ = true;
                  break;
                }
              }

              // Sneaking ledge check
              if (isSneaking && player.isGrounded && !collidesZ) {
                const groundBelow = world.isSolid(
                  Math.floor(player.pos.x),
                  Math.floor(player.pos.y - 0.5),
                  Math.floor(nextZ)
                );
                if (!groundBelow) collidesZ = true;
              }

              if (!collidesZ) {
                player.pos.z = nextZ;
              }
            }
          }

          // Smooth Eye Height adjustment (no popping)
          const targetEye = isSneaking ? 1.35 : 1.62;
          player.eyeHeight = THREE.MathUtils.lerp(player.eyeHeight, targetEye, delta * 14);

          // Position Camera at player feet + smooth eye height
          camera.position.set(player.pos.x, player.pos.y + player.eyeHeight, player.pos.z);

          // Throttled HUD position and orientation for MiniMap (10 FPS prevents React re-render lag)
          if (now - lastPosSync > 100) {
            lastPosSync = now;
            setPlayerPos((prev) => {
              const curY = player.pos.y + player.eyeHeight;
              if (
                Math.abs(prev.x - player.pos.x) > 0.08 ||
                Math.abs(prev.y - curY) > 0.08 ||
                Math.abs(prev.z - player.pos.z) > 0.08
              ) {
                return { x: player.pos.x, y: curY, z: player.pos.z };
              }
              return prev;
            });
          }
          if (now - lastYawSync > 100) {
            lastYawSync = now;
            setPlayerYaw(cameraEuler.y);
          }

          // Dynamic infinite chunk streaming in horizontal width and vertical depth
          world.updateChunksAroundPlayer(player.pos.x, player.pos.z, 2);
          world.processChunkQueue();

          // Network movement broadcast (throttled to ~25Hz)
          if (now - lastNetworkSync > 40) {
            lastNetworkSync = now;
            network.sendPosition(
              player.pos.x - 0.5,
              player.pos.y,
              player.pos.z - 0.5,
              cameraEuler.y,
              cameraEuler.x,
              selectedSlot,
              isSneaking,
              isFlying
            );
          }
        }
      }

      // Update Remote Player Animations
      remotePlayers.forEach((char) => {
        char.updateAnimation(delta, char.targetPos.y < 0);
      });

      // Raycast highlight & mining progress
      const hit = getRaycastHit();
      if (hit && !isSpectating) {
        highlightBox.position.set(hit.coord.x + 0.5, hit.coord.y + 0.5, hit.coord.z + 0.5);
        highlightBox.visible = true;

        // Mining in progress
        if (gameRef.current?.miningBlock) {
          const m = gameRef.current.miningBlock;
          if (m.x === hit.coord.x && m.y === hit.coord.y && m.z === hit.coord.z) {
            const toolItem = inventory[selectedSlot];
            const def = toolItem && toolItem.id ? ITEM_DEFS[toolItem.id] : null;
            const miningSpeed = def?.miningSpeed || 1;

            m.progress += (delta * miningSpeed) / 0.8;

            crackMesh.position.copy(highlightBox.position);
            crackMesh.visible = true;

            const crackTex = textureManager.getBreakTexture(m.progress);
            if (crackTex) {
              (crackMesh.material as THREE.MeshBasicMaterial).map = crackTex;
              (crackMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
            }

            if (m.progress >= 1.0) {
              // Block broken!
              world.setBlock(m.x, m.y, m.z, BlockType.AIR);
              network.sendBlockUpdate(m.x, m.y, m.z, BlockType.AIR);
              sounds.playBlockBreak();

              // Add drop to inventory
              let dropId: number = hit.blockType;
              let dropCount = 1;

              if (hit.blockType === BlockType.STONE) dropId = BlockType.COBBLESTONE;
              else if (hit.blockType === BlockType.COAL_ORE) dropId = ItemId.COAL;
              else if (hit.blockType === BlockType.IRON_ORE) dropId = BlockType.IRON_ORE;
              else if (hit.blockType === BlockType.DIAMOND_ORE) {
                dropId = ItemId.DIAMOND;
                sounds.playTreasureFound();
              } else if (hit.blockType === BlockType.OAK_LEAVES) {
                if (Math.random() > 0.8) dropId = ItemId.RED_APPLE;
                else dropId = 0;
              }

              if (dropId > 0) {
                setInventory((prev) => {
                  const newInv = [...prev];
                  let rem = dropCount;
                  for (let i = 0; i < newInv.length; i++) {
                    if (newInv[i].id === dropId && newInv[i].count < 64) {
                      newInv[i].count++;
                      rem--;
                      break;
                    }
                  }
                  if (rem > 0) {
                    for (let i = 0; i < newInv.length; i++) {
                      if (!newInv[i].id || newInv[i].count === 0) {
                        newInv[i] = { id: dropId, count: 1 };
                        break;
                      }
                    }
                  }
                  return newInv;
                });
              }

              stopMining();
            }
          } else {
            stopMining();
          }
        } else {
          crackMesh.visible = false;
        }
      } else {
        highlightBox.visible = false;
        crackMesh.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);

      dom.removeEventListener('click', handleCanvasClick);
      dom.removeEventListener('touchstart', handleTouchStart);
      dom.removeEventListener('touchmove', handleTouchMove);
      dom.removeEventListener('touchend', handleTouchEnd);
      dom.removeEventListener('touchcancel', handleTouchEnd);

      weatherSystem.dispose();
      network.disconnect();
      renderer.dispose();
    };
  }, [roomId, selectedSlot, isSpectating, spectatingTarget, isSneaking, isFlying, isFreeFlying]);

  // Touch control handlers
  const handleTouchMoveChange = (move: { forward: number; strafe: number }) => {
    if (gameRef.current) {
      gameRef.current.touchMove = move;
    }
  };

  const handleTouchJumpStart = () => {
    if (gameRef.current) {
      gameRef.current.keys['Space'] = true;
    }
  };

  const handleTouchJumpEnd = () => {
    if (gameRef.current) {
      gameRef.current.keys['Space'] = false;
    }
  };

  const handleTouchMineStart = () => {
    if (!gameRef.current) return;
    const cameraDir = new THREE.Vector3();
    gameRef.current.camera.getWorldDirection(cameraDir);
    const hit = gameRef.current.world.raycast(
      gameRef.current.camera.position,
      cameraDir,
      5.5
    );
    if (hit && hit.blockType !== BlockType.BEDROCK) {
      gameRef.current.miningBlock = {
        x: hit.coord.x,
        y: hit.coord.y,
        z: hit.coord.z,
        progress: 0,
        startTime: performance.now(),
      };
      sounds.playBlockBreak();
    }
  };

  const handleTouchMineEnd = () => {
    if (gameRef.current) {
      gameRef.current.miningBlock = null;
      gameRef.current.crackMesh.visible = false;
    }
  };

  const handleTouchPlaceBlock = () => {
    if (!gameRef.current) return;
    const cameraDir = new THREE.Vector3();
    gameRef.current.camera.getWorldDirection(cameraDir);
    const hit = gameRef.current.world.raycast(
      gameRef.current.camera.position,
      cameraDir,
      5.5
    );
    if (hit) {
      const data = { blockType: hit.blockType, x: hit.coord.x, y: hit.coord.y, z: hit.coord.z };
      const normal = hit.normal;

      // Chest click
      if (data.blockType === BlockType.CHEST) {
        const key = gameRef.current.world.getBlockKey(data.x, data.y, data.z);
        const existingItems = gameRef.current.world.chests.get(key) || [];
        setActiveChestPos({ x: data.x, y: data.y, z: data.z });
        setActiveChestItems(existingItems);
        setIsChestOpen(true);
        sounds.playChestOpen();
        return;
      }

      // Crafting table click
      if (data.blockType === BlockType.CRAFTING_TABLE) {
        setIsWorkbenchOpen(true);
        setIsInventoryOpen(true);
        sounds.playCraftSuccess();
        return;
      }

      // Place block
      const active = inventory[selectedSlot];
      if (!active || active.count <= 0) return;
      const def = ITEM_DEFS[active.id];
      if (!def || !def.isBlock || !def.blockType) return;

      const placeX = data.x + Math.round(normal.x);
      const placeY = data.y + Math.round(normal.y);
      const placeZ = data.z + Math.round(normal.z);

      gameRef.current.world.setBlock(placeX, placeY, placeZ, def.blockType);
      gameRef.current.network.sendBlockUpdate(placeX, placeY, placeZ, def.blockType);
      sounds.playBlockPlace();

      setInventory((prev) => {
        const newInv = [...prev];
        if (active.count > 1) {
          newInv[selectedSlot] = { ...active, count: active.count - 1 };
        } else {
          newInv[selectedSlot] = { id: 0, count: 0 };
        }
        return newInv;
      });
    }
  };

  // Change room
  const handleChangeRoom = (newRoom: string) => {
    setRoomId(newRoom);
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url.toString());
  };

  // Export world file (.json)
  const handleExportWorld = () => {
    if (!gameRef.current) return;
    const data = gameRef.current.world.exportWorldData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `craftworld_${roomId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sounds.playTreasureFound();
  };

  // Import world file
  const handleImportWorld = (json: any) => {
    if (!gameRef.current) return;
    gameRef.current.world.importWorldData(json);
    gameRef.current.network.send({
      type: 'world_imported',
      seed: json.seed,
      blockChanges: json.blocks,
      chests: json.chests,
    });
  };

  // Reset World
  const handleResetWorld = async () => {
    const newSeed = Math.floor(Math.random() * 100000) + 1;
    try {
      await fetch(`/api/rooms/${roomId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: newSeed }),
      });
      if (gameRef.current) {
        gameRef.current.world.importWorldData({ seed: newSeed });
        gameRef.current.world.updateChunksAroundPlayer(0, 0, 2);
      }
      sounds.playExplosion();
    } catch (e) {}
  };

  // Teleport to player
  const handleTeleportTo = (x: number, y: number, z: number) => {
    if (gameRef.current) {
      gameRef.current.player.pos.set(x + 0.5, y + 1.0, z + 0.5);
      gameRef.current.player.velocity.set(0, 0, 0);
      gameRef.current.player.isGrounded = false;
      gameRef.current.camera.position.set(
        x + 0.5,
        y + 1.0 + gameRef.current.player.eyeHeight,
        z + 0.5
      );
      sounds.playTreasureFound();
    }
  };

  const currentSkinObj = PLAYER_SKINS.find((s) => s.id === playerSkin) || PLAYER_SKINS[0];

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none bg-stone-900 font-game">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 cursor-crosshair" />

      {/* In-Game HUD */}
      <HUD
        hotbar={inventory.slice(0, 9)}
        selectedSlot={selectedSlot}
        onSelectSlot={(slot) => {
          setSelectedSlot(slot);
          sounds.playStep();
        }}
        health={health}
        maxHealth={20}
        playerPos={playerPos}
        playerYaw={playerYaw}
        remotePlayers={remotePlayersList}
        world={gameRef.current?.world || null}
        isSpectating={isSpectating}
        spectatingTargetName={spectatingTarget?.name}
        onExitSpectator={() => {
          setIsSpectating(false);
          setSpectatingTarget(null);
        }}
        isFlying={isFlying}
        isSneaking={isSneaking}
        onlineCount={onlineCount}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenSpectator={() => setIsSpectatorModalOpen(true)}
        onOpenMultiplayer={() => setIsMultiplayerModalOpen(true)}
        gameTime={gameTime}
        weather={weather}
        onChangeWeather={handleChangeWeather}
      />

      {/* On-Screen Touch Joystick Controls for mobile/tablets */}
      <TouchControls
        onMoveChange={handleTouchMoveChange}
        onJumpStart={handleTouchJumpStart}
        onJumpEnd={handleTouchJumpEnd}
        onMineStart={handleTouchMineStart}
        onMineEnd={handleTouchMineEnd}
        onPlaceBlock={handleTouchPlaceBlock}
        onToggleSneak={() => setIsSneaking((s) => !s)}
        isSneaking={isSneaking}
        onToggleFly={() => setIsFlying((f) => !f)}
        isFlying={isFlying}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={(text) => {
          if (gameRef.current) {
            gameRef.current.network.sendChat(text, playerName);
          }
        }}
        currentName={playerName}
      />

      {/* Inventory & Crafting Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => {
          setIsInventoryOpen(false);
          setIsWorkbenchOpen(false);
        }}
        inventory={inventory}
        onUpdateInventory={setInventory}
        isWorkbenchOpen={isWorkbenchOpen}
        currentSkinEmoji={currentSkinObj.emoji}
        playerName={playerName}
      />

      {/* Chest Modal */}
      <ChestModal
        isOpen={isChestOpen}
        onClose={() => setIsChestOpen(false)}
        chestPos={activeChestPos}
        chestItems={activeChestItems}
        onUpdateChestItems={(items) => {
          setActiveChestItems(items);
          if (gameRef.current) {
            const key = gameRef.current.world.getBlockKey(
              activeChestPos.x,
              activeChestPos.y,
              activeChestPos.z
            );
            gameRef.current.world.chests.set(key, items);
            gameRef.current.network.sendChestUpdate(
              activeChestPos.x,
              activeChestPos.y,
              activeChestPos.z,
              items
            );
          }
        }}
        playerInventory={inventory}
        onUpdatePlayerInventory={setInventory}
      />

      {/* Spectator Modal */}
      <SpectatorModal
        isOpen={isSpectatorModalOpen}
        onClose={() => setIsSpectatorModalOpen(false)}
        players={remotePlayersList}
        myPos={playerPos}
        onStartSpectating={(target) => {
          if (target) {
            setIsSpectating(true);
            setSpectatingTarget(target);
            if (gameRef.current) {
              gameRef.current.network.sendSpectate(target.id);
            }
          } else {
            setIsSpectating(false);
            setSpectatingTarget(null);
            if (gameRef.current) {
              gameRef.current.network.sendSpectate(null);
            }
          }
        }}
        onTeleportTo={handleTeleportTo}
        isCurrentlySpectating={isSpectating}
        currentSpectatingId={spectatingTarget?.id || null}
        onToggleFreeFly={() => setIsFreeFlying((f) => !f)}
        isFreeFlying={isFreeFlying}
      />

      {/* Multiplayer & World Save Modal */}
      <MultiplayerModal
        isOpen={isMultiplayerModalOpen}
        onClose={() => setIsMultiplayerModalOpen(false)}
        roomId={roomId}
        onChangeRoom={handleChangeRoom}
        onSaveCloud={handleCloudSave}
        onExportWorld={handleExportWorld}
        onImportWorld={handleImportWorld}
        onResetWorld={handleResetWorld}
        lastSavedTime={lastSavedTime}
      />

      {/* Character Customization Modal */}
      <CharacterModal
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        playerName={playerName}
        selectedSkinId={playerSkin}
        onSaveCharacter={(name, skinId) => {
          setPlayerName(name);
          setPlayerSkin(skinId);
        }}
      />
    </div>
  );
}
