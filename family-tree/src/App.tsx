import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Users, User, Heart, GitMerge } from 'lucide-react';

// --- Types ---
interface Person {
  name: string;
  title?: string;
  type?: string;
  spouse?: string;
  spouses?: Spouse[];
  children?: Person[];
  highlight?: boolean;
}

interface Spouse {
  name: string;
  children?: Person[];
}

// --- Data Structure derived from the provided images ---
const familyData: Person = {
  name: "إدريس فضول",
  title: "رأس العائلة - الشمالية",
  type: "root",
  children: [
    {
      name: "محمد إدريس فضول",
      spouses: [
        {
          name: "رقية حاج يعقوب محمد الأمين",
          children: [
            {
              name: "الصاوي محمد إدريس",
              highlight: true, 
              spouses: [
                {
                  name: "آمنة محمد الشيخ نصر",
                  children: [
                    { name: "يعقوب الصاوي", spouse: "فاطمة بشير محمد إدريس", children: [{name:"عبد القادر"}, {name:"يوسف"}, {name:"صلاح"}, {name:"عثمان"}, {name:"عبد العظيم"}, {name:"شادية"}, {name:"هادية"}, {name:"منى"}, {name:"التوأم صفاء ومروة"}] },
                    { name: "صالح الصاوي", spouse: "شامة علي منوفلا", children: [{name:"عادل"}, {name:"علي"}, {name:"عايدة"}] },
                    { name: "عبد الكريم الصاوي", spouse: "دار النعيم القاسم", children: [{name:"محمد"}, {name:"إبراهيم"}, {name:"الصاوي"}, {name:"رابعة"}, {name:"هدى"}] },
                    { name: "موسى الصاوي", spouses: [
                        { name: "خديجة عثمان علي", children: [{name:"عوض الله"}, {name:"الطيب"}, {name:"رضوان"}, {name:"نجوى"}, {name:"آمنة"}] },
                        { name: "إبنة إبراهيم الحاج يوسف", children: [{name:"بثينة"}, {name:"سهام"}] }
                    ] },
                    { name: "الحاجة الصاوي", spouse: "محمد الحسن يونس", children: [{name:"يونس"}, {name:"عبد الله"}, {name:"زينب"}, {name:"بتول"}, {name:"كوثر"}, {name:"خديجة"}] },
                    { name: "غناوة الصاوي", spouse: "علي القاسم", children: [{name:"معاوية"}] },
                    { name: "التومة الصاوي", spouse: "إبراهيم الأمين", children: [{name:"أحمد"}, {name:"عمر"}, {name:"منير"}, {name:"هداية"}, {name:"أميرة"}, {name:"منيرة"}, {name:"مروة"}, {name:"نهى"}] },
                    { name: "فاطمة الصاوي", spouse: "الخاتم الباقر عثمان", children: [{name:"الباقر"}, {name:"ناصر"}, {name:"انتصار"}, {name:"هاجر"}, {name:"اعتماد"}, {name:"فايقة"}] }
                  ]
                },
                {
                  name: "زينب الخليفة حسين (فارس)",
                  children: [
                    { name: "هجو الصاوي", spouse: "نادية الأمين", children: [{name:"فاطمة"}, {name:"حسام الدين"}, {name:"علاء الدين"}] },
                    { name: "عائشة الصاوي", spouse: "محمد هجو محمد إدريس", children: [{name:"(لم تنجب)"}] },
                    { name: "زروق الصاوي", spouse: "ثريا محمد أحمد أبو", children: [{name:"رانيا"}, {name:"رامي"}, {name:"وتوأمان محمد ومؤتمن"}] },
                    { name: "تاج الدين الصاوي", spouse: "فاطمة هجو محمد إدريس", children: [{name:"زينب"}, {name:"آمنة"}, {name:"هبة"}, {name:"يسري"}, {name:"الصاوي"}, {name:"مرام"}] },
                    { name: "بدر الدين الصاوي", spouse: "نسيبه حسن بشير", children: [{name:"أحمد"}, {name:"زينب"}, {name:"محمد"}, {name:"بلسم"}, {name:"ريم"}] },
                    { name: "رشيدة الصاوي", spouse: "كمال محمود مصطفى", children: [{name:"حذيفة"}, {name:"ايمن"}, {name:"خباب"}, {name:"محمد"}, {name:"مروان"}] }
                  ]
                },
                {
                  name: "فاطمة مساعد علي (ديم المشايخة)",
                  children: [
                    { name: "محمد توم الصاوي", spouse: "نادية الطيب أحمد الطيب", children: [{name:"نزار"}, {name:"عمار"}, {name:"نور"}, {name:"علاء"}] },
                    { name: "شرف الدين الصاوي", spouse: "هالة هجو محمد إدريس", children: [{name:"معتز"}, {name:"محمد"}, {name:"مازن"}, {name:"إسراء"}, {name:"فاطمة"}] },
                    { name: "محمد الحسن الصاوي", spouse: "أمل حسن محمد إدريس", children: [{name:"أبوبكر"}, {name:"أواب"}, {name:"آلاء"}] },
                    { name: "عفاف الصاوي", spouse: "عادل عمر محمد إبراهيم", children: [{name:"كمال"}, {name:"أحمد"}, {name:"مآب"}, {name:"وئام"}] },
                    { name: "مريم الصاوي", spouse: "حسن بشير محمد إدريس", children: [{name:"عمرو"}] },
                    { name: "رقية الصاوي", spouse: "صديق المهدي علي", children: [{name:"إبراهيم"}, {name:"محمد"}, {name:"ملاذ"}] }
                  ]
                },
                {
                  name: "زهراء الحبشية",
                  children: [
                    { name: "الطاهر" },
                    { name: "بتول" }
                  ]
                },
                {
                  name: "إمامة عثمان",
                  children: [
                     { name: "(لم تنجب)" }
                  ]
                }
              ]
            },
            {
              name: "بشير محمد إدريس",
              spouse: "نسمة الأمين",
              children: [{name:"أحمد"}, {name:"محمد"}, {name:"حسن"}, {name:"سعاد"}, {name:"الحاجة"}, {name:"فاطمة"}, {name:"عائشة"}]
            },
            {
              name: "القاسم محمد إدريس",
              spouse: "زينب الطيب (الشريف بجبوج)",
              children: [{name:"مختار"}, {name:"علي"}, {name:"آمنة"}, {name:"عجبت"}, {name:"حرم"}, {name:"دار النعيم"}, {name:"سكينة"}, {name:"رقية"}, {name:"نفيسة"}]
            },
            {
              name: "مكية محمد إدريس",
              spouse: "الخليفة النور حمد",
              children: [{name:"الشريف"}, {name:"رقية"}, {name:"زينب (هاشمية)"}, {name:"فاطمة"}]
            },
            {
              name: "عائشة محمد إدريس",
              spouse: "الحاج يوسف الشيخ نصر",
              children: [{name:"إبراهيم"}, {name:"محمود"}, {name:"أحمد"}, {name:"الحاج"}, {name:"ستنا"}, {name:"آمنة"}, {name:"الحاجة"}]
            },
            {
              name: "هداية محمد إدريس",
              spouse: "إدريس فضول (سنجة)",
              children: [{name:"عوض الله"}, {name:"فضول"}, {name:"عائشة"}, {name:"ليلى"}]
            }
          ]
        }
      ]
    },
    { name: "علي فضول", children: [] },
    { name: "خليفة فضول", children: [] }
  ]
};

