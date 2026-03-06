import { Vertex, TreeNode } from './dsClasses';

// ── Public types ──────────────────────────────────────────────────────────────

/** Visual state a node can be in during a traversal step. */
export type NodeHighlight = 'current' | 'visited' | 'frontier' | 'highlight';

/** Visual state an edge can be in during a traversal step. */
export type EdgeHighlight = 'active' | 'traversed';

/** A single animation frame: a snapshot of what every node/edge looks like. */
export interface TraversalStep {
  nodeStates: Map<string, NodeHighlight>;   // nodeId → highlight
  edgeStates: Map<string, EdgeHighlight>;   // "fromId__toId" → highlight
  description: string;
}

type HasId = { _id: string };

// ── TraversalRecorder ─────────────────────────────────────────────────────────
//
// A mutable "canvas" that accumulates markings, then snapshots them into steps.
// BFS / DFS are just implementations built on top of it.
// Users can also call the same methods directly from their own algorithms.

export class TraversalRecorder {
  steps: TraversalStep[] = [];
  private nodeStates = new Map<string, NodeHighlight>();
  private edgeStates = new Map<string, EdgeHighlight>();

  /**
   * Mark a node with a visual state.
   *   'current'  → yellow  (the node being processed right now)
   *   'frontier' → cyan    (in the queue / stack)
   *   'visited'  → green   (already fully processed)
   *   'highlight'→ purple  (user-defined: e.g. shortest-path, special node)
   */
  mark = (node: HasId, state: NodeHighlight): void => {
    this.nodeStates.set(node._id, state);
  };

  /** Remove any marking from a node (it will appear dimmed). */
  unmark = (node: HasId): void => {
    this.nodeStates.delete(node._id);
  };

  /**
   * Mark an edge with a visual state.
   *   'active'   → yellow  (the edge currently being explored)
   *   'traversed'→ green   (already used / part of the spanning tree)
   */
  markEdge = (from: HasId, to: HasId, state: EdgeHighlight): void => {
    this.edgeStates.set(`${from._id}__${to._id}`, state);
  };

  /** Remove any marking from an edge. */
  unmarkEdge = (from: HasId, to: HasId): void => {
    this.edgeStates.delete(`${from._id}__${to._id}`);
  };

  /**
   * Snapshot the current markings as one animation frame.
   * Call this after every meaningful state change.
   */
  step = (description: string): void => {
    this.steps.push({
      nodeStates: new Map(this.nodeStates),
      edgeStates: new Map(this.edgeStates),
      description,
    });
  };

  reset(): void {
    this.steps = [];
    this.nodeStates.clear();
    this.edgeStates.clear();
  }
}

// ── Built-in BFS (graph + tree) ───────────────────────────────────────────────

export function createBFS(rec: TraversalRecorder) {
  return function BFS(start: Vertex | TreeNode): void {
    if (start instanceof Vertex) _bfsGraph(start, rec);
    else if (start instanceof TreeNode) _bfsTree(start, rec);
  };
}

// ── Built-in DFS (graph + tree) ───────────────────────────────────────────────

export function createDFS(rec: TraversalRecorder) {
  return function DFS(start: Vertex | TreeNode): void {
    if (start instanceof Vertex) _dfsGraph(start, rec);
    else if (start instanceof TreeNode) _dfsTree(start, rec);
  };
}

// ── Graph BFS implementation ──────────────────────────────────────────────────

function _bfsGraph(start: Vertex, rec: TraversalRecorder) {
  const outMap = _outMap(Vertex._edges);
  const lbl = (id: string) => Vertex._registry.find(v => v._id === id)?._label ?? id;

  const visited = new Set<string>();
  const inQueue = new Set<string>([start._id]);
  const queue: string[] = [start._id];

  rec.mark(start, 'frontier');
  rec.step(`BFS — enqueue "${lbl(start._id)}"`);

  while (queue.length > 0) {
    const currId = queue.shift()!;
    if (visited.has(currId)) continue;
    visited.add(currId);
    inQueue.delete(currId);

    rec.mark({ _id: currId }, 'current');

    const neighbors = outMap.get(currId) ?? [];
    const newOnes: string[] = [];

    for (const nbId of neighbors) {
      rec.markEdge({ _id: currId }, { _id: nbId }, 'active');
      if (!visited.has(nbId) && !inQueue.has(nbId)) {
        inQueue.add(nbId);
        queue.push(nbId);
        rec.mark({ _id: nbId }, 'frontier');
        newOnes.push(nbId);
      }
    }

    const desc = newOnes.length
      ? `Visit "${lbl(currId)}" → enqueue ${newOnes.map(id => `"${lbl(id)}"`).join(', ')}`
      : `Visit "${lbl(currId)}"`;
    rec.step(desc);

    rec.mark({ _id: currId }, 'visited');
    for (const nbId of neighbors) rec.markEdge({ _id: currId }, { _id: nbId }, 'traversed');
  }
  rec.step('BFS complete ✓');
}

