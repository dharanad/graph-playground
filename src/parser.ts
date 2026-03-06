import { Position, MarkerType, type Node, type Edge } from '@xyflow/react';
import type { Vertex, TreeNode as TreeNodeClass, ListNode } from './dsClasses';

type DSType = 'graph' | 'tree' | 'linkedList';

interface GraphInput {
  nodes: { id: string; label?: string }[];
  edges: { from: string; to: string; label?: string }[];
}

interface TreeNode {
  id: string;
  label?: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
  children?: TreeNode[];
}

interface LinkedListNode {
  value: unknown;
  next?: LinkedListNode | null;
}

export interface ParseResult {
  nodes: Node[];
  edges: Edge[];
}

// ---------- Graph ----------

function parseGraph(data: GraphInput): ParseResult {
  const nodeCount = data.nodes.length;
  const cols = Math.ceil(Math.sqrt(nodeCount));
  const spacing = 130;

  const nodes: Node[] = data.nodes.map((n, i) => ({
    id: String(n.id),
    data: { label: n.label ?? String(n.id) },
    position: {
      x: (i % cols) * spacing + 50,
      y: Math.floor(i / cols) * spacing + 50,
    },
    style: nodeStyle(),
  }));

  const edges: Edge[] = data.edges.map((e, i) => ({
    id: `e${i}`,
    source: String(e.from),
    target: String(e.to),
    label: e.label,
    style: edgeStyle(),
    animated: false,
  }));

  return { nodes, edges };
}

// ---------- Tree (BFS layout) ----------

function parseTree(root: TreeNode): ParseResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const xSpacingBase = 160;
  const ySpacing = 100;

  let edgeIdx = 0;

  function visit(node: TreeNode | null | undefined, depth: number, pos: number, spread: number) {
    if (!node) return;
    const x = pos;
    const y = depth * ySpacing + 50;
    const id = String(node.id);

    nodes.push({
      id,
      data: { label: node.label ?? id },
      position: { x, y },
      style: nodeStyle(),
    });

    const half = spread / 2;

    const children: { child: TreeNode; offset: number }[] = [];
    if (node.left) children.push({ child: node.left, offset: -half });
    if (node.right) children.push({ child: node.right, offset: half });
    if (node.children) {
      const step = spread / (node.children.length + 1);
      node.children.forEach((c, i) => children.push({ child: c, offset: -half + step * (i + 1) }));
    }

    for (const { child, offset } of children) {
      const childId = String(child.id);
      edges.push({
        id: `e${edgeIdx++}`,
        source: id,
        target: childId,
        style: edgeStyle(),
      });
      visit(child, depth + 1, pos + offset, spread / 2);
    }
  }

  const initialSpread = Math.max(xSpacingBase * Math.pow(2, treeDepth(root) - 1), xSpacingBase);
  visit(root, 0, initialSpread, initialSpread);

  return { nodes, edges };
}

function treeDepth(node: TreeNode | null | undefined): number {
  if (!node) return 0;
  const leftD = node.left ? treeDepth(node.left) : 0;
  const rightD = node.right ? treeDepth(node.right) : 0;
  const childD = node.children ? Math.max(...node.children.map(treeDepth)) : 0;
  return 1 + Math.max(leftD, rightD, childD);
}

// ---------- Linked List (horizontal) ----------

function parseLinkedList(head: LinkedListNode): ParseResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const spacing = 150;

  let current: LinkedListNode | null | undefined = head;
  let i = 0;
  const visited = new Set<unknown>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const id = `node${i}`;
    nodes.push({
      id,
      data: { label: String(current.value) },
      position: { x: i * spacing + 50, y: 200 },
      style: nodeStyle(),
    });

    if (i > 0) {
      edges.push({
        id: `e${i - 1}`,
        source: `node${i - 1}`,
        target: id,
        style: edgeStyle(),
        animated: true,
      });
    }

    current = current.next;
    i++;
  }

  return { nodes, edges };
}

// ---------- Styles ----------

function nodeStyle() {
  return {
    background: '#313244',
    color: '#cdd6f4',
    border: '1.5px solid #cba6f7',
    borderRadius: '50%',
    width: 54,
    height: 54,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    fontSize: '13px',
    fontWeight: 600,
  };
}

function edgeStyle() {
  return { stroke: '#89b4fa', strokeWidth: 2 };
}

// ---------- Entry point ----------

export function parseOutput(type: DSType, output: unknown): ParseResult {
  if (type === 'graph') {
    const data = output as GraphInput;
    if (!Array.isArray(data?.nodes) || !Array.isArray(data?.edges)) {
      throw new Error('Graph must return { nodes: [...], edges: [...] }');
    }
    return parseGraph(data);
  }

  if (type === 'tree') {
    const root = output as TreeNode;
    if (!root?.id) throw new Error('Tree root must have an "id" field');
    return parseTree(root);
  }

  if (type === 'linkedList') {
    const head = output as LinkedListNode;
    if (!head || !('value' in head)) throw new Error('Linked list head must have a "value" field');
    return parseLinkedList(head);
  }

  throw new Error('Unknown type');
}