// --- Components ---

// 1. مكون الزوجة (Spouse Node)
const SpouseNode: React.FC<{ spouse: Spouse; isFirst: boolean; isLast: boolean; isSingle: boolean; level: number }> = ({ spouse, isFirst, isLast, isSingle, level }) => {
  const [isExpanded, setIsExpanded] = useState(false); // مغلق دائماً في البداية
  const hasChildren = spouse.children && spouse.children.length > 0;

  return (
    <div className="relative flex flex-col items-center px-1 md:px-3">
      {/* الخط الأفقي العلوي للزوجات المتعددات */}
      {!isSingle && (
        <div className={`absolute top-0 h-0.5 bg-amber-600/30
          ${isFirst ? 'right-1/2 left-0' : ''}
          ${isLast ? 'left-1/2 right-0' : ''}
          ${!isFirst && !isLast ? 'left-0 right-0' : ''}
        `} />
      )}

      {/* الخط العمودي النازل للزوجة */}
      <div className="w-0.5 h-6 bg-amber-600/30"></div>

      {/* بطاقة الزوجة */}
      <div 
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        className={`relative z-10 flex flex-col items-center p-3 rounded-xl border-2 shadow-sm transition-all duration-300 min-w-[140px] bg-rose-50 border-rose-200 text-rose-900 
          ${hasChildren ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-rose-300' : ''}`}
      >
        <Heart size={16} className="text-rose-500 fill-rose-100 mb-1" />
        <h3 className="font-bold text-sm text-center">{spouse.name}</h3>
        {hasChildren && (
          <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full mt-1 font-semibold">
            {spouse.children?.length} أبناء
          </span>
        )}

        {/* زر التوسيع */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white border border-rose-300 rounded-full p-0.5 text-rose-500 shadow-sm transition-transform">
            {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </div>
        )}
      </div>

      {/* أبناء الزوجة */}
      {isExpanded && hasChildren && spouse.children && (
        <>
          <div className="w-0.5 h-6 bg-amber-600/30"></div>
          <div className="flex flex-row justify-center relative">
            {spouse.children.map((child, idx) => (
              <FamilyNode 
                key={idx} 
                node={child} 
                level={level + 1}
                isFirst={idx === 0}
                isLast={idx === spouse.children!.length - 1}
                isSingle={spouse.children!.length === 1}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};


// 2. مكون الشخص الأساسي (Family Node)
const FamilyNode: React.FC<{ node: Person; isFirst?: boolean; isLast?: boolean; isSingle?: boolean; level?: number }> = ({ node, isFirst, isLast, isSingle, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false); // مغلق دائماً في البداية لجميع الفروع
  
  const hasChildren = node.children && node.children.length > 0;
  const hasSpouses = node.spouses && node.spouses.length > 0;
  const isExpandable = hasChildren || hasSpouses;

  // تصميم البطاقة بناءً على الجيل (الجذور خضراء غامقة، الأطراف بيضاء)
  const isRoot = level === 0;
  const isMainBranch = level === 1;

  return (
    <div className="relative flex flex-col items-center px-1 md:px-2">
      
      {/* الخط الأفقي العلوي (يربط الإخوة) */}
      {level > 0 && !isSingle && (
        <div className={`absolute top-0 h-0.5 bg-amber-600/30
          ${isFirst ? 'right-1/2 left-0' : ''}
          ${isLast ? 'left-1/2 right-0' : ''}
          ${!isFirst && !isLast ? 'left-0 right-0' : ''}
        `} />
      )}

      {/* الخط العمودي النازل (الفرع من الأب) */}
      {level > 0 && (
        <div className="w-0.5 h-6 md:h-8 bg-amber-600/30"></div>
      )}

      {/* بطاقة الشخص (ورقة الشجرة) */}
      <div 
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
        className={`relative z-10 flex flex-col items-center p-3 md:p-4 rounded-xl border-2 shadow-sm transition-all duration-300 min-w-[120px] md:min-w-[150px]
          ${isExpandable ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''}
          ${isRoot ? 'bg-emerald-800 border-emerald-900 text-white shadow-emerald-900/20' : ''}
          ${isMainBranch ? 'bg-emerald-600 border-emerald-700 text-white' : ''}
          ${!isRoot && !isMainBranch ? 'bg-white border-emerald-200 text-slate-800 hover:border-emerald-400' : ''}
          ${node.highlight ? 'ring-4 ring-amber-300 border-amber-500 bg-amber-50 text-amber-900' : ''}
        `}
      >
        {isRoot ? <Users size={24} className="mb-1 opacity-80" /> : <User size={18} className="mb-1 opacity-60" />}
        
        <h3 className={`font-bold text-center leading-tight ${isRoot ? 'text-lg' : 'text-sm md:text-base'}`}>
          {node.name}
        </h3>
        
        {node.title && <p className="text-[10px] md:text-xs opacity-80 mt-1">{node.title}</p>}
        
        {/* معلومات الزوجة إن كانت واحدة ومدمجة */}
        {node.spouse && (
           <p className={`text-[10px] mt-2 px-2 py-0.5 rounded font-medium flex items-center gap-1
             ${level < 2 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
             <Heart size={10} className={level < 2 ? 'text-rose-200' : 'text-rose-500'} />
             {node.spouse}
           </p>
        )}

        {/* أيقونة زر التوسيع في الأسفل */}
        {isExpandable && (
          <div className={`absolute -bottom-3.5 left-1/2 transform -translate-x-1/2 rounded-full p-1 border shadow-sm transition-transform
            ${isRoot || isMainBranch ? 'bg-emerald-900 border-emerald-700 text-white' : 'bg-white border-emerald-300 text-emerald-600'}
          `}>
            {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </div>
        )}
      </div>

      {/* التفرعات (الزوجات أو الأبناء) */}
      {isExpandable && isExpanded && (
        <>
          <div className="w-0.5 h-6 md:h-8 bg-amber-600/30"></div>
          
          {hasSpouses ? (
            /* قسم الزوجات المتعددات */
            <div className="flex flex-row justify-center relative">
              {node.spouses!.map((spouse, idx) => (
                <SpouseNode 
                  key={idx} 
                  spouse={spouse} 
                  level={level}
                  isFirst={idx === 0}
                  isLast={idx === node.spouses!.length - 1}
                  isSingle={node.spouses!.length === 1}
                />
              ))}
            </div>
          ) : (
            /* قسم الأبناء المباشرين */
            <div className="flex flex-row justify-center relative">
              {node.children!.map((child, idx) => (
                <FamilyNode 
                  key={idx} 
                  node={child} 
                  level={level + 1}
                  isFirst={idx === 0}
                  isLast={idx === node.children!.length - 1}
                  isSingle={node.children!.length === 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow-md shadow-emerald-200">
              <GitMerge className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">شجرة عائلة فضول إدريس</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">المنطقة الشمالية - توثيق الأجيال</p>
            </div>
          </div>
          <div className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            اضغط على البطاقات لتوسيع الفروع
          </div>
        </div>
      </header>

      {/* Main Content Area - Scrollable Container */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing w-full">
        {/* Tree Container - Min Width ensures it doesn't squish on mobile */}
        <div className="min-w-max inline-flex flex-col items-center justify-start p-8 md:p-12 w-full h-full min-h-[70vh]">
          <FamilyNode node={familyData} level={0} isSingle={true} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white text-slate-500 py-4 text-center text-xs border-t border-slate-200 shrink-0">
        <p className="font-medium">تم تصميم هذه الشجرة المعمارية لتسهيل حفظ وتصفح الأنساب (اسحب الشاشة يميناً ويساراً للتنقل).</p>
      </footer>
    </div>
  );
}