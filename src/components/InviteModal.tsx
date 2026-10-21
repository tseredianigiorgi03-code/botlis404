import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Sparkles, Heart, Users, QrCode, Download, ExternalLink, HelpCircle } from 'lucide-react';
import { soundEffects } from '../utils/audio';
import QRCode from 'qrcode';

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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Determine public share URL:
  // If in AI Studio private dev environment (ais-dev-), the publicly accessible link is ais-pre-
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isDevHost = currentOrigin.includes('ais-dev-');
  const publicOrigin = isDevHost
    ? currentOrigin.replace('ais-dev-', 'ais-pre-')
    : currentOrigin;

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const shareUrl = `${publicOrigin}${currentPath}?room=${encodeURIComponent(roomId)}`;
  const directDevUrl = `${currentOrigin}${currentPath}?room=${encodeURIComponent(roomId)}`;

  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#350414',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

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

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `love-bottle-qr-${roomId}.png`;
    a.click();
    soundEffects.playHeartSound();
  };

  const handleNativeShare = () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      navigator.share({
        title: 'სიყვარულის ბოთლობანა ონლაინ',
        text: `შემომიერთდი სიყვარულის ბოთლობანაში! ოთახის კოდი: ${roomId}`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleOpenSecondTab = () => {
    window.open(directDevUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-rose-950/95 border border-rose-800/60 rounded-3xl shadow-2xl shadow-rose-950/90 overflow-hidden relative p-4 sm:p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-rose-300/70 hover:text-white hover:bg-rose-900/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-900/50 ring-4 ring-rose-400/30 mb-2 animate-pulse">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5">
            მოიწვიე მეგობარი QR კოდით
            <Sparkles className="w-4 h-4 text-amber-300" />
          </h2>
          <p className="text-xs text-rose-300/80 mt-0.5 max-w-xs leading-relaxed">
            დაასკანერეთ ტელეფონის კამერით და მომენტალურად შემოხვალთ ერთად!
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center my-2 bg-white p-3.5 rounded-3xl shadow-xl shadow-rose-950/50 border-4 border-rose-500/40 w-fit mx-auto">
          {qrDataUrl ? (
            <div className="relative group">
              <img
                src={qrDataUrl}
                alt={`QR კოდი ოთახისთვის ${roomId}`}
                className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl object-contain"
              />
              {/* Cute Center Heart Stamp */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-9 h-9 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-md">
                  <Heart className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-rose-900 text-xs">
              QR კოდი იქმნება...
            </div>
          )}

          <div className="mt-1.5 text-center">
            <span className="text-[11px] font-bold text-rose-950 block">
              დაასკანერე მობილურის კამერით 📱
            </span>
            <span className="text-[10px] text-rose-800/80 font-mono">
              #{roomId}
            </span>
          </div>
        </div>

        {/* Download QR & Copy Room Code Actions */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border border-rose-800/50 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-pink-400" />
            <span>QR-ის შენახვა</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border border-rose-800/50 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-pink-400" />}
            <span>კოდის ასლი: #{roomId}</span>
          </button>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-1.5 mb-3">
          <label className="block text-xs font-semibold text-rose-200">
            პირდაპირი ბმული მეგობრისთვის:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950/80 border border-rose-900/60 text-rose-200 truncate select-all focus:outline-none font-mono"
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

        {/* Real-time Multiplayer Test Tip */}
        <div className="bg-rose-950/40 p-3 rounded-2xl border border-rose-900/40 text-[11px] text-rose-200/90 space-y-1.5 mb-4">
          <div className="font-bold text-pink-300 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
            როგორ შემოვა სხვა მოთამაშე?
          </div>
          <p className="leading-relaxed">
            1. <strong>მობილურით:</strong> დაასკანერებს ამ QR კოდს თავისი კამერით.<br />
            2. <strong>ბმულით ან კოდით:</strong> გაუხსნის ამ ბმულს ან საიტზე ჩაწერს კოდს <strong>#{roomId}</strong>.<br />
            3. <strong>ახლავე შესამოწმებლად:</strong> გახსენით ბმული მეორე ჩანართში (Tab) ან მეორე ბრაუზერში და დაინახავთ, როგორ სხდებით ერთად!
          </p>

          <button
            type="button"
            onClick={handleOpenSecondTab}
            className="w-full mt-1 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-pink-300 border border-pink-700/40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>გახსენი მეორე ჩანართში ტესტირებისთვის</span>
          </button>
        </div>

        {/* Quick Share Buttons */}
        <div className="flex items-center gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
              გაზიარება (WhatsApp/Messenger)
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
