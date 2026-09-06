import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Users, 
  User, 
  Heart, 
  GitMerge, 
  Edit2, 
  Trash2, 
  UserPlus, 
  HeartHandshake, 
  X, 
  Save, 
  Loader2, 
  AlertTriangle, 
  PlusCircle, 
  FolderTree, 
  Link as LinkIcon, 
  LayoutTemplate,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- Local Imports ---
import type { 
  Person, 
  Spouse, 
  FamilyTree, 
  AppData, 
  LayoutMode, 
  ThemeMode,
  TreeActions, 
  ModalConfig, 
  ConfirmDeleteConfig, 
  FlatPerson 
} from './types/family';
import { initialAppData } from './data/defaultTree';
import { 
  generateId, 
  normalizeTree, 
  getFlatPeopleList, 
  getAllTreesFlatList, 
  containsNode, 
  countDescendants, 
  findAndMutate, 
  deleteNode, 
  mergeNodes 
} from './utils/treeUtils';
import { loadLocalData, saveLocalData, exportTreesToJson, importTreesFromJson } from './services/storage';
import { TreeSearch } from './components/TreeSearch';
import { ConfirmModal } from './components/ConfirmModal';
import { ThreeDTree } from './components/ThreeDTree';

// --- Firebase Environment Setup ---
declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

const myLocalFirebaseConfig = {
  apiKey: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : "YOUR_API_KEY",
  authDomain: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : "YOUR_PROJECT_ID",
  storageBucket: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : "YOUR_SENDER_ID",
  appId: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : "YOUR_APP_ID"
};

const activeConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : myLocalFirebaseConfig;
const firebaseApp = !getApps().length ? initializeApp(activeConfig) : getApp();
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'family-tree-app';

// --- UI Subcomponents ---

const NodeLinkBadges = ({ links, onNavigate }: { links?: any[]; onNavigate: (treeId: string, personId: string) => void }) => {
  if (!links || links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5 justify-center w-full" onClick={e => e.stopPropagation()}>
      {links.map((link, idx) => (
        <button
          key={idx}
          onClick={() => onNavigate(link.targetTreeId, link.targetPersonId)}
          className="text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-colors shadow-xs"
          title={`انتقال إلى ${link.targetName} في ${link.targetTreeName}`}
        >
          <LinkIcon size={10} className="shrink-0" />
          <span className="truncate max-w-[110px]">{link.targetName} ({link.targetTreeName})</span>
        </button>
      ))}
    </div>
  );
};

const EditActionButtons = ({ 
  id, 
  name, 
  title, 
  isRoot, 
  actions 
}: { 
  id: string; 
  name: string; 
  title?: string; 
  isRoot?: boolean; 
  actions: TreeActions; 
}) => {
  const isDark = actions.themeMode === 'dark';
  const isComfort = actions.themeMode === 'comfort';
  const editBtn = isDark ? "p-1.5 rounded-lg text-blue-400 bg-blue-950/70 hover:bg-blue-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-blue-800 bg-[#e2ecf7] hover:bg-[#d0e0f0] transition-colors" : "p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors";
  const childBtn = isDark ? "p-1.5 rounded-lg text-emerald-400 bg-emerald-950/70 hover:bg-emerald-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-emerald-800 bg-[#e0f2e9] hover:bg-[#cde9db] transition-colors" : "p-1.5 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors";
  const spouseBtn = isDark ? "p-1.5 rounded-lg text-rose-400 bg-rose-950/70 hover:bg-rose-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-rose-800 bg-[#fae8e5] hover:bg-[#f3d3cd] transition-colors" : "p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors";
  const linkBtn = isDark ? "p-1.5 rounded-lg text-purple-400 bg-purple-950/70 hover:bg-purple-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-purple-800 bg-[#efe6f7] hover:bg-[#e2d3ee] transition-colors" : "p-1.5 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors";
  const delBtn = isDark ? "p-1.5 rounded-lg text-red-400 bg-red-950/70 hover:bg-red-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-red-800 bg-[#fde8e8] hover:bg-[#fcd0d0] transition-colors" : "p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors";
  const dividerClass = isDark ? 'border-slate-800' : isComfort ? 'border-[#d8c8ab]' : 'border-slate-200/60';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${actions.layout === 'list' || actions.layout === 'nested' ? '' : `mt-3 pt-2.5 border-t ${dividerClass} w-full justify-center`}`} onClick={e => e.stopPropagation()}>
      <button onClick={() => actions.onEdit(id, 'person', name, title)} className={editBtn} title="تعديل"><Edit2 size={14} /></button>
      <button onClick={() => actions.onAddChild(id)} className={childBtn} title="إضافة ابن"><UserPlus size={14} /></button>
      <button onClick={() => actions.onAddSpouse(id)} className={spouseBtn} title="إضافة زوجة"><HeartHandshake size={14} /></button>
      <button onClick={() => actions.onLink(id, name)} className={linkBtn} title="ربط بشخص في شجرة أخرى"><LinkIcon size={14} /></button>
      {!isRoot && (
        <button onClick={() => actions.onDelete(id, name, 'person')} className={delBtn} title="حذف الشخص"><Trash2 size={14} /></button>
      )}
    </div>
  );
};

const SpouseActionButtons = ({ 
  id, 
  name, 
  title, 
  actions 
}: { 
  id: string; 
  name: string; 
  title?: string; 
  actions: TreeActions; 
}) => {
  const isDark = actions.themeMode === 'dark';
  const isComfort = actions.themeMode === 'comfort';
  const editBtn = isDark ? "p-1.5 rounded-lg text-blue-400 bg-blue-950/70 hover:bg-blue-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-blue-800 bg-[#e2ecf7] hover:bg-[#d0e0f0] transition-colors" : "p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors";
  const childBtn = isDark ? "p-1.5 rounded-lg text-emerald-400 bg-emerald-950/70 hover:bg-emerald-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-emerald-800 bg-[#e0f2e9] hover:bg-[#cde9db] transition-colors" : "p-1.5 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors";
  const linkBtn = isDark ? "p-1.5 rounded-lg text-purple-400 bg-purple-950/70 hover:bg-purple-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-purple-800 bg-[#efe6f7] hover:bg-[#e2d3ee] transition-colors" : "p-1.5 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors";
  const delBtn = isDark ? "p-1.5 rounded-lg text-red-400 bg-red-950/70 hover:bg-red-900/90 transition-colors" : isComfort ? "p-1.5 rounded-lg text-red-800 bg-[#fde8e8] hover:bg-[#fcd0d0] transition-colors" : "p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors";
  const dividerClass = isDark ? 'border-rose-900/60' : isComfort ? 'border-[#e8bdb5]' : 'border-rose-200/60';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${actions.layout === 'list' || actions.layout === 'nested' ? '' : `mt-2 pt-2 border-t ${dividerClass} w-full justify-center`}`} onClick={e => e.stopPropagation()}>
      <button onClick={() => actions.onEdit(id, 'spouse', name, title)} className={editBtn} title="تعديل اسم الزوجة"><Edit2 size={13}/></button>
      <button onClick={() => actions.onAddChild(id)} className={childBtn} title="إضافة ابن لهذه الزوجة"><UserPlus size={13}/></button>
      <button onClick={() => actions.onLink(id, name)} className={linkBtn} title="ربط بشجرة أخرى"><LinkIcon size={13}/></button>
      <button onClick={() => actions.onDelete(id, name, 'spouse')} className={delBtn} title="حذف الزوجة"><Trash2 size={13}/></button>
    </div>
  );
};

// --- Core Spouse Components ---