// ── Graph DFS implementation ──────────────────────────────────────────────────

function _dfsGraph(start: Vertex, rec: TraversalRecorder) {
  const outMap = _outMap(Vertex._edges);
  const lbl = (id: string) => Vertex._registry.find(v => v._id === id)?._label ?? id;

  const visited = new Set<string>();
  const onStack = new Set<string>([start._id]);
  const stack: string[] = [start._id];

  rec.mark(start, 'frontier');
  rec.step(`DFS — push "${lbl(start._id)}"`);

  while (stack.length > 0) {
    const currId = stack.pop()!;
    if (visited.has(currId)) continue;
    visited.add(currId);
    onStack.delete(currId);

    rec.mark({ _id: currId }, 'current');

    const neighbors = (outMap.get(currId) ?? []).slice().reverse();
    const newOnes: string[] = [];

    for (const nbId of neighbors) {
      rec.markEdge({ _id: currId }, { _id: nbId }, 'active');
      if (!visited.has(nbId)) {
        onStack.add(nbId);
        stack.push(nbId);
        rec.mark({ _id: nbId }, 'frontier');
        newOnes.push(nbId);
      }
    }

    const desc = newOnes.length
      ? `Visit "${lbl(currId)}" → push ${[...newOnes].reverse().map(id => `"${lbl(id)}"`).join(', ')}`
      : `Visit "${lbl(currId)}"`;
    rec.step(desc);

    rec.mark({ _id: currId }, 'visited');
    for (const nbId of (outMap.get(currId) ?? [])) rec.markEdge({ _id: currId }, { _id: nbId }, 'traversed');
  }
  rec.step('DFS complete ✓');
}

// ── Tree BFS implementation ───────────────────────────────────────────────────

function _bfsTree(root: TreeNode, rec: TraversalRecorder) {
  const childMap = _outMap(TreeNode._edges);
  const lbl = (id: string) => String(TreeNode._registry.find(n => n._id === id)?._value ?? id);

  const visited = new Set<string>();
  const queue: string[] = [root._id];

  rec.mark(root, 'frontier');
  rec.step(`BFS — enqueue "${lbl(root._id)}"`);

  while (queue.length > 0) {
    const currId = queue.shift()!;
    visited.add(currId);

    rec.mark({ _id: currId }, 'current');

    const children = childMap.get(currId) ?? [];
    for (const childId of children) {
      rec.markEdge({ _id: currId }, { _id: childId }, 'active');
      rec.mark({ _id: childId }, 'frontier');
      queue.push(childId);
    }

    const desc = children.length
      ? `Visit "${lbl(currId)}" → enqueue ${children.map(id => `"${lbl(id)}"`).join(', ')}`
      : `Visit "${lbl(currId)}" (leaf)`;
    rec.step(desc);

    rec.mark({ _id: currId }, 'visited');
    for (const childId of children) rec.markEdge({ _id: currId }, { _id: childId }, 'traversed');
  }
  rec.step('BFS complete ✓');
}

// ── Tree DFS (pre-order) implementation ──────────────────────────────────────

function _dfsTree(root: TreeNode, rec: TraversalRecorder) {
  const childMap = _outMap(TreeNode._edges);
  const lbl = (id: string) => String(TreeNode._registry.find(n => n._id === id)?._value ?? id);

  rec.mark(root, 'frontier');
  rec.step(`DFS — start at "${lbl(root._id)}"`);

  function dfs(id: string) {
    rec.mark({ _id: id }, 'current');
    const children = childMap.get(id) ?? [];
    for (const c of children) {
      rec.markEdge({ _id: id }, { _id: c }, 'active');
      rec.mark({ _id: c }, 'frontier');
    }
    const desc = children.length
      ? `Visit "${lbl(id)}" → explore ${children.map(c => `"${lbl(c)}"`).join(', ')}`
      : `Visit "${lbl(id)}" (leaf)`;
    rec.step(desc);

    rec.mark({ _id: id }, 'visited');
    for (const c of children) rec.markEdge({ _id: id }, { _id: c }, 'traversed');

    for (const c of children) dfs(c);
  }

  dfs(root._id);
  rec.step('DFS complete ✓');
}

// ── Util ──────────────────────────────────────────────────────────────────────

function _outMap(edges: { fromId: string; toId: string }[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    if (!m.has(e.fromId)) m.set(e.fromId, []);
    m.get(e.fromId)!.push(e.toId);
  }
  return m;
}
