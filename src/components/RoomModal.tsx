import React, { useState, useEffect } from 'react';
import { X, DoorOpen, Plus, Sparkles, Hash, Users, RefreshCw, ArrowRight, Dices, Heart } from 'lucide-react';
import { Player } from '../types';
import { soundEffects } from '../utils/audio';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId: string;
  onSelectRoom: (newRoomId: string) => void;
  onOpenProfile: () => void;
  player: Player;
}

interface ActiveRoomInfo {
  id: string;
  name: string;
  playersCount: number;
  lastActivity: number;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  currentRoomId,
  onSelectRoom,
  onOpenProfile,
  player,
}) => {
  const [tab, setTab] = useState<'join' | 'create' | 'list'>('join');
  const [inputCode, setInputCode] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
      generateRandomCode();
    }
  }, [isOpen]);

  const generateRandomCode = () => {
    const prefixes = ['LOVE', 'ROSE', 'HEART', 'KISS', 'DATE', 'SWEET'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setNewRoomCode(`${prefix}-${num}`);
  };

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingRooms(false);
    }
  };

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;

    soundEffects.playHeartSound();
    onSelectRoom(clean);
    onClose();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRoomCode.trim().toUpperCase();
    if (!clean) return;

    soundEffects.playHeartSound();
    onSelectRoom(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-rose-950/95 border border-rose-800/60 rounded-3xl shadow-2xl shadow-rose-950/90 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-rose-900/40 bg-rose-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <DoorOpen className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                ონლაინ ოთახები
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h2>
              <p className="text-xs text-rose-300/70">
                შემოუერთდი მეგობრის ოთახს კოდით ან შექმენი ახალი
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-rose-300/70 hover:text-white hover:bg-rose-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Player Bar */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={player.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
              alt={player.name}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-rose-500/50"
            />
            <div className="text-xs">
              <span className="text-rose-300/80">შემოდიხარ სახელით: </span>
              <strong className="text-white font-bold">{player.name}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className="text-[11px] font-semibold text-pink-400 hover:text-pink-300 underline"
          >
            ფოტოს/სახელის შეცვლა
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-rose-900/40 bg-slate-950/30 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'join'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-rose-300 hover:bg-rose-900/30'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            კოდით შესვლა
          </button>
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'create'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-rose-300 hover:bg-rose-900/30'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            ახალი ოთახი
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('list');
              fetchRooms();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'list'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-rose-300 hover:bg-rose-900/30'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            აქტიური ({activeRooms.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {tab === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-rose-200 mb-2">
                  ჩაწერე მეგობრის მოცემული ოთახის კოდი:
                </label>
                <div className="relative">
                  <Hash className="w-5 h-5 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="მაგ: LOVE-24, TBILISI, ROMANCE..."
                    maxLength={20}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-rose-800/60 text-white placeholder-rose-400/40 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase font-bold"
                    autoFocus
                  />
                </div>
              </div>

              <div className="text-[11px] text-rose-300/80 bg-rose-950/30 p-3 rounded-xl border border-rose-900/40">
                💡 <strong>რჩევა:</strong> თუ მეგობარმა ბმული გამოგიგზავნათ, უბრალოდ გახსენით ის და ავტომატურად ამ ოთახში მოხვდებით!
              </div>

              <button
                type="submit"
                disabled={!inputCode.trim()}
                className="w-full py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-950/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span>მაგიდასთან შეერთება</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {tab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-rose-200 mb-2">
                  ახალი ოთახის კოდი:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Hash className="w-5 h-5 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={newRoomCode}
                      onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                      placeholder="შეიყვანე სასურველი კოდი..."
                      maxLength={20}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-rose-800/60 text-white placeholder-rose-400/40 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="p-3 rounded-2xl bg-slate-900 border border-rose-800/50 hover:bg-rose-900/40 text-rose-300 hover:text-white transition-colors"
                    title="შემთხვევითი კოდის გენერირება"
                  >
                    <Dices className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-rose-300/80 bg-rose-950/30 p-3 rounded-xl border border-rose-900/40">
                ✨ ოთახის შექმნის შემდეგ შეძლებთ კოდისა და ბმულის გაზიარებას მეგობრებისთვის, რომლებიც შემოუერთდებიან თავიანთი ფოტოებითა და სახელებით!
              </div>

              <button
                type="submit"
                disabled={!newRoomCode.trim()}
                className="w-full py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-950/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>ოთახის შექმნა და თამაშის დაწყება</span>
              </button>
            </form>
          )}

          {tab === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-rose-300">
                <span>აქტიური საჯარო მაგიდები:</span>
                <button
                  type="button"
                  onClick={fetchRooms}
                  className="p-1 rounded-lg hover:text-white hover:bg-rose-900/40 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                  განახლება
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div className="text-center py-8 text-rose-300/60 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-rose-500/40" />
                  <p className="text-xs">ამჟამად სხვა აქტიური ოთახები არ არის. შექმენი პირველი ოთახი!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeRooms.map((r) => {
                    const isCurrent = r.id === currentRoomId;
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-rose-950/60 border-rose-500 shadow-md'
                            : 'bg-slate-900/60 hover:bg-rose-950/40 border-rose-900/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-pink-300">
                              #{r.id}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold">
                                მიმდინარე
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-rose-300/70 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3 text-rose-400" />
                            <span>{r.playersCount} მოთამაშე</span>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.playHeartSound();
                              onSelectRoom(r.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white active:scale-95 transition-all"
                          >
                            შესვლა
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
