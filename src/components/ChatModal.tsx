import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, PLAYER_SKINS } from '../types/game';
import { Send, X, MessageSquare, Smile } from 'lucide-react';
import { sounds } from '../game/audio';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentName: string;
}

const QUICK_PHRASES = [
  '👋 Привет всем!',
  '👀 Смотрите, что я построил!',
  '💎 Я нашел алмазы!',
  '🏰 Давайте строить замок вместе!',
  '⛏️ Пошли копать в шахту!',
  '🎁 Я положил подарок в сундук!',
  '🍰 Кто хочет торт?',
  '🏃 Подождите меня!',
  '❤️ Очень красиво!',
  '🛡️ Защищаю наш дом!',
];

const EMOJIS = ['⛏️', '🧱', '💎', '🏰', '🍰', '🍎', '🗡️', '🛡️', '💖', '🎉', '⭐', '🚀', '🐱', '🐼', '🪵', '🔥'];

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentName,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    sounds.playChatPop();
    setInputText('');
  };

  const handleQuickPhrase = (phrase: string) => {
    onSendMessage(phrase);
    sounds.playChatPop();
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="mc-panel flex h-[85vh] max-h-[600px] w-full max-w-lg flex-col rounded-xl p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-stone-400 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-sky-600" />
            <h2 className="font-pixel text-sm font-bold text-stone-800">Чат игроков</h2>
          </div>
          <button
            onClick={onClose}
            className="mc-btn flex h-8 w-8 items-center justify-center rounded text-stone-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages List */}
        <div className="my-3 flex-1 overflow-y-auto rounded bg-stone-900/90 p-3 font-game text-sm shadow-inner">
          <div className="flex flex-col gap-2">
            {messages.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                Пока сообщений нет. Напишите первое сообщение или выберите быструю фразу внизу!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderName === currentName;
                const skinObj = PLAYER_SKINS.find((s) => s.id === msg.avatar);
                const emoji = skinObj ? skinObj.emoji : msg.avatar || '🧔';

                if (msg.type === 'system') {
                  return (
                    <div
                      key={msg.id}
                      className="rounded bg-amber-950/40 px-2 py-1 text-center text-xs text-amber-300 border border-amber-800/40"
                    >
                      {msg.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse text-right' : ''}`}
                  >
                    <span className="text-base leading-none select-none">{emoji}</span>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-1.5 shadow ${
                        isMe
                          ? 'bg-emerald-700 text-white'
                          : 'bg-stone-800 text-stone-100 border border-stone-700'
                      }`}
                    >
                      <div className="text-[10px] font-bold opacity-75">{msg.senderName}</div>
                      <div className="break-words text-sm">{msg.text}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Phrases for Kids */}
        <div className="mb-2">
          <div className="mb-1 text-[11px] font-bold text-stone-700">Быстрые фразы для детей:</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_PHRASES.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPhrase(phrase)}
                className="mc-btn whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold hover:scale-105 active:scale-95"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>

        {/* Emojis row */}
        <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
          <Smile className="h-4 w-4 text-stone-600 shrink-0 mr-1" />
          {EMOJIS.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => handleAddEmoji(emoji)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-stone-300 text-base active:scale-110 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите сообщение..."
            maxLength={140}
            className="flex-1 rounded border-2 border-stone-600 bg-white px-3 py-2 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
          <button
            type="submit"
            className="mc-btn-green flex items-center gap-1 rounded px-4 py-2 text-xs font-bold text-white shadow"
          >
            <Send className="h-4 w-4" />
            <span>Отправить</span>
          </button>
        </form>
      </div>
    </div>
  );
};