// ---------- Registry-based entry point ----------

interface DSClasses {
  Vertex: typeof Vertex;
  TreeNode: typeof TreeNodeClass;
  ListNode: typeof ListNode;
}

export function parseFromRegistry(type: DSType, classes: DSClasses): ParseResult {
  if (type === 'graph') {
    return layoutGraph(classes.Vertex._registry, classes.Vertex._edges, classes.Vertex._sources);
  }
  if (type === 'tree') {
    return layoutTree(classes.TreeNode._registry, classes.TreeNode._edges);
  }
  if (type === 'linkedList') {
    return layoutLinkedList(classes.ListNode._registry, classes.ListNode._edges);
  }
  throw new Error('Unknown type');
}

// ---------- layoutGraph ----------

function layoutGraph(
  registry: Vertex[],
  edges: { fromId: string; toId: string; weight?: number }[],
  sources: Set<string>,
): ParseResult {
  const n = registry.length;
  if (n === 0) return { nodes: [], edges: [] };

  // ── Hierarchical layered layout ──────────────────────────────────────────
  // 1. Assign each node a layer = longest path from any root.
  //    This ensures every edge points strictly downward (no upward crossings).
  // 2. Within each layer, order nodes by the average x-position of their
  //    parents (barycenter heuristic) to minimise edge crossings.
  // 3. Space layers vertically, nodes within a layer horizontally.

  const inDeg  = new Map<string, number>(registry.map(v => [v._id, 0]));
  const outMap = new Map<string, string[]>(registry.map(v => [v._id, []]));
  const inMap  = new Map<string, string[]>(registry.map(v => [v._id, []]));

  for (const e of edges) {
    outMap.get(e.fromId)?.push(e.toId);
    inMap.get(e.toId)?.push(e.fromId);
    inDeg.set(e.toId, (inDeg.get(e.toId) ?? 0) + 1);
  }

  // Longest-path layering via Kahn's topological sort
  const layer = new Map<string, number>(registry.map(v => [v._id, 0]));
  const queue: string[] = [];
  const deg   = new Map(inDeg);

  for (const v of registry) {
    if ((deg.get(v._id) ?? 0) === 0) queue.push(v._id);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const next of (outMap.get(curr) ?? [])) {
      const proposed = (layer.get(curr) ?? 0) + 1;
      if (proposed > (layer.get(next) ?? 0)) layer.set(next, proposed);
      const d = (deg.get(next) ?? 1) - 1;
      deg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  // Nodes still in queue (cycles) — place one layer below their predecessors
  for (const v of registry) {
    if ((deg.get(v._id) ?? 0) > 0) {
      const maxParentLv = Math.max(
        0,
        ...(inMap.get(v._id) ?? []).map(p => (layer.get(p) ?? 0) + 1),
      );
      layer.set(v._id, maxParentLv);
    }
  }

  // Group by layer
  const groups = new Map<number, string[]>();
  for (const v of registry) {
    const lv = layer.get(v._id)!;
    if (!groups.has(lv)) groups.set(lv, []);
    groups.get(lv)!.push(v._id);
  }

  // Barycenter ordering within each layer (one pass, top-down)
  const tempX = new Map<string, number>();
  const sortedLayers = [...groups.keys()].sort((a, b) => a - b);
  for (const lv of sortedLayers) {
    const ids = groups.get(lv)!;
    if (lv === 0) {
      ids.forEach((id, i) => tempX.set(id, i));
    } else {
      ids.sort((a, b) => {
        const avgX = (id: string) => {
          const parents = inMap.get(id) ?? [];
          if (parents.length === 0) return 0;
          return parents.reduce((s, p) => s + (tempX.get(p) ?? 0), 0) / parents.length;
        };
        return avgX(a) - avgX(b);
      });
      ids.forEach((id, i) => tempX.set(id, i));
    }
  }

  // Final positions — centre each layer horizontally
  const X_GAP = 160;
  const Y_GAP = 140;
  const pos   = new Map<string, { x: number; y: number }>();

  for (const [lv, ids] of groups) {
    const totalW = (ids.length - 1) * X_GAP;
    ids.forEach((id, i) => {
      pos.set(id, { x: i * X_GAP - totalW / 2, y: lv * Y_GAP });
    });
  }

  const nodes: Node[] = registry.map(v => ({
    id: v._id,
    data: { label: v._label },
    position: pos.get(v._id)!,
    style: sources.has(v._id)
      ? { ...nodeStyle(), border: '2px solid #a6e3a1', boxShadow: '0 0 8px #a6e3a1' }
      : nodeStyle(),
  }));

  const edgesList: Edge[] = edges.map((e, i) => ({
    id: `e${i}`,
    source: e.fromId,
    target: e.toId,
    label: e.weight !== undefined ? String(e.weight) : undefined,
    style: edgeStyle(),
    animated: false,
  }));

  return { nodes, edges: edgesList };
}

// ---------- layoutTree ----------

function layoutTree(
  registry: InstanceType<typeof TreeNodeClass>[],
  edges: { fromId: string; toId: string; type: 'left' | 'right' }[],
): ParseResult {
  if (registry.length === 0) return { nodes: [], edges: [] };

  // Find root: node with no incoming edges
  const hasIncoming = new Set(edges.map((e) => e.toId));
  const roots = registry.filter((n) => !hasIncoming.has(n._id));
  const root = roots[0] ?? registry[0];

  // Build children map (left before right via type order)
  const childrenMap = new Map<string, { id: string; type: 'left' | 'right' }[]>();
  for (const e of edges) {
    if (!childrenMap.has(e.fromId)) childrenMap.set(e.fromId, []);
    childrenMap.get(e.fromId)!.push({ id: e.toId, type: e.type });
  }
  // Sort so left < right
  for (const arr of childrenMap.values()) {
    arr.sort((a, b) => (a.type === 'left' ? -1 : 1) - (b.type === 'left' ? -1 : 1));
  }

  const nodeById = new Map(registry.map((n) => [n._id, n]));
  const placed = new Set<string>();
  const resultNodes: Node[] = [];
  const resultEdges: Edge[] = [];
  let edgeIdx = 0;

  const xSpacingBase = 160;
  const ySpacing = 100;

  function visitTree(id: string, depth: number, pos: number, spread: number) {
    if (placed.has(id)) return;
    placed.add(id);
    const n = nodeById.get(id)!;
    resultNodes.push({
      id,
      data: { label: String(n._value) },
      position: { x: pos, y: depth * ySpacing + 50 },
      style: nodeStyle(),
    });

    const children = childrenMap.get(id) ?? [];
    const half = spread / 2;
    const offsets = children.length === 1 ? [0] : [-half, half];

    children.forEach((child, i) => {
      resultEdges.push({
        id: `e${edgeIdx++}`,
        source: id,
        target: child.id,
        style: edgeStyle(),
        markerEnd: { type: MarkerType.ArrowClosed, color: '#89b4fa', width: 18, height: 18 },
      });
      visitTree(child.id, depth + 1, pos + offsets[i], spread / 2);
    });
  }

  // Compute depth for initial spread
  function subtreeDepth(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map((c) => subtreeDepth(c.id, visited)));
  }

  const depth = subtreeDepth(root._id);
  const initialSpread = Math.max(xSpacingBase * Math.pow(2, depth - 1), xSpacingBase);
  visitTree(root._id, 0, initialSpread, initialSpread);

  // Orphan nodes (disconnected) placed in a grid below
  const orphans = registry.filter((n) => !placed.has(n._id));
  const cols = Math.ceil(Math.sqrt(orphans.length));
  const yBase = (depth + 1) * ySpacing + 100;
  orphans.forEach((n, i) => {
    resultNodes.push({
      id: n._id,
      data: { label: String(n._value) },
      position: { x: (i % cols) * 130 + 50, y: yBase + Math.floor(i / cols) * 100 },
      style: nodeStyle(),
    });
  });

  return { nodes: resultNodes, edges: resultEdges };
}

