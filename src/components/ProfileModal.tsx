import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Check, Heart, User, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Player, RelationshipStatus } from '../types';
import { AVATAR_PRESETS } from '../data/defaultQuestions';
import { soundEffects } from '../utils/audio';

interface ProfileModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Player) => void;
}

const STATUS_OPTIONS: RelationshipStatus[] = [
  'თავისუფალი 💖',
  'შეყვარებული 💍',
  'საიდუმლო სიმპატია 👀',
  'ფლირტის ხასიათზე 🔥',
  'უბრალოდ ვერთობი 🥂',
  'რომანტიკოსი 🌹',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(player.name);
  const [avatar, setAvatar] = useState(player.avatar);
  const [status, setStatus] = useState<RelationshipStatus | string>(player.status);
  const [bio, setBio] = useState(player.bio || '');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('გთხოვთ აირჩიოთ სურათის ფაილი (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('ფაილის ზომა არ უნდა აღემატებოდეს 5MB-ს');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        soundEffects.playHeartSound();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...player,
      name: name.trim(),
      avatar,
      status,
      bio: bio.trim(),
    });
    soundEffects.playHeartSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-rose-950/90 border border-rose-800/50 rounded-3xl shadow-2xl shadow-rose-950/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-rose-900/40 bg-rose-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Camera className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                პროფილის მორგება
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h2>
              <p className="text-xs text-rose-300/70">
                შეარჩიე შენი ფოტო, სახელი და სტატუსი მაგიდისთვის
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

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Avatar Preview & Upload Action */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-rose-950/30 p-4 rounded-2xl border border-rose-900/40">
            <div className="relative group">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt="პროფილის ფოტო"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-rose-500/60 shadow-xl group-hover:scale-105 transition-transform"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg ring-2 ring-slate-950 active:scale-95 transition-all"
                title="ატვირთე ფოტო მოწყობილობიდან"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="text-sm font-semibold text-rose-100 flex items-center justify-center sm:justify-start gap-1.5">
                <ImageIcon className="w-4 h-4 text-rose-400" />
                შენი პროფილის ფოტო
              </div>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                შეგიძლია ატვირთო ნებისმიერი საკუთარი ფოტო ან აირჩიო ქვემოთ მოცემული მზა ავატარებიდან.
              </p>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-md shadow-rose-950/50 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  ფოტოს ატვირთვა
                </button>
              </div>

              {uploadError && (
                <p className="text-xs text-rose-400 font-medium">{uploadError}</p>
              )}
            </div>
          </div>

          {/* Preset Avatars Selection */}
          <div>
            <label className="block text-xs font-semibold text-rose-200 mb-2.5">
              ან აირჩიე მზა ავატარი:
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = avatar === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setAvatar(preset.url);
                      soundEffects.playHeartSound();
                    }}
                    className={`relative rounded-2xl overflow-hidden p-1 border-2 transition-all group ${
                      isSelected
                        ? 'border-rose-400 ring-2 ring-rose-500/50 scale-102 bg-rose-950/60 shadow-lg shadow-rose-900/40'
                        : 'border-rose-950/60 hover:border-rose-700/60 bg-slate-900/60'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-16 sm:h-20 rounded-xl object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="text-[10px] text-center text-rose-200/90 truncate pt-1 font-medium">
                      {preset.name}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-0.5 shadow">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-semibold text-rose-200 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-rose-400" />
              შენი სახელი / ნიკნეიმი:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="მაგ: გიორგი, ნინო, რომეო..."
              maxLength={24}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-rose-900/60 text-white placeholder-rose-400/40 focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-500 text-sm"
            />
          </div>

          {/* Relationship Status */}
          <div>
            <label className="block text-xs font-semibold text-rose-200 mb-1.5 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
              რომანტიკული სტატუსი:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((st) => {
                const isSelected = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-950/50 scale-[1.02]'
                        : 'bg-slate-950/50 hover:bg-rose-950/40 text-rose-200/80 border-rose-900/50'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio / Quote */}
          <div>
            <label className="block text-xs font-semibold text-rose-200 mb-1.5">
              სტატუსი / მოკლე ფრაზა (სურვილისამებრ):
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="მაგ: მზად ვარ ნებისმიერი აღსარებისთვის! ✨"
              maxLength={70}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-rose-900/60 text-white placeholder-rose-400/40 focus:outline-none focus:ring-2 focus:ring-rose-500/60 focus:border-rose-500 text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-rose-900/40 bg-rose-950/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-white hover:bg-rose-900/30 transition-colors"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-950/60 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            შენახვა და თამაშში შესვლა
          </button>
        </div>
      </div>
    </div>
  );
};
