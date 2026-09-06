import React, { useState, useRef, useEffect } from 'react';
import { Search, User, Heart, X, ChevronLeft, GitMerge } from 'lucide-react';
import type { FlatPerson, ThemeMode } from '../types/family';

interface TreeSearchProps {
  people: FlatPerson[];
  onSelectPerson: (treeId: string, personId: string) => void;
  currentTreeId: string;
  themeMode?: ThemeMode;
}

export const TreeSearch: React.FC<TreeSearchProps> = ({ people, onSelectPerson, currentTreeId, themeMode = 'light' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDark = themeMode === 'dark';
  const isComfort = themeMode === 'comfort';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = query.trim()
    ? people.filter(p => 
        p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        (p.title && p.title.toLowerCase().includes(query.trim().toLowerCase()))
      ).slice(0, 15)
    : [];

  const handleSelect = (treeId: string, personId: string) => {
    onSelectPerson(treeId, personId);
    setIsOpen(false);
    setQuery('');
  };

  const inputStyle = isDark
    ? 'bg-slate-900/90 hover:bg-slate-900 focus:bg-slate-950 text-slate-100 border-slate-700/80 focus:border-cyan-500 placeholder:text-slate-500'
    : isComfort
    ? 'bg-[#ebdcc4] hover:bg-[#e4d3b8] focus:bg-[#fbf7ee] text-[#332616] border-[#d4be9b] focus:border-amber-700 placeholder:text-[#8c7659]'
    : 'bg-slate-100 hover:bg-slate-200/80 focus:bg-white text-slate-800 border-transparent focus:border-emerald-500 placeholder:text-slate-400';

  const dropdownBg = isDark
    ? 'bg-[#0f172a] border-slate-800 text-slate-100 shadow-2xl'
    : isComfort
    ? 'bg-[#fbf7ee] border-[#d4be9b] text-[#332616] shadow-2xl'
    : 'bg-white border-slate-200 text-slate-800 shadow-2xl';

  const itemHover = isDark
    ? 'hover:bg-slate-800/80 text-slate-200'
    : isComfort
    ? 'hover:bg-[#ebdcc4] text-[#332616]'
    : 'hover:bg-emerald-50/80 text-slate-800';

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-sm">
      <div className="relative flex items-center">
        <Search className={`absolute right-3 pointer-events-none ${isDark ? 'text-slate-500' : isComfort ? 'text-[#8c7659]' : 'text-slate-400'}`} size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="ابحث عن شخص في العائلة..."
          className={`w-full text-xs md:text-sm font-medium py-2 pr-9 pl-8 rounded-xl border focus:ring-2 focus:ring-emerald-200/50 outline-none transition-all ${inputStyle}`}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className={`absolute left-2.5 p-1 rounded-full transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : isComfort ? 'text-[#8c7659] hover:text-[#332616] hover:bg-[#ebdcc4]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
            }`}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className={`absolute top-full mt-2 right-0 left-0 rounded-2xl border overflow-hidden z-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 ${dropdownBg}`}>
          {results.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className={`px-3 py-1.5 text-[11px] font-bold border-b flex justify-between items-center ${isDark ? 'text-slate-400 border-slate-800' : isComfort ? 'text-[#8c7659] border-[#e0cfb5]' : 'text-slate-400 border-slate-100'}`}>
                <span>نتائج البحث ({results.length})</span>
                <span>اضغط للانتقال</span>
              </div>
              {results.map((person) => {
                const isCurrentTree = person.treeId === currentTreeId;
                return (
                  <button
                    key={`${person.treeId}-${person.id}`}
                    onClick={() => handleSelect(person.treeId, person.id)}
                    className={`w-full text-right p-2.5 rounded-xl transition-colors flex items-center justify-between group border border-transparent ${itemHover}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        person.isSpouse 
                          ? (isDark ? 'bg-rose-950/80 text-rose-300' : isComfort ? 'bg-[#fae8e5] text-rose-800' : 'bg-rose-100 text-rose-600')
                          : (isDark ? 'bg-emerald-950/80 text-emerald-300' : isComfort ? 'bg-[#e0f2e9] text-emerald-800' : 'bg-emerald-100 text-emerald-700')
                      }`}>
                        {person.isSpouse ? <Heart size={14} /> : <User size={14} />}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs md:text-sm truncate">
                          {person.name}
                        </p>
                        <div className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-slate-400' : isComfort ? 'text-[#8c7659]' : 'text-slate-500'}`}>
                          {person.title && <span className={isDark ? 'text-emerald-400 font-medium' : isComfort ? 'text-emerald-800 font-medium' : 'text-emerald-700 font-medium'}>{person.title} • </span>}
                          {person.parentName && <span>(ابن/زوج: {person.parentName}) • </span>}
                          <span className={`flex items-center gap-0.5 ${isDark ? 'text-slate-500' : isComfort ? 'text-[#aa9678]' : 'text-slate-400'}`}>
                            <GitMerge size={10} />
                            {person.treeName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 mr-2">
                      {!isCurrentTree && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isDark ? 'bg-purple-950/80 text-purple-300' : isComfort ? 'bg-[#efe6f7] text-purple-800' : 'bg-purple-100 text-purple-700'
                        }`}>
                          شجرة أخرى
                        </span>
                      )}
                      <ChevronLeft size={14} className="text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:-translate-x-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`p-6 text-center text-xs md:text-sm ${isDark ? 'text-slate-400' : isComfort ? 'text-[#8c7659]' : 'text-slate-400'}`}>
              لم يتم العثور على أي شخص باسم &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
};
