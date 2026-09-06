import type { Person, AppData } from '../types/family';
import { normalizePerson } from '../utils/treeUtils';

const rawDefaultTreeRoot: any = {
  name: "إدريس فضول",
  title: "رأس العائلة",
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
                    { 
                      name: "يعقوب الصاوي", 
                      spouses: [{ name: "فاطمة بشير محمد إدريس" }],
                      children: [{name:"عبد القادر"}, {name:"يوسف"}, {name:"صلاح"}, {name:"عثمان"}, {name:"عبد العظيم"}, {name:"شادية"}, {name:"هادية"}, {name:"منى"}, {name:"التوأم صفاء ومروة"}] 
                    },
                    { 
                      name: "صالح الصاوي", 
                      spouses: [{ name: "شامة علي منوفلا" }],
                      children: [{name:"عادل"}, {name:"علي"}, {name:"عايدة"}] 
                    },
                    { 
                      name: "عبد الكريم الصاوي", 
                      spouses: [{ name: "دار النعيم القاسم" }],
                      children: [{name:"محمد"}, {name:"إبراهيم"}, {name:"الصاوي"}, {name:"رابعة"}, {name:"هدى"}] 
                    },
                    { 
                      name: "موسى الصاوي", 
                      spouses: [
                        { name: "خديجة عثمان علي", children: [{name:"عوض الله"}, {name:"الطيب"}, {name:"رضوان"}, {name:"نجوى"}, {name:"آمنة"}] },
                        { name: "إبنة إبراهيم الحاج يوسف", children: [{name:"بثينة"}, {name:"سهام"}] }
                      ] 
                    },
                    { 
                      name: "الحاجة الصاوي", 
                      spouses: [{ name: "محمد الحسن يونس" }],
                      children: [{name:"يونس"}, {name:"عبد الله"}, {name:"زينب"}, {name:"بتول"}, {name:"كوثر"}, {name:"خديجة"}] 
                    },
                    { 
                      name: "غناوة الصاوي", 
                      spouses: [{ name: "علي القاسم" }],
                      children: [{name:"معاوية"}] 
                    },
                    { 
                      name: "التومة الصاوي", 
                      spouses: [{ name: "إبراهيم الأمين" }],
                      children: [{name:"أحمد"}, {name:"عمر"}, {name:"منير"}, {name:"هداية"}, {name:"أميرة"}, {name:"منيرة"}, {name:"مروة"}, {name:"نهى"}] 
                    },
                    { 
                      name: "فاطمة الصاوي", 
                      spouses: [{ name: "الخاتم الباقر عثمان" }],
                      children: [{name:"الباقر"}, {name:"ناصر"}, {name:"انتصار"}, {name:"هاجر"}, {name:"اعتماد"}, {name:"فايقة"}] 
                    }
                  ]
                },
                {
                  name: "زينب الخليفة حسين (فارس)",
                  children: [
                    { name: "هجو الصاوي", spouses: [{ name: "نادية الأمين" }], children: [{name:"فاطمة"}, {name:"حسام الدين"}, {name:"علاء الدين"}] },
                    { name: "عائشة الصاوي", spouses: [{ name: "محمد هجو محمد إدريس" }], title: "(لم تنجب)" },
                    { name: "زروق الصاوي", spouses: [{ name: "ثريا محمد أحمد أبو" }], children: [{name:"رانيا"}, {name:"رامي"}, {name:"وتوأمان محمد ومؤتمن"}] },
                    { name: "تاج الدين الصاوي", spouses: [{ name: "فاطمة هجو محمد إدريس" }], children: [{name:"زينب"}, {name:"آمنة"}, {name:"هبة"}, {name:"يسري"}, {name:"الصاوي"}, {name:"مرام"}] },
                    { name: "بدر الدين الصاوي", spouses: [{ name: "نسيبه حسن بشير" }], children: [{name:"أحمد"}, {name:"زينب"}, {name:"محمد"}, {name:"بلسم"}, {name:"ريم"}] },
                    { name: "رشيدة الصاوي", spouses: [{ name: "كمال محمود مصطفى" }], children: [{name:"حذيفة"}, {name:"ايمن"}, {name:"خباب"}, {name:"محمد"}, {name:"مروان"}] }
                  ]
                },
                {
                  name: "فاطمة مساعد علي (ديم المشايخة)",
                  children: [
                    { name: "محمد توم الصاوي", spouses: [{ name: "نادية الطيب أحمد الطيب" }], children: [{name:"نزار"}, {name:"عمار"}, {name:"نور"}, {name:"علاء"}] },
                    { name: "شرف الدين الصاوي", spouses: [{ name: "هالة هجو محمد إدريس" }], children: [{name:"معتز"}, {name:"محمد"}, {name:"مازن"}, {name:"إسراء"}, {name:"فاطمة"}] },
                    { name: "محمد الحسن الصاوي", spouses: [{ name: "أمل حسن محمد إدريس" }], children: [{name:"أبوبكر"}, {name:"أواب"}, {name:"آلاء"}] },
                    { name: "عفاف الصاوي", spouses: [{ name: "عادل عمر محمد إبراهيم" }], children: [{name:"كمال"}, {name:"أحمد"}, {name:"مآب"}, {name:"وئام"}] },
                    { name: "مريم الصاوي", spouses: [{ name: "حسن بشير محمد إدريس" }], children: [{name:"عمرو"}] },
                    { name: "رقية الصاوي", spouses: [{ name: "صديق المهدي علي" }], children: [{name:"إبراهيم"}, {name:"محمد"}, {name:"ملاذ"}] }
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
                     { name: "(لم تنجب)", title: "لم تنجب" }
                  ]
                }
              ]
            },
            {
              name: "بشير محمد إدريس",
              spouses: [{ name: "نسمة الأمين" }],
              children: [{name:"أحمد"}, {name:"محمد"}, {name:"حسن"}, {name:"سعاد"}, {name:"الحاجة"}, {name:"فاطمة"}, {name:"عائشة"}]
            },
            {
              name: "القاسم محمد إدريس",
              spouses: [{ name: "زينب الطيب (الشريف بجبوج)" }],
              children: [{name:"مختار"}, {name:"علي"}, {name:"آمنة"}, {name:"عجبت"}, {name:"حرم"}, {name:"دار النعيم"}, {name:"سكينة"}, {name:"رقية"}, {name:"نفيسة"}]
            },
            {
              name: "مكية محمد إدريس",
              spouses: [{ name: "الخليفة النور حمد" }],
              children: [{name:"الشريف"}, {name:"رقية"}, {name:"زينب (هاشمية)"}, {name:"فاطمة"}]
            },
            {
              name: "عائشة محمد إدريس",
              spouses: [{ name: "الحاج يوسف الشيخ نصر" }],
              children: [{name:"إبراهيم"}, {name:"محمود"}, {name:"أحمد"}, {name:"الحاج"}, {name:"ستنا"}, {name:"آمنة"}, {name:"الحاجة"}]
            },
            {
              name: "هداية محمد إدريس",
              spouses: [{ name: "إدريس فضول (سنجة)" }],
              children: [{name:"عوض الله"}, {name:"فضول"}, {name:"عائشة"}, {name:"ليلى"}]
            }
          ]
        },
        {
          name: "زينب بت عثمان",
          children: [
            { 
              name: "هجو محمد إدريس", 
              spouses: [{ name: "آمنة عبد العزيز عبد الكريم (رفاعة)" }], 
              children: [{name:"محمد"}, {name:"إسماعيل"}, {name:"عبد الله"}, {name:"عبد الكريم"}, {name:"خالد"}, {name:"مجاهد"}, {name:"فاطمة"}, {name:"هالة"}, {name:"إخلاص"}, {name:"هاجر"}, {name:"هويدا"}] 
            },
            { name: "عبد الله محمد إدريس", spouses: [{ name: "مستورة بريمة الأبيض" }] },
            { name: "علي محمد إدريس", spouses: [{ name: "الحاجة حسن علي فصول حلة الشريف" }] },
            { name: "حسن محمد إدريس", spouses: [{ name: "التومة أحمد يوسف" }] },
            { name: "إبراهيم محمد إدريس", title: "(لم يتزوج)" },
            { name: "ست أبوها محمد إدريس", spouses: [{ name: "مضوي الشيخ" }] },
            { name: "فاطمة محمد إدريس", spouses: [{ name: "مصطفى محمد فرحات" }] },
            { name: "فزارية محمد إدريس", spouses: [{ name: "مضوي يوسف حمد" }] },
            { name: "رابحة محمد إدريس", spouses: [{ name: "الأمين يوسف حمد" }] }
          ]
        },
        {
          name: "عيشة",
          title: "ناس كركوج",
          children: [
            { 
              name: "بانقا", 
              spouses: [
                { name: "وداد السودانية", children: [{name:"محمد سعيد"}, {name:"دلال"}] },
                { name: "ألمانية (اسمها جزلي)", children: [{name:"سميرة"}, {name:"الأمين"}, {name:"كريم"}] }
              ] 
            },
            { 
              name: "مامون", 
              spouses: [{ name: "رقية" }],
              children: [{name:"جميلة"}]
            }
          ]
        }
      ]
    },
    { 
      name: "آمنة إدريس فضول", 
      title: "شقيقة محمد إدريس",
      spouses: [{ name: "يوسف حمد مضوي عوض الكريم" }], 
      children: [
        { name: "الأمين يوسف حمد", spouses: [{ name: "رابحة محمد إدريس" }] },
        { name: "مضوي يوسف حمد", spouses: [{ name: "فزارية محمد إدريس" }] }
      ] 
    },
    { 
      name: "علي فضول", 
      children: [
        { name: "حسن" }
      ] 
    },
    { 
      name: "خليفة فضول", 
      children: [] 
    },
    {
      name: "خديجة فضول",
      spouses: [{ name: "الشريف محمد عبد الحي" }],
      children: [
        { name: "زينب", spouses: [{ name: "الشريف الجيلاني الدسيس" }] },
        { name: "صفية", title: "لم تخلف" },
        { name: "حليمة", title: "لم تخلف" }
      ]
    }
  ]
};

export const defaultTreeRoot: Person = normalizePerson(rawDefaultTreeRoot);

export const initialAppData: AppData = {
  trees: [
    {
      id: 'tree_1',
      name: 'شجرة عائلة فضول إدريس',
      description: 'الشجرة الأساسية الموثقة لنسل فضول إدريس وأسرته الكريمة',
      root: defaultTreeRoot
    }
  ],
  updatedAt: Date.now()
};