const SpouseCard: React.FC<{ spouse: Spouse; actions: TreeActions }> = ({ spouse, actions }) => {
  const isHorizontal = actions.layout === 'list' || actions.layout === 'nested';
  const isHighlighted = actions.highlightedNodeId === spouse.id;
  const isDark = actions.themeMode === 'dark';
  const isComfort = actions.themeMode === 'comfort';

  const cardStyle = isDark
    ? 'bg-[#220f1b] border-rose-900/60 text-rose-100 shadow-xs'
    : isComfort
    ? 'bg-[#fae8e5] border-[#e8bdb5] text-[#632a22] shadow-xs'
    : 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-xs';

  const titleStyle = isDark
    ? 'text-rose-300 bg-rose-950/60'
    : isComfort
    ? 'text-[#9c3629] bg-[#f5d5d0]'
    : 'text-rose-600 bg-rose-100/60';

  if (isHorizontal) {
    return (
      <div id={`node-${spouse.id}`} className={`flex flex-col md:flex-row items-start md:items-center justify-between w-full p-2.5 rounded-xl border gap-2 transition-all ${cardStyle} ${isHighlighted ? 'ring-2 ring-amber-400 bg-amber-50 text-slate-900' : ''}`}>
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Heart size={15} className="text-rose-500 fill-rose-100 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-xs md:text-sm">{spouse.name}</span>
            {spouse.title && <span className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded ${titleStyle}`}>{spouse.title}</span>}
          </div>
        </div>
        
        <NodeLinkBadges links={spouse.links} onNavigate={actions.onNavigateLink} />

        <div className="flex items-center justify-end w-full md:w-auto gap-2">
          {actions.isEditMode && <SpouseActionButtons id={spouse.id} name={spouse.name} title={spouse.title} actions={actions} />}
        </div>
      </div>
    );
  }

  // Classic / Horizontal
  return (
    <div id={`node-${spouse.id}`} className={`rounded-xl p-2.5 flex flex-col items-center border shrink-0 transition-all ${cardStyle} ${isHighlighted ? 'ring-3 ring-amber-400 scale-105' : ''} ${actions.layout === 'horizontal' ? 'w-36 sm:w-40 md:w-48' : 'min-w-[110px] max-w-[140px]'}`}>
      <Heart size={13} className="text-rose-500 fill-rose-100 mb-1 shrink-0" />
      <span className="font-bold text-xs md:text-sm text-center break-words w-full">{spouse.name}</span>
      {spouse.title && <span className={`text-[10px] mt-0.5 text-center leading-tight px-1.5 py-0.5 rounded ${titleStyle}`}>{spouse.title}</span>}
      <NodeLinkBadges links={spouse.links} onNavigate={actions.onNavigateLink} />
      {actions.isEditMode && <SpouseActionButtons id={spouse.id} name={spouse.name} title={spouse.title} actions={actions} />}
    </div>
  );
};

const SpouseBranch: React.FC<{
  spouse: Spouse;
  level: number;
  actions: TreeActions;
  isFirst?: boolean;
  isLast?: boolean;
  isSingle?: boolean;
}> = ({ spouse, level, actions, isFirst, isLast, isSingle }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false); 
  const isDark = actions.themeMode === 'dark';
  const isComfort = actions.themeMode === 'comfort';
  const lineClass = isDark ? 'bg-slate-700' : isComfort ? 'bg-[#cbb692]' : 'bg-slate-300';
  const buttonStyle = isDark
    ? 'bg-[#18131e] border-rose-800/80 text-rose-200'
    : isComfort
    ? 'bg-[#fae8e5] border-[#e8bdb5] text-[#632a22]'
    : 'bg-white border-rose-200 text-rose-900';

  useEffect(() => {
    if (actions.highlightedNodeId && containsNode(spouse, actions.highlightedNodeId)) {
      setIsExpanded(true);
    }
  }, [actions.highlightedNodeId, spouse]);

  const renderClassicOrHorizontal = () => {
    const isHorizontal = actions.layout === 'horizontal';
    return (
      <div className={`relative flex items-center ${isHorizontal ? 'flex-row py-2.5 px-3 md:px-6' : 'flex-col px-2 sm:px-4 md:px-8'}`}>
        {!isSingle && (
          <div className={`absolute ${lineClass}
            ${isHorizontal ? 'right-0 w-0.5' : 'top-0 h-0.5'}
            ${isHorizontal 
                ? (isFirst ? 'top-1/2 bottom-0' : isLast ? 'bottom-1/2 top-0' : 'top-0 bottom-0')
                : (isFirst ? 'right-1/2 left-0' : isLast ? 'left-1/2 right-0' : 'left-0 right-0')}
          `} />
        )}
        <div className={`${lineClass} ${isHorizontal ? 'h-0.5 w-5 md:w-10' : 'w-0.5 h-6 md:h-10'}`}></div>

        <div className="relative z-10 flex flex-col items-center">
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`border-2 shadow-xs hover:shadow-md transition-all duration-300 px-3.5 py-2 rounded-full flex items-center gap-2 cursor-pointer ${buttonStyle}
              ${actions.highlightedNodeId === spouse.id ? 'border-amber-400 ring-4 ring-amber-100 scale-105' : ''}
            `}
          >
            <Heart size={15} className="text-rose-500 fill-rose-100 shrink-0" />
            <span className="text-xs md:text-sm font-bold whitespace-nowrap">{spouse.name}</span>
            <div className="bg-rose-100/70 p-1 rounded-full text-rose-600 mr-1 shrink-0 transition-transform">
              {isExpanded ? (isHorizontal ? <ChevronDown size={13}/> : <ChevronUp size={13}/>) : (isHorizontal ? <ChevronDown size={13} className="-rotate-90"/> : <ChevronDown size={13}/>)}
            </div>
          </div>
          
          <NodeLinkBadges links={spouse.links} onNavigate={actions.onNavigateLink} />

          {actions.isEditMode && (
            <div className={`mt-1.5 rounded-xl shadow-xs border p-1 ${isDark ? 'bg-[#111827] border-slate-700' : isComfort ? 'bg-[#fae8e5] border-[#e8bdb5]' : 'bg-white border-slate-100'}`}>
               <SpouseActionButtons id={spouse.id} name={spouse.name} title={spouse.title} actions={actions} />
            </div>
          )}
        </div>

        {isExpanded && spouse.children && spouse.children.length > 0 && (
          <>
            <div className={`${lineClass} ${isHorizontal ? 'h-0.5 w-5 md:w-10' : 'w-0.5 h-6 md:h-10'}`}></div>
            <div className={`flex justify-center relative animate-in fade-in slide-in-from-top-2 ${isHorizontal ? 'flex-col gap-2' : 'flex-row'}`}>
              {spouse.children.map((child: Person, cIdx: number) => (
                <FamilyNode 
                  key={child.id} node={child} level={level + 1} actions={actions}
                  isFirst={cIdx === 0} isLast={cIdx === spouse.children!.length - 1} isSingle={spouse.children!.length === 1}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderListOrNested = () => {
    const isList = actions.layout === 'list';
    const listWrapper = isDark 
      ? 'bg-[#1a0f1d]/50 border-rose-900/40 text-rose-100' 
      : isComfort 
      ? 'bg-[#fae8e5]/50 border-[#e8bdb5]/70 text-[#632a22]' 
      : 'bg-rose-50/40 border-rose-200/60';
    const listCard = isDark
      ? 'bg-[#220f1b] border-rose-900/60 text-rose-100'
      : isComfort
      ? 'bg-[#fae8e5] border-[#e8bdb5] text-[#632a22]'
      : 'bg-rose-50 border-rose-200 text-rose-900';
    const chevronBg = isDark ? 'bg-slate-800 text-rose-300' : isComfort ? 'bg-[#ebdcc4] text-[#632a22]' : 'bg-white text-rose-600';
    const dashedLine = isDark ? 'border-rose-900/60' : isComfort ? 'border-[#e8bdb5]' : 'border-rose-200';

    return (
      <div className={`w-full flex flex-col ${isList ? 'mb-2' : `mb-3 p-3 border rounded-2xl ${listWrapper}`}`}>
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center justify-between w-full p-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs ${listCard}
            ${actions.highlightedNodeId === spouse.id ? 'ring-2 ring-amber-400' : ''}`}
        >
          <div className="flex items-center gap-2.5">
             <Heart size={16} className="text-rose-500 fill-rose-100 shrink-0" />
             <div className="flex flex-col">
                <span className="font-bold text-xs md:text-sm">أبناء: {spouse.name}</span>
                {spouse.title && <span className="text-[10px] opacity-80 mt-0.5">{spouse.title}</span>}
                <NodeLinkBadges links={spouse.links} onNavigate={actions.onNavigateLink} />
             </div>
          </div>
          <div className="flex items-center gap-2">
             {actions.isEditMode && <SpouseActionButtons id={spouse.id} name={spouse.name} title={spouse.title} actions={actions} />}
             <div className={`p-1 rounded-full shadow-xs ${chevronBg}`}>
                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
             </div>
          </div>
        </div>

        {isExpanded && spouse.children && spouse.children.length > 0 && (
          <div className={`w-full flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 ${isList ? `pr-4 md:pr-8 mt-2.5 border-r-2 ${dashedLine} border-dashed` : `mt-3 pt-3 border-t ${dashedLine}`}`}>
            {spouse.children.map((child: Person) => (
              <FamilyNode key={child.id} node={child} level={level + 1} actions={actions} isSingle={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (actions.layout === 'list' || actions.layout === 'nested') ? renderListOrNested() : renderClassicOrHorizontal();
};

// --- Core Family Node Component ---

const FamilyNode: React.FC<{
  node: Person;
  isFirst?: boolean;
  isLast?: boolean;
  isSingle?: boolean;
  level?: number;
  actions: TreeActions;
}> = ({ node, isFirst, isLast, isSingle, level = 0, actions }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(level === 0);
  
  const hasChildren = node.children && node.children.length > 0;
  const spousesWithChildren = node.spouses?.filter((s: Spouse) => s.children && s.children.length > 0) || [];
  const childlessSpouses = node.spouses?.filter((s: Spouse) => !s.children || s.children.length === 0) || [];
  
  const isExpandable = hasChildren || spousesWithChildren.length > 0;
  const isRoot = level === 0;
  const isMainBranch = level === 1;
  const isHighlighted = actions.highlightedNodeId === node.id;

  const isDark = actions.themeMode === 'dark';
  const isComfort = actions.themeMode === 'comfort';
  const lineClass = isDark ? 'bg-slate-700' : isComfort ? 'bg-[#cbb692]' : 'bg-slate-300';
  const dashedLineClass = isDark ? 'border-slate-700' : isComfort ? 'border-[#cbb692]' : 'border-slate-200';

  const nodeCardStyle = isHighlighted 
    ? (isDark ? 'ring-4 ring-amber-400/80 border-amber-400 bg-amber-950/70 text-amber-100 scale-105 shadow-amber-900/50' : isComfort ? 'ring-4 ring-amber-400 border-amber-600 bg-[#fff5db] text-[#45321f] scale-105' : 'ring-4 ring-amber-300 border-amber-500 bg-amber-50 scale-105 shadow-amber-200')
    : isRoot 
    ? (isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-emerald-500/60 text-white shadow-xl shadow-emerald-950/40' : isComfort ? 'bg-[#45321f] border-[#5e4226] text-[#fef3c7] shadow-xl shadow-[#3c2a1a]/20' : 'bg-slate-900 border-slate-950 text-white shadow-xl')
    : isMainBranch 
    ? (isDark ? 'bg-[#151f38] border-slate-700 text-slate-100' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b] text-[#332616]' : 'bg-slate-50 border-slate-300 text-slate-800') 
    : (isDark ? 'bg-[#0f172a] border-slate-800 text-slate-100' : isComfort ? 'bg-[#f5ecdc] border-[#e0cfb5] text-[#3d3223]' : 'bg-white border-slate-200 text-slate-800');

  const titleBadgeStyle = isRoot 
    ? (isDark ? 'bg-slate-800/90 text-emerald-300' : isComfort ? 'bg-[#5e4226] text-[#fde68a]' : 'bg-slate-800 text-slate-300')
    : (isDark ? 'bg-slate-800/80 text-slate-300' : isComfort ? 'bg-[#e6d5bd] text-[#5e4a36]' : 'bg-slate-100 text-slate-500');

  const expandBtnStyle = isRoot 
    ? (isDark ? 'bg-slate-800 border-slate-700 text-white' : isComfort ? 'bg-[#5e4226] border-[#785633] text-[#fef3c7]' : 'bg-slate-800 border-slate-700 text-white')
    : (isDark ? 'bg-[#1e293b] border-slate-700 text-slate-300' : isComfort ? 'bg-[#f5ecdc] border-[#d4be9b] text-[#5e4a36]' : 'bg-white border-slate-200 text-slate-500');

  const nestedContainerStyle = isDark
    ? 'bg-[#0b101d]/60 border-slate-800/80'
    : isComfort
    ? 'bg-[#ebdcc4]/30 border-[#d4be9b]/70'
    : 'bg-slate-100/60 border-slate-200/80';

  const iconBgStyle = isRoot 
    ? 'bg-white/10' 
    : (isDark ? 'bg-slate-800/90' : isComfort ? 'bg-[#ebdcc4]' : 'bg-slate-100');

  const iconColorStyle = isRoot 
    ? 'text-emerald-400' 
    : (isDark ? 'text-slate-300' : isComfort ? 'text-[#63482a]' : 'text-slate-600');

  useEffect(() => {
    if (actions.highlightedNodeId && containsNode(node, actions.highlightedNodeId)) {
      setIsExpanded(true);
    }
  }, [actions.highlightedNodeId, node]);

  // -- Render Classic or Horizontal --
  const renderClassicOrHorizontal = () => {
    const isHorizontal = actions.layout === 'horizontal';

    return (
      <div className={`relative flex items-center ${isHorizontal ? 'flex-row py-2.5 px-3 md:px-6' : 'flex-col px-2 sm:px-4 md:px-7'}`} id={`node-${node.id}`}>
        {level > 0 && !isSingle && (
          <div className={`absolute ${lineClass}
            ${isHorizontal ? 'right-0 w-0.5' : 'top-0 h-0.5'}
            ${isHorizontal 
                ? (isFirst ? 'top-1/2 bottom-0' : isLast ? 'bottom-1/2 top-0' : 'top-0 bottom-0')
                : (isFirst ? 'right-1/2 left-0' : isLast ? 'left-1/2 right-0' : 'left-0 right-0')}
          `} />
        )}

        {level > 0 && (
          <div className={`${lineClass} ${isHorizontal ? 'h-0.5 w-5 md:w-10' : 'w-0.5 h-6 md:h-10'}`}></div>
        )}

        <div className={`relative z-10 flex items-start gap-3 justify-center mt-1.5 ${isHorizontal ? 'flex-col' : 'flex-row'}`}>
          <div className="relative flex flex-col items-center">
            <div 
              onClick={() => isExpandable && setIsExpanded(!isExpanded)}
              className={`relative flex flex-col items-center p-3 sm:p-4 transition-all duration-300 w-32 sm:w-40 md:w-48 rounded-2xl border
                ${isExpandable || actions.isEditMode ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : 'shadow-xs'}
                ${nodeCardStyle}
              `}
            >
              {isRoot ? <Users size={24} className="mb-1.5 text-emerald-400" /> : <User size={18} className={`mb-1 ${isMainBranch ? (isDark ? 'text-slate-300' : isComfort ? 'text-[#63482a]' : 'text-slate-600') : (isDark ? 'text-slate-500' : isComfort ? 'text-[#9c8466]' : 'text-slate-400')}`} />}
              <h3 className={`font-bold text-center leading-tight break-words w-full ${isRoot ? (isComfort ? 'text-base md:text-lg text-amber-200' : 'text-base md:text-lg text-emerald-300') : 'text-xs md:text-sm'}`}>{node.name}</h3>
              {node.title && <p className={`text-[10px] font-medium mt-1.5 px-2 py-0.5 text-center break-words w-full rounded ${titleBadgeStyle}`}>{node.title}</p>}
              {hasChildren && node.children!.length > 4 && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full mt-1.5">
                  🌿 {node.children!.length} أبناء
                </span>
              )}
              
              <NodeLinkBadges links={node.links} onNavigate={actions.onNavigateLink} />

              {actions.isEditMode && <EditActionButtons id={node.id} name={node.name} title={node.title} isRoot={isRoot} actions={actions} />}

              {isExpandable && (
                <div className={`absolute ${isHorizontal ? '-left-3 top-1/2 -translate-y-1/2 -rotate-90' : '-bottom-3 left-1/2 -translate-x-1/2'} rounded-full p-1 border shadow-xs transition-transform hover:scale-110 ${expandBtnStyle}`}>
                  {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </div>
              )}
            </div>
          </div>

          {/* Childless Spouses: ALWAYS rendered as editable/deletable SpouseCards! */}
          {childlessSpouses.length > 0 && (
            <div className={`flex gap-2 justify-center pt-1 ${isHorizontal ? 'flex-row' : 'flex-col h-full'}`}>
              {childlessSpouses.map((spouse: Spouse) => (
                <SpouseCard key={spouse.id} spouse={spouse} actions={actions} />
              ))}
            </div>
          )}
        </div>

        {isExpandable && isExpanded && (
          <>
            <div className={`${lineClass} ${isHorizontal ? 'h-0.5 w-5 md:w-10' : 'w-0.5 h-6 md:h-10'}`}></div>
            <div className={`flex justify-center relative ${isHorizontal ? 'flex-col gap-2' : 'flex-row'}`}>
              {spousesWithChildren.map((spouse: Spouse, idx: number) => (
                 <SpouseBranch key={spouse.id} spouse={spouse} level={level + 1} actions={actions} isFirst={idx === 0} isLast={idx === spousesWithChildren.length - 1 && !hasChildren} isSingle={spousesWithChildren.length === 1 && !hasChildren} />
              ))}
              {hasChildren && node.children!.map((child: Person, idx: number) => (
                <FamilyNode key={child.id} node={child} level={level + 1} isFirst={idx === 0 && spousesWithChildren.length === 0} isLast={idx === node.children!.length - 1} isSingle={node.children!.length === 1 && spousesWithChildren.length === 0} actions={actions} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // -- Render List or Nested --
  const renderListOrNested = () => {
    const isList = actions.layout === 'list';
    return (
      <div className={`w-full flex flex-col items-start ${isList ? 'mb-2.5' : `mb-4 p-3 md:p-5 border rounded-2xl shadow-xs ${nestedContainerStyle}`}`} id={`node-${node.id}`}>
        <div className="w-full flex flex-col md:flex-row gap-2.5">
          <div 
            onClick={() => isExpandable && setIsExpanded(!isExpanded)}
            className={`relative flex flex-col md:flex-row items-start md:items-center justify-between w-full p-3 md:p-4 rounded-xl border transition-all duration-300
              ${isExpandable || actions.isEditMode ? 'cursor-pointer hover:shadow-md' : 'shadow-xs'}
              ${nodeCardStyle}
            `}
          >
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className={`p-2.5 rounded-xl ${iconBgStyle} shrink-0`}>
                  {isRoot ? <Users size={20} className="text-emerald-400" /> : <User size={18} className={iconColorStyle} />}
               </div>
               <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="font-bold text-sm md:text-base leading-tight truncate">{node.name}</h3>
                  {node.title && <p className={`text-[10px] md:text-xs opacity-80 mt-0.5 ${titleBadgeStyle}`}>{node.title}</p>}
                  <NodeLinkBadges links={node.links} onNavigate={actions.onNavigateLink} />
               </div>
            </div>

            <div className={`flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto justify-end border-t md:border-none pt-2 md:pt-0 ${isDark ? 'border-slate-800' : isComfort ? 'border-[#d8c8ab]' : 'border-slate-200/40'}`}>
               {actions.isEditMode && <EditActionButtons id={node.id} name={node.name} title={node.title} isRoot={isRoot} actions={actions} />}
               {isExpandable && (
                  <div className={`p-1.5 rounded-full ml-1 shadow-xs ${expandBtnStyle}`}>
                     {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </div>
               )}
            </div>
          </div>
        </div>

        {/* Childless Spouses */}
        {childlessSpouses.length > 0 && (
          <div className="flex flex-col gap-2 mt-2.5 pr-3 md:pr-6 w-full">
            {childlessSpouses.map((spouse: Spouse) => (
              <SpouseCard key={spouse.id} spouse={spouse} actions={actions} />
            ))}
          </div>
        )}

        {isExpandable && isExpanded && (
          <div className={`w-full flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 ${isList ? `pr-4 md:pr-8 mt-3 border-r-2 ${dashedLineClass} border-dashed` : `mt-4 pt-4 border-t ${dashedLineClass}`}`}>
            {spousesWithChildren.map((spouse: Spouse) => (
               <SpouseBranch key={spouse.id} spouse={spouse} level={level + 1} actions={actions} isSingle={true} />
            ))}
            {hasChildren && node.children!.map((child: Person) => (
              <FamilyNode key={child.id} node={child} level={level + 1} actions={actions} isSingle={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (actions.layout === 'list' || actions.layout === 'nested') ? renderListOrNested() : renderClassicOrHorizontal();
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appData, setAppData] = useState<AppData | null>(() => loadLocalData() || initialAppData);
  const [activeTreeId, setActiveTreeId] = useState<string>('tree_1');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [currentLayout, setCurrentLayout] = useState<LayoutMode>('classic');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smooth Canvas Drag-to-Pan & Mouse Wheel Navigation for 2D Trees
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const hasMovedRef = useRef<boolean>(false);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only accept Left Click (0) or Middle Wheel Click (1)
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, inputs, links, or select dropdowns
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
      return;
    }

    const container = mainScrollRef.current;
    if (!container) return;

    // Prevent native browser text selection during dragging
    e.preventDefault();

    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    };

    const onWindowMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;

      if (!hasMovedRef.current && Math.hypot(dx, dy) > 5) {
        hasMovedRef.current = true;
        setIsCanvasDragging(true);
      }

      if (hasMovedRef.current && container) {
        container.scrollLeft = dragStartRef.current.scrollLeft - dx;
        container.scrollTop = dragStartRef.current.scrollTop - dy;
      }
    };

    const onWindowMouseUp = () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      setIsCanvasDragging(false);

      // If user dragged more than 5px, block accidental clicks on cards
      if (hasMovedRef.current) {
        const blockClick = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          window.removeEventListener('click', blockClick, true);
        };
        window.addEventListener('click', blockClick, true);
        setTimeout(() => {
          window.removeEventListener('click', blockClick, true);
        }, 120);
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = mainScrollRef.current;
    if (!container) return;

    if (e.ctrlKey) {
      // Ctrl + Wheel: Smooth Zoom In / Zoom Out
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoomLevel(prev => Math.min(Math.max(Number((prev + zoomDelta).toFixed(2)), 0.4), 2.0));
      return;
    }

    // If holding Alt, smooth horizontal scroll
    if (e.altKey) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
      return;
    }

    // If tree overflows horizontally but fits vertically, route vertical wheel to horizontal pan smoothly!
    if (!e.shiftKey && container.scrollWidth > container.clientWidth && container.scrollHeight <= container.clientHeight + 60) {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY * 0.9;
      }
    }
  };

  const handleResetView = () => {
    setZoomLevel(1);
    const container = mainScrollRef.current;
    if (container) {
      container.scrollTo({
        left: Math.max(0, (container.scrollWidth - container.clientWidth) / 2),
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handlePanStep = (dir: 'left' | 'right' | 'up' | 'down') => {
    const container = mainScrollRef.current;
    if (!container) return;
    const amount = 450;
    if (dir === 'left') container.scrollBy({ left: -amount, behavior: 'smooth' });
    if (dir === 'right') container.scrollBy({ left: amount, behavior: 'smooth' });
    if (dir === 'up') container.scrollBy({ top: -amount, behavior: 'smooth' });
    if (dir === 'down') container.scrollBy({ top: amount, behavior: 'smooth' });
  };

  // Auto-center horizontal scroll on tree load or layout change
  useEffect(() => {
    if (currentLayout !== '3d' && mainScrollRef.current) {
      const timer = setTimeout(() => {
        const container = mainScrollRef.current;
        if (container) {
          const targetLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
          container.scrollTo({ left: targetLeft, behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentLayout, activeTreeId]);

  // Theme Mode: Light (نهاري) | Dark (ليلي) | Comfort (راحة العين)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('family_tree_theme');
    return (saved === 'dark' || saved === 'comfort' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('family_tree_theme', themeMode);
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // Modals
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false, mode: 'ADD_CHILD', targetId: '', name: '', title: ''
  });

  const [confirmDeleteConfig, setConfirmDeleteConfig] = useState<ConfirmDeleteConfig>({
    isOpen: false, id: '', name: '', type: 'person'
  });

  // Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Firebase auth not configured or failed, using local mode:", err);
        setErrorMsg("يعمل بالوضع المحلي المحفوظ.");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Firestore Sync & Auto Migration
  useEffect(() => {
    if (!user) return; 

    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'family_trees', 'registry_v3');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppData;
        const normalizedData: AppData = {
          trees: (data.trees || []).map(normalizeTree),
          updatedAt: data.updatedAt || Date.now()
        };
        setAppData(normalizedData);
        saveLocalData(normalizedData);

        if (!normalizedData.trees.find((t: FamilyTree) => t.id === activeTreeId) && normalizedData.trees.length > 0) {
          setActiveTreeId(normalizedData.trees[0].id);
        }
        setErrorMsg(null); 
      } else {
        const local = loadLocalData() || initialAppData;
        setDoc(docRef, local).catch(err => {
           console.warn("Firestore write permissions prevented sync:", err);
           setErrorMsg("تم تفعيل الحفظ المحلي الدائم في المتصفح.");
        });
        setAppData(local);
      }
    }, (error) => {
      console.warn("Firestore snapshot error:", error);
      setErrorMsg("يعمل بالوضع المحلي التلقائي.");
    });

    return () => unsubscribe();
  }, [user]);

  // Highlight scroll handler
  useEffect(() => {
    if (highlightedNodeId) {
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(`node-${highlightedNodeId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 350); 
      
      const clearTimer = setTimeout(() => setHighlightedNodeId(null), 4500);
      return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
    }
  }, [highlightedNodeId, activeTreeId]);

  const activeTree = appData?.trees.find((t: FamilyTree) => t.id === activeTreeId) || appData?.trees[0];

  // Core Data Mutation Function
  const executeDataAction = async (actionFn: (data: AppData) => void) => {
    if (!appData) return;
    setIsSaving(true);
    
    const newData: AppData = JSON.parse(JSON.stringify(appData)); 
    actionFn(newData);
    
    // Normalize and persist locally immediately
    const cleanData: AppData = {
      trees: newData.trees.map(normalizeTree),
      updatedAt: Date.now()
    };
    setAppData(cleanData);
    saveLocalData(cleanData);

    // Sync to Firestore if user is authenticated
    if (user) {
      try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'family_trees', 'registry_v3');
        await setDoc(docRef, cleanData);
      } catch (error) {
        console.warn("Firestore sync failed, local copy preserved:", error);
      }
    }
    setIsSaving(false);
  };

  // Action Handlers
  const handleEdit = (id: string, type: 'person' | 'spouse', currentName: string, currentTitle?: string) => {
    setModalConfig({ isOpen: true, mode: 'EDIT', targetId: id, targetType: type, name: currentName, title: currentTitle || '' });
  };

  const handleAddChild = (id: string) => {
    setModalConfig({ isOpen: true, mode: 'ADD_CHILD', targetId: id, name: '', title: '' });
  };

  const handleAddSpouse = (id: string) => {
    setModalConfig({ isOpen: true, mode: 'ADD_SPOUSE', targetId: id, name: '', title: '' });
  };

  const handleLinkNode = (id: string, currentName: string) => {
    setModalConfig({ 
      isOpen: true, mode: 'LINK_NODE', targetId: id, name: currentName, title: '', 
      selectedTargetTreeId: activeTreeId, selectedTargetPersonId: '' 
    });
  };

  // Safe Delete Handlers with Confirmation Modal
  const requestDelete = (id: string, name: string, type: 'person' | 'spouse') => {
    if (activeTree && id === activeTree.root.id) {
      alert("لا يمكن حذف رأس الشجرة. يمكنك تعديل اسمه بدلاً من ذلك.");
      return;
    }

    let descendants = 0;
    if (activeTree) {
      findAndMutate(activeTree.root, id, (target) => {
        descendants = countDescendants(target);
      });
    }

    setConfirmDeleteConfig({
      isOpen: true,
      id,
      name,
      type,
      childCount: descendants
    });
  };

  const requestDeleteTree = (tree: FamilyTree) => {
    if (appData && appData.trees.length <= 1) {
      alert("لا يمكن حذف الشجرة الوحيدة في التطبيق.");
      return;
    }

    setConfirmDeleteConfig({
      isOpen: true,
      id: tree.id,
      name: tree.name,
      type: 'tree',
      description: "سيتم حذف هذه الشجرة بالكامل وجميع الأفراد والفروع المسجلين بداخلها."
    });
  };

  const confirmDeleteExecution = () => {
    const { id, type } = confirmDeleteConfig;

    if (type === 'tree') {
      executeDataAction((data: AppData) => {
        data.trees = data.trees.filter(t => t.id !== id);
        if (activeTreeId === id && data.trees.length > 0) {
          setActiveTreeId(data.trees[0].id);
        }
      });
    } else {
      executeDataAction((data: AppData) => {
        const tree = data.trees.find(t => t.id === activeTreeId);
        if (tree) {
          deleteNode(tree.root, id);
        }
      });
    }

    setConfirmDeleteConfig({ isOpen: false, id: '', name: '', type: 'person' });
  };

  const handleCreateTree = () => {
    setModalConfig({ isOpen: true, mode: 'CREATE_TREE', targetId: '', name: '', title: '' });
    setIsSidebarOpen(false);
  };

  const handleEditTreeName = (tree: FamilyTree) => {
    setModalConfig({ isOpen: true, mode: 'EDIT_TREE', targetId: tree.id, name: tree.name, title: '' });
  };

  const handleNavigateLink = (treeId: string, personId: string) => {
    setActiveTreeId(treeId);
    setHighlightedNodeId(personId);
  };

  const handleExportData = () => {
    if (!appData) return;
    exportTreesToJson(appData);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedData = await importTreesFromJson(file);
      executeDataAction((data) => {
        data.trees = importedData.trees;
      });
      alert("تم استيراد شجرات العائلة بنجاح!");
    } catch (err: any) {
      alert(err?.message || "فشل استيراد الملف");
    }
  };

  // Modal Submit (Creation, Edits, Links)
  const handleModalSubmit = (e: FormEvent) => {
    e.preventDefault();
    const { mode, targetId, name, title, targetType, selectedTargetTreeId, selectedTargetPersonId } = modalConfig;
    if (mode !== 'MERGE_CONFIRM' && !name.trim()) return;

    if (mode === 'CREATE_TREE') {
      executeDataAction((data: AppData) => {
        const newTree: FamilyTree = {
          id: `tree_${generateId()}`,
          name: name.trim(),
          root: { id: generateId(), name: 'رأس العائلة', type: 'root', children: [], spouses: [] }
        };
        data.trees.push(newTree);
        setActiveTreeId(newTree.id);
      });
      setModalConfig({ ...modalConfig, isOpen: false });
      return;
    }

    if (mode === 'EDIT_TREE') {
      executeDataAction((data: AppData) => {
        const t = data.trees.find(x => x.id === targetId);
        if (t) t.name = name.trim();
      });
      setModalConfig({ ...modalConfig, isOpen: false });
      return;
    }

    if (mode === 'MERGE_CONFIRM') {
      executeDataAction((data: AppData) => {
        const tree = data.trees.find(t => t.id === activeTreeId);
        if (tree) {
           const freshSeed = JSON.parse(JSON.stringify(initialAppData.trees[0].root));
           mergeNodes(tree.root, freshSeed);
        }
      });
      setModalConfig({ ...modalConfig, isOpen: false });
      return;
    }

    executeDataAction((data: AppData) => {
      const tree = data.trees.find(t => t.id === activeTreeId);
      if (!tree) return;

      findAndMutate(tree.root, targetId, (target: any) => {
        if (mode === 'EDIT') {
          target.name = name.trim();
          if (targetType === 'person' || targetType === 'spouse') {
             if (title) target.title = title.trim(); else delete target.title; 
          }
        } else if (mode === 'ADD_CHILD') {
          target.children = target.children || [];
          const newChild: Person = { 
            id: generateId(), 
            name: name.trim(),
            children: [],
            spouses: []
          };
          if (title) newChild.title = title.trim(); 
          target.children.push(newChild);
        } else if (mode === 'ADD_SPOUSE') {
          target.spouses = target.spouses || [];
          target.spouses.push({ 
            id: generateId(), 
            name: name.trim(), 
            title: title ? title.trim() : undefined,
            children: [],
            links: []
          });
        } else if (mode === 'LINK_NODE' && selectedTargetTreeId && selectedTargetPersonId) {
          target.links = target.links || [];
          const targetTreeObj = data.trees.find(t => t.id === selectedTargetTreeId);
          let targetNameStr = 'شخص مرتبط';
          if (targetTreeObj) {
            const flatList = getFlatPeopleList(targetTreeObj.root, targetTreeObj.id, targetTreeObj.name);
            const p = flatList.find(x => x.id === selectedTargetPersonId);
            if (p) targetNameStr = p.name;
          }
          
          target.links.push({
            targetTreeId: selectedTargetTreeId,
            targetPersonId: selectedTargetPersonId,
            targetName: targetNameStr,
            targetTreeName: targetTreeObj?.name || 'شجرة غير معروفة'
          });

          // Bidirectional linking: also add link back on the target person!
          if (targetTreeObj) {
            findAndMutate(targetTreeObj.root, selectedTargetPersonId, (otherNode) => {
              otherNode.links = otherNode.links || [];
              const exists = otherNode.links.some((l: any) => l.targetPersonId === targetId);
              if (!exists) {
                otherNode.links.push({
                  targetTreeId: activeTreeId,
                  targetPersonId: targetId,
                  targetName: target.name,
                  targetTreeName: tree.name
                });
              }
            });
          }
        }
      });
    });

    setModalConfig({ ...modalConfig, isOpen: false });
  };

  const actions: TreeActions = {
    onEdit: handleEdit,
    onAddChild: handleAddChild,
    onAddSpouse: handleAddSpouse,
    onDelete: requestDelete,
    onLink: handleLinkNode,
    onNavigateLink: handleNavigateLink,
    isEditMode,
    highlightedNodeId,
    layout: currentLayout,
    themeMode
  };

  const isDark = themeMode === 'dark';
  const isComfort = themeMode === 'comfort';

  const appBg = isDark ? 'bg-[#070b14] text-slate-100' : isComfort ? 'bg-[#fbf7ee] text-[#2c2214]' : 'bg-slate-50 text-slate-800';
  const headerBg = isDark ? 'bg-[#0b101f]/95 border-slate-800 text-slate-100' : isComfort ? 'bg-[#f5ecdc]/95 border-[#d4be9b] text-[#2c2214]' : 'bg-white/90 border-slate-200/80 text-slate-800';
  const sidebarBg = isDark ? 'bg-[#0b101f] border-slate-800 text-slate-100' : isComfort ? 'bg-[#fbf7ee] border-[#d8c8ab] text-[#2c2214]' : 'bg-white border-slate-200 text-slate-800';
  const sidebarHeaderBg = isDark ? 'bg-[#070b14] border-slate-800 text-slate-100' : isComfort ? 'bg-[#f5ecdc] border-[#d8c8ab] text-[#2c2214]' : 'bg-slate-50 border-slate-200 text-emerald-900';
  const sidebarFooterBg = isDark ? 'bg-[#070b14] border-slate-800' : isComfort ? 'bg-[#f5ecdc] border-[#d8c8ab]' : 'bg-slate-50 border-slate-200';
  const sidebarBtnBg = isDark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b] text-[#332616] hover:bg-[#e4d3b8]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';
  const mainAreaBg = currentLayout === '3d' 
    ? (isDark ? 'bg-[#020704]' : isComfort ? 'bg-[#18130e]' : 'bg-[#eef8f2]') 
    : (currentLayout === 'list' || currentLayout === 'nested') 
    ? (isDark ? 'bg-[#070b14]' : isComfort ? 'bg-[#fbf7ee]' : 'bg-white') 
    : (isDark ? 'bg-[#070b14]' : isComfort ? 'bg-[#fbf7ee]' : 'bg-slate-50/50');
  const zoomControlsBg = isDark ? 'bg-[#0f172a]/95 border-slate-800 text-slate-200' : isComfort ? 'bg-[#f5ecdc]/95 border-[#d8c8ab] text-[#3d3223]' : 'bg-white/90 border-slate-200 text-slate-600';
  const zoomBtnHover = isDark ? 'hover:bg-slate-800 text-slate-200' : isComfort ? 'hover:bg-[#ebdcc4] text-[#332616]' : 'hover:bg-slate-100 text-slate-600';
  const layoutSelectBg = isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b] text-[#332616]' : 'bg-white border-none text-slate-700';

  const availableTargetTrees = appData?.trees || [];
  let availableTargetPersons: FlatPerson[] = [];
  if (modalConfig.mode === 'LINK_NODE' && modalConfig.selectedTargetTreeId) {
    const tTree = appData?.trees.find(t => t.id === modalConfig.selectedTargetTreeId);
    if (tTree) availableTargetPersons = getFlatPeopleList(tTree.root, tTree.id, tTree.name);
  }

  const allPersonsFlat = appData ? getAllTreesFlatList(appData.trees) : [];

  if (!appData && !errorMsg) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${appBg}`} dir="rtl">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
        <h2 className="text-xl font-bold">جاري تحميل بيانات العائلة...</h2>
      </div>
    );
  }

  return (
    <div dir="rtl" className={`min-h-screen ${appBg} font-sans flex flex-col overflow-hidden relative transition-colors duration-200`}>
      
      {/* Hidden file input for JSON import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Confirmation Modal */}
      <ConfirmModal 
        config={confirmDeleteConfig}
        onConfirm={confirmDeleteExecution}
        onCancel={() => setConfirmDeleteConfig({ isOpen: false, id: '', name: '', type: 'person' })}
        themeMode={themeMode}
      />

      {/* Sidebar: Tree Management & Options */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-80 md:w-96 ${sidebarBg} transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-2xl`}>
        <div className={`p-5 border-b flex justify-between items-center ${sidebarHeaderBg}`}>
          <div className="flex items-center gap-2.5 font-black text-lg">
            <FolderTree size={22} className={isDark ? 'text-emerald-400' : isComfort ? 'text-[#8c531b]' : 'text-emerald-600'} />
            <span>أشجار العائلات</span>
          </div>
          <button className={`p-2 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : isComfort ? 'text-[#8c7659] hover:text-[#332616] hover:bg-[#ebdcc4]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`} onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className={`text-xs font-bold px-2 uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : isComfort ? 'text-[#8c7659]' : 'text-slate-400'}`}>
            الشجرات المتاحة ({appData?.trees.length})
          </div>
          {appData?.trees.map((tree: FamilyTree) => {
            const isActive = activeTreeId === tree.id;
            const treeItemStyle = isActive
              ? (isDark ? 'bg-emerald-950/70 border-emerald-500/80 shadow-sm ring-2 ring-emerald-500/30 text-emerald-200' : isComfort ? 'bg-[#ebdcc4] border-amber-600 shadow-sm ring-2 ring-amber-600/30 text-[#45321f]' : 'bg-emerald-50/90 border-emerald-300 shadow-sm ring-2 ring-emerald-200 text-emerald-950')
              : (isDark ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/60 text-slate-300' : isComfort ? 'bg-[#f5ecdc] border-[#e0cfb5] hover:border-amber-600/40 hover:bg-[#ebdcc4] text-[#3d3223]' : 'bg-white border-slate-200/80 hover:border-emerald-200 hover:bg-slate-50 text-slate-700');

            return (
              <div
                key={tree.id}
                className={`w-full p-3.5 rounded-2xl transition-all duration-200 flex items-center justify-between border ${treeItemStyle}`}
              >
                <button
                  onClick={() => { setActiveTreeId(tree.id); setIsSidebarOpen(false); }}
                  className="flex-1 text-right flex items-center gap-2.5 min-w-0"
                >
                  <GitMerge size={18} className={isActive ? (isDark ? 'text-emerald-400' : isComfort ? 'text-amber-700' : 'text-emerald-600') : (isDark ? 'text-slate-500' : isComfort ? 'text-[#a18c72]' : 'text-slate-400')} />
                  <span className="font-bold text-sm truncate">{tree.name}</span>
                </button>

                <div className="flex items-center gap-1 shrink-0 mr-2">
                  <button
                    onClick={() => handleEditTreeName(tree)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                    title="تعديل اسم الشجرة"
                  >
                    <Edit2 size={13} />
                  </button>
                  {appData.trees.length > 1 && (
                    <button
                      onClick={() => requestDeleteTree(tree)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="حذف هذه الشجرة"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer Operations */}
        <div className={`p-4 border-t space-y-2 ${sidebarFooterBg}`}>
          <button 
            onClick={handleCreateTree} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/30 text-sm"
          >
            <PlusCircle size={18} /> شجرة عائلة جديدة
          </button>

          <button 
            onClick={() => { setModalConfig({ isOpen: true, mode: 'MERGE_CONFIRM', targetId: '', name: '', title: '' }); setIsSidebarOpen(false); }} 
            className={`w-full font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs ${
              isDark ? 'bg-indigo-950/70 text-indigo-300 hover:bg-indigo-900/80' : isComfort ? 'bg-[#e2d5ed] text-[#4a2e66] hover:bg-[#d5c3e4]' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
            }`}
          >
            <GitMerge size={16} /> دمج الأسماء المحدثة
          </button>

          <div className="flex gap-2 pt-1">
            <button 
              onClick={handleExportData}
              className={`flex-1 border font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors ${sidebarBtnBg}`}
              title="تصدير نسخة احتياطية كملف JSON"
            >
              <Download size={14} /> تصدير نسخة
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors ${sidebarBtnBg}`}
              title="استيراد بيانات من ملف JSON"
            >
              <Upload size={14} /> استيراد نسخة
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Offline / Notification Banner */}
        {errorMsg && (
          <div className="bg-amber-100 text-amber-900 px-4 py-1.5 text-xs font-bold flex justify-center items-center gap-2 border-b border-amber-200 shrink-0">
            <AlertTriangle size={14} /> <span>{errorMsg}</span>
          </div>
        )}

        {/* Compact Responsive App Header */}
        <header className={`${headerBg} backdrop-blur-md border-b z-30 shrink-0 shadow-xs px-3 py-2.5 md:px-6 md:py-3 transition-colors duration-200`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 md:gap-4">
            
            {/* Top row on mobile: Menu, Title, Edit Name */}
            <div className="flex items-center justify-between gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  className={`p-2.5 rounded-xl transition-colors shrink-0 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : isComfort ? 'bg-[#ebdcc4] hover:bg-[#e4d3b8] text-[#332616]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} 
                  onClick={() => setIsSidebarOpen(true)} 
                  title="عرض وإدارة الأشجار"
                >
                  <FolderTree size={20} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm md:text-xl font-black truncate leading-tight">
                      {activeTree?.name || 'شجرة العائلة'}
                    </h1>
                    {activeTree && (
                      <button 
                        onClick={() => handleEditTreeName(activeTree)} 
                        className="text-slate-400 hover:text-blue-500 p-1 rounded transition-colors"
                        title="تعديل اسم الشجرة"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className={`text-[10px] md:text-xs font-medium hidden sm:flex items-center gap-2 ${isDark ? 'text-slate-400' : isComfort ? 'text-[#8c7659]' : 'text-slate-500'}`}>
                    نظام التوثيق والارتباط الذكي
                    {isSaving && <span className="text-emerald-500 flex items-center gap-1 animate-pulse"><Loader2 size={11} className="animate-spin"/> جاري الحفظ...</span>}
                  </p>
                </div>
              </div>

              {/* Edit Mode Toggle for Mobile (Header right) */}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`md:hidden px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isEditMode ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isEditMode ? <><X size={14}/> إغلاق التعديل</> : <><Edit2 size={14}/> وضع التعديل</>}
              </button>
            </div>

            {/* Middle & Right: Search Bar, Theme Switcher & Layout Switcher */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
              {/* Instant Search Bar across all trees */}
              <TreeSearch 
                people={allPersonsFlat} 
                onSelectPerson={handleNavigateLink}
                currentTreeId={activeTreeId}
                themeMode={themeMode}
              />

              {/* Theme Switcher: Light (نهاري) / Dark (ليلي) / Eye Comfort (راحة العين) */}
              <div className={`flex items-center p-1 rounded-xl border shrink-0 ${isDark ? 'bg-slate-900 border-slate-800' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b]' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  onClick={() => setThemeMode('light')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    themeMode === 'light' 
                      ? 'bg-white text-amber-600 shadow-xs' 
                      : isDark ? 'text-slate-400 hover:text-slate-200' : isComfort ? 'text-[#7d6549] hover:text-[#332616]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="الوضع النهاري"
                >
                  <Sun size={14} />
                  <span className="hidden sm:inline">نهاري</span>
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    themeMode === 'dark' 
                      ? 'bg-slate-800 text-cyan-300 shadow-xs ring-1 ring-cyan-500/30' 
                      : isDark ? 'text-slate-400 hover:text-slate-200' : isComfort ? 'text-[#7d6549] hover:text-[#332616]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="الوضع الليلي"
                >
                  <Moon size={14} />
                  <span className="hidden sm:inline">ليلي</span>
                </button>
                <button
                  onClick={() => setThemeMode('comfort')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    themeMode === 'comfort' 
                      ? 'bg-[#45321f] text-amber-200 shadow-xs ring-1 ring-[#5e4226]' 
                      : isDark ? 'text-slate-400 hover:text-slate-200' : isComfort ? 'text-[#7d6549] hover:text-[#332616]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="وضع راحة العين (ألوان دافئة ومريحة للبصر)"
                >
                  <Eye size={14} />
                  <span className="hidden sm:inline">راحة العين</span>
                </button>
              </div>

              {/* Layout Switcher */}
              <div className={`flex items-center p-1 rounded-xl shrink-0 border ${isDark ? 'bg-slate-900 border-slate-800' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b]' : 'bg-slate-100 border-slate-200'}`}>
                <LayoutTemplate size={16} className={`mx-1.5 shrink-0 hidden sm:inline ${isDark ? 'text-slate-400' : isComfort ? 'text-[#8c7659]' : 'text-slate-400'}`} />
                <select 
                  value={currentLayout} 
                  onChange={(e) => setCurrentLayout(e.target.value as LayoutMode)}
                  className={`text-xs md:text-sm font-bold rounded-lg py-1.5 px-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 shadow-xs border ${layoutSelectBg}`}
                >
                  <option value="classic">🌲 عمودية (كلاسيكي)</option>
                  <option value="horizontal">🌿 أفقية (عريض)</option>
                  <option value="list">📱 قائمة (للجوال)</option>
                  <option value="nested">📂 بطاقات مكثفة</option>
                  <option value="3d">✨ ثلاثية الأبعاد (3D)</option>
                </select>
              </div>
            </div>

          </div>
        </header>

        {/* Tree Render View Area */}
        <main 
          ref={mainScrollRef}
          dir="ltr"
          onMouseDown={currentLayout !== '3d' ? handleCanvasMouseDown : undefined}
          onWheel={currentLayout !== '3d' ? handleCanvasWheel : undefined}
          className={`flex-1 overflow-auto w-full relative transition-colors duration-200 ${
            isCanvasDragging ? 'cursor-grabbing select-none' : currentLayout !== '3d' ? 'cursor-grab' : ''
          } ${mainAreaBg} ${currentLayout === '3d' ? 'p-2 md:p-4' : currentLayout === 'list' || currentLayout === 'nested' ? 'p-4 md:p-8' : 'p-4'}`}
        >
          
          {currentLayout === '3d' && activeTree ? (
            <ThreeDTree 
              tree={activeTree} 
              actions={actions} 
              onNavigateLink={handleNavigateLink} 
              themeMode={themeMode}
            />
          ) : (
            <div 
              dir="rtl"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}
              className={`min-w-max inline-flex flex-col items-center pb-48 md:pb-64 w-full min-h-[85vh] ${currentLayout === 'horizontal' ? 'pt-6 justify-center' : 'pt-10 justify-start'}`}
            >
              {activeTree ? (
                <div className={currentLayout === 'list' || currentLayout === 'nested' ? 'w-full max-w-4xl mx-auto' : ''}>
                  <FamilyNode node={activeTree.root} isSingle={true} actions={actions} />
                </div>
              ) : (
                <div className="text-slate-400 mt-20 text-center font-bold">
                  الرجاء اختيار أو إنشاء شجرة من القائمة الجانبية
                </div>
              )}
            </div>
          )}

          {/* Floating Zoom & Pan Controls (For 2D Layouts) */}
          {currentLayout !== '3d' && (
            <div className={`fixed bottom-6 right-6 z-30 flex items-center gap-1.5 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border transition-colors ${zoomControlsBg}`}>
              <button
                onClick={() => handlePanStep('right')}
                className={`p-2 rounded-xl transition-colors ${zoomBtnHover}`}
                title="تحريك لليمين"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => handlePanStep('left')}
                className={`p-2 rounded-xl transition-colors ${zoomBtnHover}`}
                title="تحريك لليسار"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 1.8))}
                className={`p-2 rounded-xl transition-colors ${zoomBtnHover}`}
                title="تكبير"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.4))}
                className={`p-2 rounded-xl transition-colors ${zoomBtnHover}`}
                title="تصغير"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={handleResetView}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${zoomBtnHover}`}
                title="إعادة ضبط المقياس وتوسيط الشجرة"
              >
                <RotateCcw size={12} />
                <span>{Math.round(zoomLevel * 100)}%</span>
              </button>
            </div>
          )}

        </main>
      </div>

      {/* Floating Action Button for Desktop: Edit Mode Toggle */}
      <button 
        onClick={() => setIsEditMode(!isEditMode)}
        className={`hidden md:flex fixed bottom-6 left-6 z-40 items-center justify-center gap-2.5 px-5 py-3.5 rounded-full font-black shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 ${
          isEditMode 
            ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/40 hover:bg-rose-700' 
            : 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/40 hover:bg-emerald-700'
        }`}
      >
        {isEditMode ? <X size={20} /> : <Edit2 size={20} />}
        <span className="text-sm">{isEditMode ? 'إغلاق وضع التعديل' : 'تفعيل وضع التعديل'}</span>
      </button>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-40 transition-opacity backdrop-blur-xs" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Unified Action Modals (Add, Edit, Link, Create Tree) */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-slate-100' : isComfort ? 'bg-[#fbf7ee] border-[#d4be9b] text-[#2c2214]' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              modalConfig.mode === 'LINK_NODE' ? 'bg-purple-600' : 
              modalConfig.mode === 'MERGE_CONFIRM' ? 'bg-indigo-600' : 
              modalConfig.mode === 'EDIT_TREE' ? 'bg-blue-600' : 
              'bg-emerald-600'
            }`}>
              <h2 className="font-bold text-base md:text-lg flex items-center gap-2">
                {modalConfig.mode === 'CREATE_TREE' && <><PlusCircle size={20}/> إنشاء شجرة عائلة جديدة</>}
                {modalConfig.mode === 'EDIT_TREE' && <><Edit2 size={20}/> تعديل اسم الشجرة</>}
                {modalConfig.mode === 'ADD_CHILD' && <><UserPlus size={20}/> إضافة ابن/ابنة جديدة</>}
                {modalConfig.mode === 'ADD_SPOUSE' && <><HeartHandshake size={20}/> إضافة زوجة جديدة</>}
                {modalConfig.mode === 'EDIT' && <><Edit2 size={20}/> تعديل البيانات</>}
                {modalConfig.mode === 'LINK_NODE' && <><LinkIcon size={20}/> ربط &quot;{modalConfig.name}&quot; بشخص آخر</>}
                {modalConfig.mode === 'MERGE_CONFIRM' && <><GitMerge size={20}/> استيراد ودمج التحديثات</>}
              </h2>
              <button 
                onClick={() => setModalConfig({...modalConfig, isOpen: false})} 
                className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1.5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-5 md:p-6 space-y-4">
              
              {modalConfig.mode === 'MERGE_CONFIRM' && (
                <div className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed border ${
                  isDark ? 'bg-indigo-950/50 border-indigo-800/60 text-indigo-200' : isComfort ? 'bg-[#ede0cb] border-[#d8c8ab] text-[#3d294d]' : 'bg-indigo-50 border-indigo-100 text-indigo-950'
                }`}>
                  <p className="font-bold text-sm mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-indigo-400"/> تأكيد عملية الدمج</p>
                  سيتم دمج جميع الأسماء والبيانات المحدثة مع شجرتك الحالية. لن يتم حذف أي إضافات يدوية قمت بها سابقاً.
                </div>
              )}

              {modalConfig.mode !== 'LINK_NODE' && modalConfig.mode !== 'MERGE_CONFIRM' && (
                <>
                  <div>
                    <label className={`block text-xs md:text-sm font-bold mb-1.5 ${isDark ? 'text-slate-300' : isComfort ? 'text-[#5e4a36]' : 'text-slate-700'}`}>
                      {modalConfig.mode === 'CREATE_TREE' || modalConfig.mode === 'EDIT_TREE' ? 'اسم الشجرة / العائلة' : 'الاسم الكامل'} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      autoFocus 
                      type="text" 
                      required 
                      value={modalConfig.name} 
                      onChange={(e) => setModalConfig({...modalConfig, name: e.target.value})} 
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b] text-[#332616] placeholder:text-[#8c7659]' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`} 
                      placeholder={modalConfig.mode === 'CREATE_TREE' ? 'مثال: عائلة المهدي' : 'أدخل الاسم...'} 
                    />
                  </div>

                  {(modalConfig.mode !== 'CREATE_TREE' && modalConfig.mode !== 'EDIT_TREE') && (
                    <div>
                      <label className={`block text-xs md:text-sm font-bold mb-1.5 ${isDark ? 'text-slate-300' : isComfort ? 'text-[#5e4a36]' : 'text-slate-700'}`}>اللقب أو الوصف (اختياري)</label>
                      <input 
                        type="text" 
                        value={modalConfig.title} 
                        onChange={(e) => setModalConfig({...modalConfig, title: e.target.value})} 
                        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b] text-[#332616] placeholder:text-[#8c7659]' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400'
                        }`} 
                        placeholder="مثال: الابن الأكبر، طبيب العائلة..." 
                      />
                    </div>
                  )}
                </>
              )}

              {modalConfig.mode === 'LINK_NODE' && (
                <>
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
                    isDark ? 'bg-purple-950/50 border-purple-800/60 text-purple-200' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b] text-[#422359]' : 'bg-purple-50 border-purple-100 text-purple-950'
                  }`}>
                    اربط <strong>{modalConfig.name}</strong> بشخص في شجرة أخرى لإظهار علاقة النسب أو المصاهرة برابط ذكي متبادل.
                  </div>
                  <div>
                    <label className={`block text-xs md:text-sm font-bold mb-1.5 ${isDark ? 'text-slate-300' : isComfort ? 'text-[#5e4a36]' : 'text-slate-700'}`}>اختر الشجرة الهدف <span className="text-red-500">*</span></label>
                    <select 
                      required 
                      value={modalConfig.selectedTargetTreeId || ''} 
                      onChange={(e) => setModalConfig({...modalConfig, selectedTargetTreeId: e.target.value, selectedTargetPersonId: ''})} 
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none font-bold text-sm ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b] text-[#332616]' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="" disabled>-- اختر الشجرة --</option>
                      {availableTargetTrees.map((t: FamilyTree) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  {modalConfig.selectedTargetTreeId && (
                    <div>
                      <label className={`block text-xs md:text-sm font-bold mb-1.5 ${isDark ? 'text-slate-300' : isComfort ? 'text-[#5e4a36]' : 'text-slate-700'}`}>اختر الشخص المراد الربط به <span className="text-red-500">*</span></label>
                      <select 
                        required 
                        value={modalConfig.selectedTargetPersonId || ''} 
                        onChange={(e) => setModalConfig({...modalConfig, selectedTargetPersonId: e.target.value})} 
                        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none font-bold text-sm ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : isComfort ? 'bg-[#ebdcc4] border-[#d4be9b] text-[#332616]' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="" disabled>-- اختر الشخص --</option>
                        {availableTargetPersons.map((p: FlatPerson) => <option key={p.id} value={p.id}>{p.name} {p.id === modalConfig.targetId ? '(نفس الشخص)' : ''}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="pt-3 flex gap-2.5">
                <button 
                  disabled={isSaving || (modalConfig.mode === 'LINK_NODE' && !modalConfig.selectedTargetPersonId)} 
                  type="submit" 
                  className={`flex-1 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 text-sm ${
                    modalConfig.mode === 'LINK_NODE' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200 disabled:bg-purple-300' : 
                    modalConfig.mode === 'MERGE_CONFIRM' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
                    modalConfig.mode === 'EDIT_TREE' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' :
                    'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 disabled:bg-emerald-400'
                  }`}
                >
                  {modalConfig.mode === 'LINK_NODE' ? <><LinkIcon size={16} /> إنشاء الارتباط المتبادل</> : 
                   modalConfig.mode === 'MERGE_CONFIRM' ? <><GitMerge size={16} /> تأكيد ودمج</> :
                   <><Save size={16} /> حفظ التغييرات</>}
                </button>
                <button 
                  type="button" 
                  onClick={() => setModalConfig({...modalConfig, isOpen: false})} 
                  className={`flex-1 font-bold py-3 rounded-xl transition-all text-sm ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : isComfort ? 'bg-[#ebdcc4] hover:bg-[#d8c8ab] text-[#332616]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}