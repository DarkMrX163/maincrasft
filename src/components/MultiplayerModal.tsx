import React, { useState, useEffect } from 'react';
import { X, Wifi, Cloud, Download, Upload, Copy, Check, RefreshCw, Volume2, VolumeX, Shield, Share2 } from 'lucide-react';
import { sounds } from '../game/audio';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onChangeRoom: (newRoomId: string) => void;
  onSaveCloud: () => Promise<void>;
  onExportWorld: () => void;
  onImportWorld: (fileData: any) => void;
  onResetWorld: () => void;
  lastSavedTime: number;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  roomId,
  onChangeRoom,
  onSaveCloud,
  onExportWorld,
  onImportWorld,
  onResetWorld,
  lastSavedTime,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inputRoom, setInputRoom] = useState(roomId);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setInputRoom(roomId);
      // Fetch active rooms on server
      fetch('/api/rooms')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableRooms(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}?room=${roomId}` : '';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCloudSaveClick = async () => {
    setIsSaving(true);
    await onSaveCloud();
    sounds.playCraftSuccess();
    setIsSaving(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportWorld(json);
        sounds.playTreasureFound();
        alert('Мир успешно загружен!');
        onClose();
      } catch (err) {
        alert('Ошибка при чтении файла мира. Убедитесь, что это корректный .json файл.');
      }
    };
    reader.readAsText(file);
  };

  const handleToggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundEnabled(sounds.enabled);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="mc-panel flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-stone-400 pb-2">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-emerald-600" />
            <h2 className="font-pixel text-xs sm:text-sm font-bold text-stone-800">
              Локальный Wi-Fi и Сохранение Мира
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mc-btn flex h-7 w-7 items-center justify-center rounded text-stone-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="my-3 flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
          {/* Wi-Fi Instructions Box */}
          <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-950/20 p-3 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
              <Share2 className="h-4 w-4 text-emerald-600" />
              <span>Как играть вместе детям по одному Wi-Fi:</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              Все компьютеры, ноутбуки и планшеты, подключенные к вашей домашней сети Wi-Fi, могут
              войти в одну игру. Просто откройте ссылку или введите одинаковый Код Мира!
            </p>
          </div>

          {/* Room Code & Link sharing */}
          <div className="rounded-lg bg-stone-300/60 p-3 shadow">
            <div className="text-xs font-bold text-stone-800 mb-2">Код комнаты (Мир):</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputRoom}
                onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
                placeholder="Например: KIDS-1"
                className="flex-1 rounded border-2 border-stone-400 bg-white px-3 py-1.5 font-mono text-sm font-bold text-stone-900"
              />
              <button
                onClick={() => {
                  if (inputRoom.trim()) {
                    onChangeRoom(inputRoom.trim());
                  }
                }}
                className="mc-btn-green rounded px-3 py-1.5 text-xs font-bold text-white"
              >
                Войти в этот мир
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between rounded bg-stone-200/80 p-2 text-xs">
              <span className="font-mono text-stone-600 truncate mr-2 select-all text-[11px]">
                {currentUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="mc-btn flex items-center gap-1 shrink-0 rounded px-2.5 py-1 text-xs font-bold"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Скопировано!' : 'Скопировать ссылку'}</span>
              </button>
            </div>
          </div>

          {/* Cloud & Local Saving */}
          <div className="rounded-lg bg-stone-300/60 p-3 shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <Cloud className="h-4 w-4 text-sky-600" />
                <span>Синхронизация и Сохранение</span>
              </div>
              <span className="text-[10px] text-stone-500">
                Автосохранение каждые 30 сек
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Cloud Save Button */}
              <button
                onClick={handleCloudSaveClick}
                disabled={isSaving}
                className="mc-btn flex items-center justify-center gap-1.5 rounded p-2 text-xs font-bold text-sky-200 hover:text-white"
              >
                <Cloud className="h-4 w-4 text-sky-400" />
                <span>{isSaving ? 'Сохранение...' : 'Сохранить мир в облаке'}</span>
              </button>

              {/* Export World File */}
              <button
                onClick={onExportWorld}
                className="mc-btn flex items-center justify-center gap-1.5 rounded p-2 text-xs font-bold text-amber-200 hover:text-white"
                title="Скачать файл сохранения на компьютер"
              >
                <Download className="h-4 w-4 text-amber-400" />
                <span>Скачать файл мира (.json)</span>
              </button>

              {/* Import World File */}
              <label className="mc-btn flex items-center justify-center gap-1.5 rounded p-2 text-xs font-bold text-emerald-200 hover:text-white cursor-pointer">
                <Upload className="h-4 w-4 text-emerald-400" />
                <span>Загрузить мир из файла</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>

              {/* Reset World */}
              <button
                onClick={() => {
                  if (confirm('Вы уверены, что хотите сгенерировать совершенно новый мир?')) {
                    onResetWorld();
                  }
                }}
                className="mc-btn flex items-center justify-center gap-1.5 rounded p-2 text-xs font-bold text-red-200 hover:text-white"
              >
                <RefreshCw className="h-4 w-4 text-red-400" />
                <span>Сгенерировать новый мир</span>
              </button>
            </div>
          </div>

          {/* Sound & Game Settings */}
          <div className="flex items-center justify-between rounded-lg bg-stone-300/60 p-3 shadow">
            <div className="text-xs font-bold text-stone-800">Звуки игры:</div>
            <button
              onClick={handleToggleSound}
              className={`mc-btn flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold ${
                soundEnabled ? 'text-emerald-300' : 'text-stone-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span>{soundEnabled ? 'Звук включен' : 'Звук выключен'}</span>
            </button>
          </div>

          {/* Active Local Rooms list */}
          {availableRooms.length > 0 && (
            <div className="rounded-lg bg-stone-300/60 p-3 shadow">
              <div className="text-xs font-bold text-stone-800 mb-2">
                Доступные миры на сервере ({availableRooms.length}):
              </div>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                {availableRooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded bg-white/80 px-2.5 py-1.5 text-xs"
                  >
                    <div>
                      <span className="font-bold text-stone-900">{r.id}</span>
                      <span className="ml-2 text-[10px] text-stone-500">
                        {r.playersCount} игроков в сети
                      </span>
                    </div>
                    {r.id !== roomId ? (
                      <button
                        onClick={() => onChangeRoom(r.id)}
                        className="mc-btn rounded px-2 py-0.5 text-[10px] font-bold text-emerald-300 hover:text-white"
                      >
                        Присоединиться
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600">Вы здесь</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
