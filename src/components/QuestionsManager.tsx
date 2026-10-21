import React, { useState } from 'react';
import { X, Plus, Trash2, Search, RotateCcw, Sparkles, MessageCircleHeart, Flame, Compass, HeartHandshake } from 'lucide-react';
import { QuestionItem, QuestionCategory } from '../types';
import { soundEffects } from '../utils/audio';

interface QuestionsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionItem[];
  onAddQuestion: (text: string, category: QuestionCategory) => void;
  onDeleteQuestion: (questionId: string) => void;
  onResetQuestions: () => void;
}

const CATEGORIES: QuestionCategory[] = ['სიმართლე', 'მოქმედება', 'აღსარება', 'ფლირტი', 'კომპლიმენტი'];

const CATEGORY_COLORS: Record<QuestionCategory, { bg: string; text: string; border: string }> = {
  'სიმართლე': { bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-700/50' },
  'მოქმედება': { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/50' },
  'აღსარება': { bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-700/50' },
  'ფლირტი': { bg: 'bg-pink-950/60', text: 'text-pink-300', border: 'border-pink-700/50' },
  'კომპლიმენტი': { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/50' },
};

export const QuestionsManager: React.FC<QuestionsManagerProps> = ({
  isOpen,
  onClose,
  questions,
  onAddQuestion,
  onDeleteQuestion,
  onResetQuestions,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<QuestionCategory>('სიმართლე');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredQuestions = questions.filter((q) => {
    const matchesCategory = selectedCategory === 'all' || q.category === selectedCategory;
    const matchesSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    onAddQuestion(newText.trim(), newCategory);
    soundEffects.playHeartSound();
    setNewText('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    soundEffects.playHeartSound();
    onDeleteQuestion(id);
    setDeletingId(null);
  };

  const getCategoryIcon = (cat: QuestionCategory) => {
    switch (cat) {
      case 'სიმართლე': return <Compass className="w-3.5 h-3.5" />;
      case 'მოქმედება': return <Flame className="w-3.5 h-3.5" />;
      case 'აღსარება': return <MessageCircleHeart className="w-3.5 h-3.5" />;
      case 'ფლირტი': return <Sparkles className="w-3.5 h-3.5" />;
      case 'კომპლიმენტი': return <HeartHandshake className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-gradient-to-b from-slate-900 to-rose-950/95 border border-rose-800/50 rounded-3xl shadow-2xl shadow-rose-950/90 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-rose-900/40 bg-rose-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30">
              <MessageCircleHeart className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  კითხვების მართვა
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {questions.length} კითხვა
                </span>
              </div>
              <p className="text-xs text-rose-300/70">
                დაამატე საკუთარი რომანტიკული კითხვები ან ამოშალე არასასურველი
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

        {/* Top Controls: Add Button & Search */}
        <div className="p-4 border-b border-rose-900/40 bg-slate-950/30 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-rose-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="მოძებნე კითხვა ან დავალება..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950/80 border border-rose-900/50 text-white placeholder-rose-400/40 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-rose-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Actions: Add New & Reset */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                  showAddForm
                    ? 'bg-rose-700 text-white ring-2 ring-rose-400'
                    : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-950/50'
                }`}
              >
                <Plus className="w-4 h-4" />
                ახალი კითხვა
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('ნამდვილად გსურთ კითხვების საწყის სიაზე დაბრუნება?')) {
                    onResetQuestions();
                  }
                }}
                className="p-2 rounded-xl text-rose-300/80 hover:text-white hover:bg-rose-900/30 border border-rose-900/40 transition-colors"
                title="საწყისი სიის აღდგენა"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New Question Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleAdd} className="bg-rose-950/50 p-3.5 sm:p-4 rounded-2xl border border-rose-700/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  ახალი კითხვის ან დავალების დამატება:
                </span>
                <span className="text-[10px] text-rose-300/70">ხელმისაწვდომი იქნება მთელი ოთახისთვის</span>
              </div>

              <div>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="ჩაწერე შეკითხვა, დავალება ან აღსარება ქართულად..."
                  rows={2}
                  maxLength={180}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-rose-800/60 text-white placeholder-rose-400/40 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/60 resize-none"
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-rose-300 font-medium">კატეგორია:</span>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        newCategory === cat
                          ? 'bg-rose-600 text-white ring-1 ring-rose-400 shadow'
                          : 'bg-slate-900/60 text-rose-300/80 hover:bg-rose-900/40 border border-rose-900/40'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-rose-300 hover:text-white"
                  >
                    გაუქმება
                  </button>
                  <button
                    type="submit"
                    disabled={!newText.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-md active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    დამატება
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-rose-300/80 hover:bg-rose-900/30'
              }`}
            >
              ყველა ({questions.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = questions.filter((q) => q.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                    selectedCategory === cat
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-900/60 text-rose-300/80 hover:bg-rose-900/30'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Questions List */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-2.5">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-rose-300/60 space-y-2">
              <MessageCircleHeart className="w-10 h-10 mx-auto text-rose-500/40" />
              <p className="text-sm font-medium">კითხვები არ მოიძებნა</p>
              <p className="text-xs">სცადე სხვა სიტყვის ძიება ან დაამატე ახალი კითხვა ზემოთ ღილაკით</p>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const colorInfo = CATEGORY_COLORS[q.category] || CATEGORY_COLORS['სიმართლე'];
              const isDeleting = deletingId === q.id;

              return (
                <div
                  key={q.id}
                  className="group flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 hover:bg-rose-950/30 border border-rose-900/40 hover:border-rose-800/60 transition-all shadow-sm"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${colorInfo.bg} ${colorInfo.text} ${colorInfo.border}`}>
                        {getCategoryIcon(q.category)}
                        {q.category}
                      </span>
                      {q.isCustom && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                          მორგებული
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-rose-100 font-medium leading-relaxed">
                      {q.text}
                    </p>
                  </div>

                  {/* Delete (ამოშლა) button */}
                  <div className="flex items-center gap-1">
                    {isDeleting ? (
                      <div className="flex items-center gap-1 bg-red-950/80 p-1 rounded-xl border border-red-800/80 animate-in fade-in">
                        <span className="text-[10px] text-red-200 px-1 font-medium">ამოიშალოს?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(q.id)}
                          className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold shadow"
                        >
                          დიახ
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px]"
                        >
                          არა
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(q.id)}
                        className="p-2 rounded-xl text-rose-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                        title="კითხვის ამოშლა"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-rose-900/40 bg-rose-950/40 flex items-center justify-between">
          <span className="text-[11px] text-rose-300/80">
            ნაჩვენებია: <strong className="text-white">{filteredQuestions.length}</strong> / {questions.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-700 hover:bg-rose-600 text-white shadow-md active:scale-95 transition-all"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  );
};
