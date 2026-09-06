import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { ConfirmDeleteConfig, ThemeMode } from '../types/family';

interface ConfirmModalProps {
  config: ConfirmDeleteConfig;
  onConfirm: () => void;
  onCancel: () => void;
  themeMode?: ThemeMode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ config, onConfirm, onCancel, themeMode = 'light' }) => {
  if (!config.isOpen) return null;

  const isDark = themeMode === 'dark';
  const isComfort = themeMode === 'comfort';
  const isTree = config.type === 'tree';
  const isSpouse = config.type === 'spouse';
  const childCount = config.childCount || 0;

  const modalBg = isDark ? 'bg-[#0f172a] border-slate-800 text-slate-100' : isComfort ? 'bg-[#fbf7ee] border-[#d4be9b] text-[#2c2214]' : 'bg-white border-slate-100 text-slate-800';
  const bodyText = isDark ? 'text-slate-200' : isComfort ? 'text-[#3d3223]' : 'text-slate-700';
  const cancelBtn = isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : isComfort ? 'bg-[#ebdcc4] hover:bg-[#d8c8ab] text-[#332616]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border animate-in zoom-in-95 duration-200 ${modalBg}`}>
        
        {/* Header */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-base md:text-lg">
            <AlertTriangle className="text-amber-300 shrink-0" size={22} />
            <span>تأكيد الحذف</span>
          </div>
          <button 
            onClick={onCancel}
            className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-right">
          <p className={`${bodyText} text-sm md:text-base leading-relaxed`}>
            هل أنت متأكد من رغبتك في حذف{' '}
            <strong className="text-rose-500 font-black">
              {isTree ? `شجرة "${config.name}"` : isSpouse ? `الزوجة "${config.name}"` : `"${config.name}"`}
            </strong>؟
          </p>

          {childCount > 0 && (
            <div className={`p-4 rounded-2xl text-xs md:text-sm flex items-start gap-3 border ${
              isDark ? 'bg-amber-950/40 border-amber-800/80 text-amber-200' : isComfort ? 'bg-[#fff5db] border-amber-300 text-[#45321f]' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">تنبيه هام:</p>
                <p>
                  يوجد <span className="font-black text-rose-500">{childCount}</span> من الأبناء/الفروع مسجلين تحت هذا الشخص. سيؤدي الحذف إلى إزالة الفروع التابعة أيضاً.
                </p>
              </div>
            </div>
          )}

          {config.description && (
            <p className={`text-xs p-3 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : isComfort ? 'bg-[#ebdcc4] text-[#5e4a36]' : 'text-slate-500 bg-slate-50'}`}>
              {config.description}
            </p>
          )}

          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-900/30 hover:shadow-rose-900/50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 size={16} />
              <span>نعم، تأكيد الحذف</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 font-bold py-3 px-4 rounded-xl transition-all text-sm ${cancelBtn}`}
            >
              إلغاء
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
