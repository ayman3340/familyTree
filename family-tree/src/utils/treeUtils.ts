import type { Person, Spouse, FamilyTree, FlatPerson } from '../types/family';

export const generateId = (): string => 
  Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

/**
 * Normalizes legacy data structures:
 * - Converts `spouse: string` into normalized `spouses: Spouse[]` with unique IDs
 * - Ensures all nodes and spouses have unique IDs
 * - Ensures links array is initialized
 */
export const normalizePerson = (raw: any): Person => {
  if (!raw) {
    return {
      id: generateId(),
      name: 'غير معروف',
      children: [],
      spouses: []
    };
  }

  const id = raw.id || generateId();
  const name = raw.name || 'بدون اسم';
  const spouses: Spouse[] = [];

  // 1. Process existing spouses array
  if (Array.isArray(raw.spouses)) {
    raw.spouses.forEach((s: any) => {
      if (!s) return;
      spouses.push({
        id: s.id || generateId(),
        name: s.name || '',
        title: s.title,
        links: Array.isArray(s.links) ? [...s.links] : [],
        children: Array.isArray(s.children) ? s.children.map(normalizePerson) : []
      });
    });
  }

  // 2. Normalize legacy single string spouse
  if (typeof raw.spouse === 'string' && raw.spouse.trim()) {
    const trimmedSpouse = raw.spouse.trim();
    const existing = spouses.find(s => s.name.trim() === trimmedSpouse);
    if (!existing) {
      spouses.push({
        id: generateId(),
        name: trimmedSpouse,
        children: []
      });
    }
  }

  // 3. Process direct children
  const children: Person[] = Array.isArray(raw.children)
    ? raw.children.map(normalizePerson)
    : [];

  return {
    id,
    name,
    title: raw.title,
    type: raw.type,
    highlight: raw.highlight,
    links: Array.isArray(raw.links) ? [...raw.links] : [],
    spouses,
    children
  };
};

export const normalizeTree = (tree: any): FamilyTree => {
  return {
    id: tree.id || `tree_${generateId()}`,
    name: tree.name || 'شجرة عائلة',
    description: tree.description,
    root: normalizePerson(tree.root)
  };
};

/**
 * Traverses a tree and extracts a flat list of all members (people and spouses)
 */
export const getFlatPeopleList = (node: Person, treeId: string, treeName: string, list: FlatPerson[] = [], parentName?: string): FlatPerson[] => {
  if (node.id && node.name) {
    list.push({
      id: node.id,
      name: node.name,
      title: node.title,
      treeId,
      treeName,
      isSpouse: false,
      parentName
    });
  }

  node.spouses?.forEach((s: Spouse) => {
    if (s.id && s.name) {
      list.push({
        id: s.id,
        name: s.name,
        title: s.title,
        treeId,
        treeName,
        isSpouse: true,
        parentName: node.name
      });
    }
    s.children?.forEach((c: Person) => getFlatPeopleList(c, treeId, treeName, list, s.name));
  });

  node.children?.forEach((c: Person) => getFlatPeopleList(c, treeId, treeName, list, node.name));
  return list;
};

/**
 * Returns a flat list of all persons across all trees
 */
export const getAllTreesFlatList = (trees: FamilyTree[]): FlatPerson[] => {
  const result: FlatPerson[] = [];
  trees.forEach(tree => {
    getFlatPeopleList(tree.root, tree.id, tree.name, result);
  });
  return result;
};

/**
 * Checks if a targetId is within the subtree of a person or spouse
 */
export const containsNode = (node: Person | Spouse | undefined, targetId: string): boolean => {
  if (!node) return false;
  if (node.id === targetId) return true;

  if ('spouses' in node && node.spouses) {
    for (const s of node.spouses) {
      if (containsNode(s, targetId)) return true;
    }
  }

  if (node.children) {
    for (const c of node.children) {
      if (containsNode(c, targetId)) return true;
    }
  }

  return false;
};

/**
 * Counts children and grandchildren of a person or spouse
 */
export const countDescendants = (node: Person | Spouse): number => {
  let count = 0;
  if ('spouses' in node && node.spouses) {
    node.spouses.forEach(s => {
      count += countDescendants(s);
    });
  }
  if (node.children) {
    count += node.children.length;
    node.children.forEach(c => {
      count += countDescendants(c);
    });
  }
  return count;
};

/**
 * Recursive find and mutate function
 */
export const findAndMutate = (
  node: Person,
  targetId: string,
  action: (target: any, type: 'person' | 'spouse', parentArr?: any[], parentNode?: any) => void,
  parentArr?: any[],
  parentNode?: any
): boolean => {
  if (node.id === targetId) {
    action(node, 'person', parentArr, parentNode);
    return true;
  }

  if (node.spouses) {
    for (let i = 0; i < node.spouses.length; i++) {
      const spouse = node.spouses[i];
      if (spouse.id === targetId) {
        action(spouse, 'spouse', node.spouses, node);
        return true;
      }
      if (spouse.children) {
        for (let j = 0; j < spouse.children.length; j++) {
          if (findAndMutate(spouse.children[j], targetId, action, spouse.children, spouse)) {
            return true;
          }
        }
      }
    }
  }

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      if (findAndMutate(node.children[i], targetId, action, node.children, node)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Safely delete a person or spouse by id
 */
export const deleteNode = (root: Person, targetId: string): boolean => {
  return findAndMutate(root, targetId, (_target, _type, parentArr) => {
    if (parentArr) {
      const idx = parentArr.findIndex((item: any) => item.id === targetId);
      if (idx > -1) {
        parentArr.splice(idx, 1);
      }
    }
  });
};

/**
 * Unlinks a connection between two nodes
 */
export const removeLink = (root: Person, sourceId: string, targetPersonId: string) => {
  findAndMutate(root, sourceId, (target) => {
    if (target.links) {
      target.links = target.links.filter((l: any) => l.targetPersonId !== targetPersonId);
    }
  });
};

/**
 * Merges nodes when importing/updating seed data
 */
export const mergeNodes = (target: Person, source: Person) => {
  if (!target.title && source.title) target.title = source.title;

  if (source.spouses && source.spouses.length > 0) {
    target.spouses = target.spouses || [];
    source.spouses.forEach(sourceSpouse => {
      const targetSpouse = target.spouses!.find(s => s.name.trim() === sourceSpouse.name.trim());
      if (!targetSpouse) {
        target.spouses!.push(normalizePerson(JSON.parse(JSON.stringify(sourceSpouse))) as unknown as Spouse);
      } else {
        if (!targetSpouse.title && sourceSpouse.title) targetSpouse.title = sourceSpouse.title;
        if (sourceSpouse.children && sourceSpouse.children.length > 0) {
          targetSpouse.children = targetSpouse.children || [];
          sourceSpouse.children.forEach(sourceChild => {
            const targetChild = targetSpouse.children!.find(c => c.name.trim() === sourceChild.name.trim());
            if (!targetChild) {
              targetSpouse.children!.push(normalizePerson(JSON.parse(JSON.stringify(sourceChild))));
            } else {
              mergeNodes(targetChild, sourceChild);
            }
          });
        }
      }
    });
  }

  if (source.children && source.children.length > 0) {
    target.children = target.children || [];
    source.children.forEach(sourceChild => {
      const targetChild = target.children!.find(c => c.name.trim() === sourceChild.name.trim());
      if (!targetChild) {
        target.children!.push(normalizePerson(JSON.parse(JSON.stringify(sourceChild))));
      } else {
        mergeNodes(targetChild, sourceChild);
      }
    });
  }
};
