import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json({ limit: '20mb' }));

interface Player {
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
  action: string;
  isSneaking: boolean;
  isFlying: boolean;
  spectatingId: string | null;
  ws?: WebSocket;
  lastPing: number;
}

interface ChestSlot {
  id: number;
  count: number;
  slot: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
  text: string;
  time: number;
  type?: 'chat' | 'system';
}

interface RoomState {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  lastSaved: number;
  weather: 'clear' | 'rain' | 'snow' | 'thunderstorm';
  blockChanges: Record<string, number>; // "x,y,z" -> blockId (0 = air)
  chests: Record<string, ChestSlot[]>; // "x,y,z" -> items
  chatMessages: ChatMessage[];
  players: Map<string, Player>;
}

// In-memory persistent rooms (survives client reconnects)
const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string, name?: string): RoomState {
  const normId = roomId.trim().toUpperCase() || 'WORLD-1';
  let room = rooms.get(normId);
  if (!room) {
    room = {
      id: normId,
      name: name || `Мир ${normId}`,
      seed: Math.floor(Math.random() * 100000) + 1,
      createdAt: Date.now(),
      lastSaved: Date.now(),
      weather: 'clear',
      blockChanges: {},
      chests: {},
      chatMessages: [
        {
          id: 'welcome-' + Date.now(),
          senderId: 'system',
          senderName: 'Сервер',
          avatar: '🌍',
          text: `Добро пожаловать в мир ${normId}! Стройте вместе и исследуйте мир.`,
          time: Date.now(),
          type: 'system',
        },
      ],
      players: new Map(),
    };
    rooms.set(normId, room);
  }
  return room;
}

// Create default room on startup
getOrCreateRoom('WORLD-1', 'Главный мир');

// REST API
app.get('/api/status', (req, res) => {
  let totalPlayers = 0;
  rooms.forEach((r) => {
    totalPlayers += r.players.size;
  });
  res.json({
    status: 'online',
    roomsCount: rooms.size,
    totalPlayers,
    uptime: process.uptime(),
  });
});

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    seed: r.seed,
    playersCount: r.players.size,
    blockChangesCount: Object.keys(r.blockChanges).length,
    createdAt: r.createdAt,
    lastSaved: r.lastSaved,
  }));
  res.json(roomList);
});

app.get('/api/rooms/:id', (req, res) => {
  const room = getOrCreateRoom(req.params.id);
  res.json({
    id: room.id,
    name: room.name,
    seed: room.seed,
    createdAt: room.createdAt,
    lastSaved: room.lastSaved,
    blockChanges: room.blockChanges,
    chests: room.chests,
    playersCount: room.players.size,
  });
});

app.post('/api/rooms/:id/save', (req, res) => {
  const room = getOrCreateRoom(req.params.id);
  const { blockChanges, chests, name } = req.body;
  if (blockChanges && typeof blockChanges === 'object') {
    Object.assign(room.blockChanges, blockChanges);
  }
  if (chests && typeof chests === 'object') {
    Object.assign(room.chests, chests);
  }
  if (name) {
    room.name = name;
  }
  room.lastSaved = Date.now();
  res.json({ success: true, lastSaved: room.lastSaved });
});

app.post('/api/rooms/:id/reset', (req, res) => {
  const room = getOrCreateRoom(req.params.id);
  const newSeed = req.body.seed || Math.floor(Math.random() * 100000) + 1;
  room.seed = newSeed;
  room.blockChanges = {};
  room.chests = {};
  room.lastSaved = Date.now();
  
  // Broadcast reset to all clients in room
  broadcastToRoom(room.id, {
    type: 'world_reset',
    seed: room.seed,
  });

  res.json({ success: true, seed: room.seed });
});

