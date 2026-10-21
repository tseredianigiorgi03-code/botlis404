import React, { useState } from 'react';
import { X, Copy, Check, Share2, Sparkles, Heart, Users, MessageCircle } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  roomId,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Generate shareable URL with room code
  const currentOrigin = window.location.origin;
  const currentPath = window.location.pathname;
  const shareUrl = `${currentOrigin}${currentPath}?room=${encodeURIComponent(roomId)}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      soundEffects.playHeartSound();
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }).catch(() => {});
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      soundEffects.playHeartSound();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {});
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'სიყვარულის ბოთლობანა - ქართული ონლაინ თამაში',
        text: `შემომიერთდი სიყვარულის ბოთლობანაში! ოთახის კოდი: ${roomId}`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-rose-950/95 border border-rose-800/60 rounded-3xl shadow-2xl shadow-rose-950/90 overflow-hidden relative p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-rose-300/70 hover:text-white hover:bg-rose-900/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-900/50 ring-4 ring-rose-400/30 mb-3 animate-pulse">
            <Share2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5">
            მოიწვიე მეგობრები მაგიდასთან
            <Sparkles className="w-4 h-4 text-amber-300" />
          </h2>
          <p className="text-xs text-rose-300/80 mt-1 max-w-xs leading-relaxed">
            მეგობრები შემოვლენ საკუთარი სახელითა და ფოტოთი და დასხდებიან თქვენთან ერთად ბოთლის გარშემო!
          </p>
        </div>

        {/* Room Code Card */}
        <div className="bg-slate-950/70 rounded-2xl p-4 border border-rose-800/50 mb-4 text-center space-y-2">
          <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider block">
            ოთახის უნიკალური კოდი:
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-widest text-pink-400 bg-rose-950/60 px-4 py-1.5 rounded-xl border border-rose-700/50 select-all font-mono">
              {roomId}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95 transition-all"
              title="კოდის დაკოპირება"
            >
              {copiedCode ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          {copiedCode && (
            <p className="text-xs text-emerald-400 font-semibold animate-in fade-in">
              კოდი წარმატებით დაკოპირდა!
            </p>
          )}
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-2 mb-5">
          <label className="block text-xs font-semibold text-rose-200">
            ან გაუგზავნე პირდაპირი ბმული:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950/80 border border-rose-900/60 text-rose-200 truncate select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>დაკოპირდა!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>ბმული</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instruction Note */}
        <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-900/40 text-[11px] text-rose-300/90 space-y-1 mb-5">
          <div className="font-bold text-rose-200 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-pink-400" />
            როგორ შემოუერთდებიან?
          </div>
          <p>
            1. გახსნიან ამ ბმულს ან საიტზე ჩაწერენ კოდს: <strong>{roomId}</strong><br />
            2. აირჩევენ საკუთარ სახელსა და ფოტოს<br />
            3. მომენტალურად აღმოჩნდებიან თქვენს მაგიდასთან წრეში!
          </p>
        </div>

        {/* Native share button if available */}
        <div className="flex items-center gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
              გაზიარება (WhatsApp / Messenger / etc.)
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-rose-200 transition-colors"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  );
};