// ---------- layoutLinkedList ----------

function layoutLinkedList(
  registry: InstanceType<typeof ListNode>[],
  edges: { fromId: string; toId: string }[],
): ParseResult {
  if (registry.length === 0) return { nodes: [], edges: [] };

  const hasIncoming = new Set(edges.map((e) => e.toId));
  const heads = registry.filter((n) => !hasIncoming.has(n._id));
  const head = heads[0] ?? registry[0];

  const nextMap = new Map(edges.map((e) => [e.fromId, e.toId]));
  const nodeById = new Map(registry.map((n) => [n._id, n]));

  const chain: string[] = [];
  const visited = new Set<string>();
  let cur: string | undefined = head._id;
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    chain.push(cur);
    cur = nextMap.get(cur);
  }

  const resultNodes: Node[] = [];
  const resultEdges: Edge[] = [];

  chain.forEach((id, i) => {
    const n = nodeById.get(id)!;
    resultNodes.push({
      id,
      data: { label: String(n._value) },
      position: { x: i * 150 + 50, y: 200 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: nodeStyle(),
    });
    if (i > 0) {
      resultEdges.push({
        id: `e${i - 1}`,
        source: chain[i - 1],
        target: id,
        type: 'straight',
        style: edgeStyle(),
        markerEnd: { type: MarkerType.ArrowClosed, color: '#89b4fa', width: 18, height: 18 },
        animated: false,
      });
    }
  });

  // Orphans in a second row
  const orphans = registry.filter((n) => !visited.has(n._id));
  orphans.forEach((n, i) => {
    resultNodes.push({
      id: n._id,
      data: { label: String(n._value) },
      position: { x: i * 150 + 50, y: 400 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: nodeStyle(),
    });
  });

  return { nodes: resultNodes, edges: resultEdges };
}
