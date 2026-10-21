import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Player } from '../types';
import { Send, Heart, MessageSquare, Sparkles, Smile, X, Minus, ChevronUp } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface ChatBoxProps {
  messages: ChatMessage[];
  myPlayer: Player;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSendMessage: (text: string, type?: 'chat' | 'confession') => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_EMOJIS = ['❤️', '🌹', '💋', '🥂', '🔥', '✨', '💌', '😍'];

const QUICK_PHRASES = [
  'ძალიან ლამაზი ხარ! ✨',
  'აღიარე სიმართლე! 🙈',
  'კოცნა დაიმსახურე! 💋',
  'შემდეგი მე ვარ! 🍷',
  'ვინ მოგწონს? 👀',
  'გაუმარჯოს სიყვარულს! 🥂',
];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  myPlayer,
  isOpen,
  onToggleOpen,
  onSendMessage,
  onSendReaction,
}) => {
  const [text, setText] = useState('');
  const [isConfession, setIsConfession] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestPreview, setLatestPreview] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCount = useRef(messages.length);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    } else if (messages.length > prevMessagesCount.current) {
      // New message while closed
      const newest = messages[messages.length - 1];
      if (newest && newest.senderId !== myPlayer.id) {
        setUnreadCount((prev) => prev + 1);
        setLatestPreview(newest);
        const timer = setTimeout(() => {
          setLatestPreview(null);
        }, 4500);
        return () => clearTimeout(timer);
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages, isOpen, myPlayer.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSendMessage(text.trim(), isConfession ? 'confession' : 'chat');
    soundEffects.playHeartSound();
    setText('');
    setIsConfession(false);
  };

  const handlePhraseClick = (phrase: string) => {
    onSendMessage(phrase, 'chat');
    soundEffects.playHeartSound();
  };

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right Corner) */}
      <div className="fixed bottom-4 right-3 sm:right-6 z-40 flex flex-col items-end gap-2">
        {/* Floating Bubble Notification Preview if closed */}
        {!isOpen && latestPreview && (
          <div 
            onClick={onToggleOpen}
            className="cursor-pointer max-w-xs bg-slate-900/95 border border-pink-500/60 rounded-2xl p-2.5 shadow-2xl shadow-rose-950/90 text-xs text-rose-100 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <img
              src={latestPreview.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&q=80'}
              alt={latestPreview.senderName}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-pink-400 shrink-0"
            />
            <div className="truncate">
              <span className="font-bold text-pink-300 text-[11px] block">{latestPreview.senderName}</span>
              <span className="truncate block text-slate-200">{latestPreview.text}</span>
            </div>
          </div>
        )}

        {/* The Toggle Floating Button */}
        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              soundEffects.playHeartSound();
              onToggleOpen();
            }}
            className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-xl shadow-rose-950/80 ring-2 ring-rose-400/40 active:scale-95 transition-all glow-romantic"
            title="გახსენი მაგიდის ჩატი"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold tracking-wide">ჩატი</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950/60 text-rose-200 font-semibold border border-rose-400/30">
              {messages.length}
            </span>
          </button>
        )}
      </div>

      {/* Floating Popup Chat Window */}
      {isOpen && (
        <div className="fixed bottom-3 right-2 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[380px] h-[480px] max-h-[82vh] bg-slate-900/95 backdrop-blur-2xl border-2 border-rose-700/60 rounded-3xl shadow-2xl shadow-rose-950/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Popup Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-rose-950/80 to-slate-900/90 border-b border-rose-800/50 select-none">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30">
                <MessageSquare className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1">
                  <span>მაგიდის ცოცხალი ჩატი</span>
                  <Sparkles className="w-3 h-3 text-amber-300" />
                </h3>
                <span className="text-[10px] text-rose-300/70 block">
                  {messages.length} შეტყობინება
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleOpen}
                className="p-1.5 rounded-lg text-rose-300/70 hover:text-white hover:bg-rose-900/40 transition-colors"
                title="ჩაკეცვა"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleOpen}
                className="p-1.5 rounded-lg text-rose-300/70 hover:text-white hover:bg-rose-900/40 transition-colors"
                title="დახურვა"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Reaction Emojis Ribbon */}
          <div className="px-3 py-1.5 bg-slate-950/60 border-b border-rose-950/40 flex items-center justify-between">
            <span className="text-[10px] text-rose-300/80 font-medium">რეაქცია:</span>
            <div className="flex items-center gap-1.5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSendReaction(emoji)}
                  className="hover:scale-130 transition-transform active:scale-90 text-sm"
                  title={`გააგზავნე ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-rose-300/50 space-y-1">
                <Heart className="w-8 h-8 text-rose-500/30 mx-auto" />
                <p className="text-xs">შეტყობინებები ჯერ არ არის.</p>
                <p className="text-[11px]">დაიწყე საუბარი ან გააგზავნე რეაქცია! 💌</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === myPlayer.id;
                const isSystem = msg.type === 'system';
                const isConfessionType = msg.type === 'confession';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-1.5">
                      <span className="inline-block text-[10px] text-rose-300/80 bg-rose-950/50 border border-rose-900/40 px-2.5 py-0.5 rounded-full">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                if (isConfessionType) {
                  return (
                    <div key={msg.id} className="my-1.5 p-2 rounded-xl bg-gradient-to-r from-pink-950/70 to-rose-950/70 border border-pink-700/50 text-center animate-in fade-in">
                      <div className="text-[10px] font-bold text-pink-400 flex items-center justify-center gap-1 mb-0.5">
                        <Heart className="w-3 h-3 fill-pink-400" />
                        <span>აღსარება / დავალება</span>
                      </div>
                      <p className="text-xs text-rose-100 font-medium">{msg.text}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <img
                      src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'}
                      alt={msg.senderName}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-rose-500/50 shrink-0 mt-0.5"
                    />
                    <div className={`max-w-[80%] rounded-2xl p-2.5 ${
                      isMe
                        ? 'bg-rose-600 text-white rounded-tr-none shadow-md shadow-rose-950/50'
                        : 'bg-slate-800 text-rose-100 rounded-tl-none border border-rose-900/40'
                    }`}>
                      {!isMe && (
                        <div className="text-[10px] font-bold text-rose-300 mb-0.5">
                          {msg.senderName}
                        </div>
                      )}
                      <p className="text-xs break-words leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Phrases Bar */}
          <div className="px-3 py-1 bg-slate-950/50 border-t border-rose-950/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-rose-400 font-medium whitespace-nowrap">ფრაზები:</span>
            {QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handlePhraseClick(phrase)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 border border-rose-800/40 whitespace-nowrap active:scale-95 transition-all"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Input & Confession Toggle */}
          <div className="p-2 sm:p-2.5 bg-slate-950/90 border-t border-rose-900/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-400">
                {isConfession ? '💖 აღსარების რეჟიმი' : '💬 ჩვეულებრივი ჩატი'}
              </span>
              <button
                type="button"
                onClick={() => setIsConfession(!isConfession)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                  isConfession
                    ? 'bg-pink-600 text-white border-pink-400 shadow'
                    : 'bg-slate-900/70 text-rose-300 border-rose-900/40 hover:bg-rose-900/40'
                }`}
              >
                <Heart className="w-2.5 h-2.5 fill-current" />
                აღსარება
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isConfession ? 'ჩაწერე გულწრფელი აღსარება...' : 'დაწერე შეტყობინება...'}
                maxLength={150}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-rose-900/60 text-white placeholder-rose-400/40 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/60"
                autoFocus
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-40 text-white shadow-md active:scale-95 transition-all"
                title="გაგზავნა"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
