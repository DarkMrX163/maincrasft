import { RemotePlayer, ChatMessage } from '../types/game';

export interface NetworkCallbacks {
  onInit: (data: {
    playerId: string;
    roomId: string;
    roomName: string;
    seed: number;
    blockChanges: Record<string, number>;
    chests: Record<string, any>;
    players: RemotePlayer[];
    chatMessages: ChatMessage[];
    weather?: string;
  }) => void;
  onPlayerJoined: (player: RemotePlayer) => void;
  onPlayerLeft: (playerId: string) => void;
  onPlayerMoved: (data: {
    playerId: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    action?: string;
    holdingSlot?: number;
    isSneaking?: boolean;
    isFlying?: boolean;
  }) => void;
  onBlockUpdated: (data: { x: number; y: number; z: number; blockId: number; playerId: string }) => void;
  onChestUpdated: (data: { x: number; y: number; z: number; items: any[]; playerId: string }) => void;
  onChatMessage: (message: ChatMessage) => void;
  onWorldReset: (seed: number) => void;
  onWeatherChanged?: (weather: 'clear' | 'rain' | 'snow' | 'thunderstorm') => void;
  onConnectionStatus: (connected: boolean) => void;
}

export class NetworkManager {
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private callbacks: NetworkCallbacks;
  public isConnected = false;
  public playerId: string;
  public roomId: string;
  private moveThrottleTimer: number = 0;
  private reconnectTimeout: any = null;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
    this.playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    this.roomId = 'WORLD-1';

    // BroadcastChannel for cross-tab local sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('craftworld_lan_channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (e) {
        // BroadcastChannel not supported
      }
    }
  }

  public connect(roomId: string, playerName: string, skin: string, color: string) {
    this.roomId = roomId.trim().toUpperCase() || 'WORLD-1';

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.callbacks.onConnectionStatus(true);

        this.send({
          type: 'join',
          roomId: this.roomId,
          playerId: this.playerId,
          name: playerName,
          skin,
          color,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {
          console.error('WS parse error', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.callbacks.onConnectionStatus(false);
        // Retry connection in 3 seconds
        this.reconnectTimeout = setTimeout(() => {
          this.connect(this.roomId, playerName, skin, color);
        }, 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('WS error occurred, using local fallback:', err);
      };
    } catch (e) {
      console.warn('WS not reachable, continuing in local mode:', e);
    }
  }

  private handleIncomingMessage(msg: any) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'init':
        this.callbacks.onInit(msg);
        break;
      case 'player_joined':
        this.callbacks.onPlayerJoined(msg.player);
        break;
      case 'player_left':
        this.callbacks.onPlayerLeft(msg.playerId);
        break;
      case 'player_moved':
        this.callbacks.onPlayerMoved(msg);
        break;
      case 'block_updated':
        this.callbacks.onBlockUpdated(msg);
        break;
      case 'chest_updated':
        this.callbacks.onChestUpdated(msg);
        break;
      case 'chat_message':
        this.callbacks.onChatMessage(msg.message);
        break;
      case 'world_reset':
        this.callbacks.onWorldReset(msg.seed);
        break;
      case 'weather_changed':
        if (this.callbacks.onWeatherChanged && msg.weather) {
          this.callbacks.onWeatherChanged(msg.weather);
        }
        break;
    }
  }

  public sendWeatherChange(weather: string) {
    this.send({
      type: 'weather_change',
      weather,
    });
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
    // Also broadcast on BroadcastChannel for multi-tab testing
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(data);
      } catch (e) {
        // Broadcast post error ignored
      }
    }
  }

  public sendPosition(
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    holdingSlot: number,
    isSneaking = false,
    isFlying = false,
    action = 'idle'
  ) {
    const now = performance.now();
    if (now - this.moveThrottleTimer < 40) return; // Limit to ~25 updates/sec
    this.moveThrottleTimer = now;

    this.send({
      type: 'player_move',
      x,
      y,
      z,
      yaw,
      pitch,
      holdingSlot,
      isSneaking,
      isFlying,
      action,
    });
  }

  public sendBlockUpdate(x: number, y: number, z: number, blockId: number) {
    this.send({
      type: 'block_update',
      x,
      y,
      z,
      blockId,
    });
  }

  public sendChestUpdate(x: number, y: number, z: number, items: any[]) {
    this.send({
      type: 'chest_update',
      x,
      y,
      z,
      items,
    });
  }

  public sendChat(text: string, senderName: string) {
    this.send({
      type: 'chat_send',
      text,
      senderName,
    });
  }

  public sendSpectate(targetId: string | null) {
    this.send({
      type: 'spectate_update',
      targetId,
    });
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}