app.post('/api/rooms/:id/import', (req, res) => {
  const room = getOrCreateRoom(req.params.id);
  const { seed, blockChanges, chests, name } = req.body;
  if (typeof seed === 'number') room.seed = seed;
  if (blockChanges) room.blockChanges = blockChanges;
  if (chests) room.chests = chests;
  if (name) room.name = name;
  room.lastSaved = Date.now();

  broadcastToRoom(room.id, {
    type: 'world_imported',
    seed: room.seed,
    blockChanges: room.blockChanges,
    chests: room.chests,
  });

  res.json({ success: true });
});

const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msgStr = JSON.stringify(message);

  for (const player of room.players.values()) {
    if (player.ws && player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      try {
        player.ws.send(msgStr);
      } catch (err) {
        // Socket send error ignored
      }
    }
  }
}

wss.on('connection', (ws, req) => {
  let currentRoomId = 'WORLD-1';
  let currentPlayerId = '';

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        const roomId = (msg.roomId || 'WORLD-1').trim().toUpperCase();
        currentRoomId = roomId;
        currentPlayerId = msg.playerId || ('p_' + Math.random().toString(36).substring(2, 9));

        const room = getOrCreateRoom(roomId, msg.roomName);

        const newPlayer: Player = {
          id: currentPlayerId,
          name: msg.name || 'Игрок',
          skin: msg.skin || 'steve',
          color: msg.color || '#3b82f6',
          x: msg.x || 0,
          y: msg.y || 12,
          z: msg.z || 0,
          yaw: msg.yaw || 0,
          pitch: msg.pitch || 0,
          holdingSlot: msg.holdingSlot || 0,
          action: 'idle',
          isSneaking: false,
          isFlying: false,
          spectatingId: null,
          ws,
          lastPing: Date.now(),
        };

        room.players.set(currentPlayerId, newPlayer);

        // Send initialization state to the joining player
        const otherPlayers = Array.from(room.players.values())
          .filter((p) => p.id !== currentPlayerId)
          .map((p) => ({
            id: p.id,
            name: p.name,
            skin: p.skin,
            color: p.color,
            x: p.x,
            y: p.y,
            z: p.z,
            yaw: p.yaw,
            pitch: p.pitch,
            holdingSlot: p.holdingSlot,
            action: p.action,
            isSneaking: p.isSneaking,
            isFlying: p.isFlying,
            spectatingId: p.spectatingId,
          }));

        ws.send(
          JSON.stringify({
            type: 'init',
            playerId: currentPlayerId,
            roomId: room.id,
            roomName: room.name,
            seed: room.seed,
            weather: room.weather || 'clear',
            blockChanges: room.blockChanges,
            chests: room.chests,
            players: otherPlayers,
            chatMessages: room.chatMessages.slice(-50),
          })
        );

        // Notify other players
        broadcastToRoom(
          roomId,
          {
            type: 'player_joined',
            player: {
              id: newPlayer.id,
              name: newPlayer.name,
              skin: newPlayer.skin,
              color: newPlayer.color,
              x: newPlayer.x,
              y: newPlayer.y,
              z: newPlayer.z,
              yaw: newPlayer.yaw,
              pitch: newPlayer.pitch,
              holdingSlot: newPlayer.holdingSlot,
            },
          },
          ws
        );

        // System chat message
        const joinMsg: ChatMessage = {
          id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          senderId: 'system',
          senderName: 'Мир',
          avatar: '✨',
          text: `🎉 ${newPlayer.name} присоединился к игре!`,
          time: Date.now(),
          type: 'system',
        };
        room.chatMessages.push(joinMsg);
        if (room.chatMessages.length > 100) room.chatMessages.shift();
        broadcastToRoom(roomId, { type: 'chat_message', message: joinMsg });
      }

      if (msg.type === 'player_move') {
        const room = rooms.get(currentRoomId);
        if (room && currentPlayerId) {
          const player = room.players.get(currentPlayerId);
          if (player) {
            player.x = msg.x;
            player.y = msg.y;
            player.z = msg.z;
            player.yaw = msg.yaw;
            player.pitch = msg.pitch;
            player.action = msg.action || player.action;
            player.holdingSlot = msg.holdingSlot ?? player.holdingSlot;
            player.isSneaking = !!msg.isSneaking;
            player.isFlying = !!msg.isFlying;

            broadcastToRoom(
              currentRoomId,
              {
                type: 'player_moved',
                playerId: currentPlayerId,
                x: msg.x,
                y: msg.y,
                z: msg.z,
                yaw: msg.yaw,
                pitch: msg.pitch,
                action: player.action,
                holdingSlot: player.holdingSlot,
                isSneaking: player.isSneaking,
                isFlying: player.isFlying,
              },
              ws
            );
          }
        }
      }

      if (msg.type === 'block_update') {
        const room = rooms.get(currentRoomId);
        if (room) {
          const key = `${msg.x},${msg.y},${msg.z}`;
          room.blockChanges[key] = msg.blockId; // 0 for air / broken
          room.lastSaved = Date.now();

          broadcastToRoom(
            currentRoomId,
            {
              type: 'block_updated',
              x: msg.x,
              y: msg.y,
              z: msg.z,
              blockId: msg.blockId,
              playerId: currentPlayerId,
            },
            ws
          );
        }
      }

      if (msg.type === 'chest_update') {
        const room = rooms.get(currentRoomId);
        if (room) {
          const key = `${msg.x},${msg.y},${msg.z}`;
          room.chests[key] = msg.items;
          room.lastSaved = Date.now();

          broadcastToRoom(
            currentRoomId,
            {
              type: 'chest_updated',
              x: msg.x,
              y: msg.y,
              z: msg.z,
              items: msg.items,
              playerId: currentPlayerId,
            },
            ws
          );
        }
      }

      if (msg.type === 'chat_send') {
        const room = rooms.get(currentRoomId);
        if (room) {
          const player = room.players.get(currentPlayerId);
          const chatMsg: ChatMessage = {
            id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            senderId: currentPlayerId,
            senderName: player ? player.name : (msg.senderName || 'Игрок'),
            avatar: player ? player.skin : 'steve',
            text: (msg.text || '').trim().slice(0, 150),
            time: Date.now(),
            type: 'chat',
          };
          if (chatMsg.text) {
            room.chatMessages.push(chatMsg);
            if (room.chatMessages.length > 100) room.chatMessages.shift();
            broadcastToRoom(currentRoomId, {
              type: 'chat_message',
              message: chatMsg,
            });
          }
        }
      }

      if (msg.type === 'spectate_update') {
        const room = rooms.get(currentRoomId);
        if (room && currentPlayerId) {
          const player = room.players.get(currentPlayerId);
          if (player) {
            player.spectatingId = msg.targetId || null;
            broadcastToRoom(
              currentRoomId,
              {
                type: 'spectate_changed',
                playerId: currentPlayerId,
                targetId: player.spectatingId,
              },
              ws
            );
          }
        }
      }

      if (msg.type === 'weather_change') {
        const room = rooms.get(currentRoomId);
        if (room && msg.weather) {
          room.weather = msg.weather;
          broadcastToRoom(currentRoomId, {
            type: 'weather_changed',
            weather: room.weather,
          });
        }
      }
    } catch (err) {
      console.error('WS Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const player = room.players.get(currentPlayerId);
        const playerName = player ? player.name : 'Игрок';
        room.players.delete(currentPlayerId);

        broadcastToRoom(currentRoomId, {
          type: 'player_left',
          playerId: currentPlayerId,
        });

        const leaveMsg: ChatMessage = {
          id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          senderId: 'system',
          senderName: 'Мир',
          avatar: '💨',
          text: `${playerName} покинул мир.`,
          time: Date.now(),
          type: 'system',
        };
        room.chatMessages.push(leaveMsg);
        if (room.chatMessages.length > 100) room.chatMessages.shift();
        broadcastToRoom(currentRoomId, { type: 'chat_message', message: leaveMsg });
      }
    }
  });
});

// Setup Vite dev server or static files
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CraftWorld server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
