import type { AppData } from '../types/family';
import { normalizeTree } from '../utils/treeUtils';

const LOCAL_STORAGE_KEY = 'family_tree_app_data_v4';

export const loadLocalData = (): AppData | null => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.trees)) {
      return {
        ...parsed,
        trees: parsed.trees.map(normalizeTree)
      };
    }
  } catch (err) {
    console.error('Failed to load local data:', err);
  }
  return null;
};

export const saveLocalData = (data: AppData) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      ...data,
      updatedAt: Date.now()
    }));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
};

export const exportTreesToJson = (data: AppData, fileName = 'family_tree_backup.json') => {
  try {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Export failed:', err);
    throw new Error('فشل تصدير البيانات كملف JSON');
  }
};

export const importTreesFromJson = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.trees)) {
          throw new Error('صيغة الملف غير صالحة. يجب أن يحتوي على مصفوفة trees.');
        }
        const validated: AppData = {
          trees: parsed.trees.map(normalizeTree),
          updatedAt: Date.now()
        };
        resolve(validated);
      } catch (err: any) {
        reject(new Error(err?.message || 'فشل قراءة الملف. تأكد من أنه ملف JSON صالح.'));
      }
    };
    reader.onerror = () => reject(new Error('خطأ أثناء قراءة الملف.'));
    reader.readAsText(file);
  });
};
