// Module-level ID counters — reset per class
let _vertexCounter = 0;
let _treeNodeCounter = 0;
let _listNodeCounter = 0;

// ─── Vertex (Graph) ───────────────────────────────────────────────────────────

export interface VertexEdgeRecord {
  fromId: string;
  toId: string;
  weight?: number;
}

export class Vertex {
  static _registry: Vertex[] = [];
  static _edges: VertexEdgeRecord[] = [];
  static _sources: Set<string> = new Set();

  _id: string;
  _label: string;
  _isSource: boolean = false;

  constructor(label: string) {
    this._id = `v${_vertexCounter++}`;
    this._label = label;
    Vertex._registry.push(this);
  }

  /** Human-readable label (read-only). Use in your algorithms: `curr.label` */
  get label(): string { return this._label; }

  /** Returns all directly reachable neighbours (outgoing edges). */
  neighbors(): Vertex[] {
    return Vertex._edges
      .filter(e => e.fromId === this._id)
      .map(e => Vertex._registry.find(v => v._id === e.toId)!)
      .filter(Boolean);
  }

  addEdge(other: Vertex, weight?: number) {
    Vertex._edges.push({ fromId: this._id, toId: other._id, weight });
  }

  markSource() {
    this._isSource = true;
    Vertex._sources.add(this._id);
  }

  static reset() {
    Vertex._registry = [];
    Vertex._edges = [];
    Vertex._sources = new Set();
    _vertexCounter = 0;
  }
}

// ─── TreeNode (Tree) ──────────────────────────────────────────────────────────

export interface TreeEdgeRecord {
  fromId: string;
  toId: string;
  type: 'left' | 'right';
}

export class TreeNode {
  static _registry: TreeNode[] = [];
  static _edges: TreeEdgeRecord[] = [];

  _id: string;
  _value: unknown;
  _left: TreeNode | null = null;
  _right: TreeNode | null = null;

  constructor(value: unknown) {
    this._id = `t${_treeNodeCounter++}`;
    this._value = value;
    TreeNode._registry.push(this);
  }

  /** Node value (read-only). Use in your algorithms: `node.value` */
  get value(): unknown { return this._value; }

  /** Returns non-null children in order [left, right]. */
  children(): TreeNode[] {
    return [this._left, this._right].filter((n): n is TreeNode => n !== null);
  }

  setLeft(node: TreeNode) {
    this._left = node;
    TreeNode._edges.push({ fromId: this._id, toId: node._id, type: 'left' });
  }

  setRight(node: TreeNode) {
    this._right = node;
    TreeNode._edges.push({ fromId: this._id, toId: node._id, type: 'right' });
  }

  getLeft(): TreeNode | null {
    return this._left;
  }

  getRight(): TreeNode | null {
    return this._right;
  }

  static reset() {
    TreeNode._registry = [];
    TreeNode._edges = [];
    _treeNodeCounter = 0;
  }
}

// ─── ListNode (Linked List) ───────────────────────────────────────────────────

export interface ListEdgeRecord {
  fromId: string;
  toId: string;
}

export class ListNode {
  static _registry: ListNode[] = [];
  static _edges: ListEdgeRecord[] = [];

  _id: string;
  _value: unknown;
  _next: ListNode | null = null;

  constructor(value: unknown) {
    this._id = `l${_listNodeCounter++}`;
    this._value = value;
    ListNode._registry.push(this);
  }

  /** Node value (read-only). Use in your algorithms: `node.value` */
  get value(): unknown { return this._value; }

  setNext(node: ListNode) {
    this._next = node;
    ListNode._edges.push({ fromId: this._id, toId: node._id });
  }

  getNext(): ListNode | null {
    return this._next;
  }

  static reset() {
    ListNode._registry = [];
    ListNode._edges = [];
    _listNodeCounter = 0;
  }
}
