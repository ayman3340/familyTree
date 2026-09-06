export type LayoutMode = 'classic' | 'horizontal' | 'list' | 'nested' | '3d';
export type ThemeMode = 'light' | 'dark' | 'comfort';

export interface NodeLink {
  targetTreeId: string;
  targetPersonId: string;
  targetName: string;
  targetTreeName: string;
  relationship?: string;
}

export interface Spouse {
  id: string;
  name: string;
  title?: string;
  children?: Person[];
  links?: NodeLink[];
}

export interface Person {
  id: string;
  name: string;
  title?: string;
  type?: string;
  spouse?: string; // legacy support, normalized to spouses
  spouses?: Spouse[];
  children?: Person[];
  highlight?: boolean;
  links?: NodeLink[];
}

export interface FamilyTree {
  id: string;
  name: string;
  description?: string;
  root: Person;
}

export interface AppData {
  trees: FamilyTree[];
  updatedAt?: number;
}

export interface FlatPerson {
  id: string;
  name: string;
  title?: string;
  treeId: string;
  treeName: string;
  isSpouse?: boolean;
  parentName?: string;
}

export interface TreeActions {
  onEdit: (id: string, type: 'person' | 'spouse', currentName: string, currentTitle?: string) => void;
  onAddChild: (id: string) => void;
  onAddSpouse: (id: string) => void;
  onDelete: (id: string, name: string, type: 'person' | 'spouse') => void;
  onLink: (id: string, currentName: string) => void;
  onUnlink?: (sourceId: string, targetTreeId: string, targetPersonId: string) => void;
  onNavigateLink: (treeId: string, personId: string) => void;
  isEditMode: boolean;
  highlightedNodeId: string | null;
  layout: LayoutMode;
  themeMode: ThemeMode;
}

export interface ModalConfig {
  isOpen: boolean;
  mode: 'ADD_CHILD' | 'ADD_SPOUSE' | 'EDIT' | 'CREATE_TREE' | 'EDIT_TREE' | 'LINK_NODE' | 'MERGE_CONFIRM' | 'EXPORT_IMPORT';
  targetId: string;
  targetType?: 'person' | 'spouse';
  name: string;
  title: string;
  selectedTargetTreeId?: string;
  selectedTargetPersonId?: string;
}

export interface ConfirmDeleteConfig {
  isOpen: boolean;
  id: string;
  name: string;
  type: 'person' | 'spouse' | 'tree';
  childCount?: number;
  description?: string;
}
