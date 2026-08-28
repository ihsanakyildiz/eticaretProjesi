export type CategoryNodeBase = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

export type CategoryTreeNode<T extends CategoryNodeBase> = T & {
  depth: number;
  children: CategoryTreeNode<T>[];
};

export function buildCategoryTree<T extends CategoryNodeBase>(
  items: T[],
): CategoryTreeNode<T>[] {
  const map = new Map<string, CategoryTreeNode<T>>();
  const roots: CategoryTreeNode<T>[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, depth: 0, children: [] });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      const parent = map.get(item.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: CategoryTreeNode<T>[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"));
    for (const node of nodes) {
      // depth düzeltmesi (parent zinciri doğru olsun)
      for (const child of node.children) {
        child.depth = node.depth + 1;
      }
      sortRecursive(node.children);
    }
  };

  sortRecursive(roots);
  return roots;
}

export function flattenCategoryTree<T extends CategoryNodeBase>(
  nodes: CategoryTreeNode<T>[],
): CategoryTreeNode<T>[] {
  const result: CategoryTreeNode<T>[] = [];

  const walk = (list: CategoryTreeNode<T>[]) => {
    for (const node of list) {
      result.push(node);
      if (node.children.length) walk(node.children);
    }
  };

  walk(nodes);
  return result;
}

/** Bir kategorinin kendisi + tüm alt kategorilerinin id seti (döngü engeli için) */
export function collectDescendantIds<T extends CategoryNodeBase>(
  items: T[],
  rootId: string,
): Set<string> {
  const childrenMap = new Map<string, string[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const list = childrenMap.get(item.parentId) ?? [];
    list.push(item.id);
    childrenMap.set(item.parentId, list);
  }

  const result = new Set<string>([rootId]);
  const stack = [rootId];

  while (stack.length) {
    const current = stack.pop()!;
    for (const childId of childrenMap.get(current) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    }
  }

  return result;
}

export function getCategoryBreadcrumb<T extends CategoryNodeBase>(
  items: T[],
  id: string,
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const trail: T[] = [];
  let current = byId.get(id);

  while (current) {
    trail.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return trail;
}
