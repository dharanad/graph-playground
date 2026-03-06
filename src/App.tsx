import { useState, useCallback, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

import { EXAMPLES } from './examples';
import { parseFromRegistry } from './parser';
import { Vertex, TreeNode, ListNode } from './dsClasses';
import { TraversalRecorder, createBFS, createDFS, type TraversalStep } from './traversal';
import InfoPanel from './InfoPanel';

type DSType = 'graph' | 'tree' | 'linkedList';

const LABELS: Record<DSType, string> = {
  graph: 'Graph',
  tree: 'Tree',
  linkedList: 'Linked List',
};

const PLAY_INTERVAL = 800;

function applyNodeStep(
  id: string,
  step: TraversalStep,
  base: Record<string, unknown>,
): Record<string, unknown> {
  switch (step.nodeStates.get(id)) {
    case 'current':
      return { ...base, background: '#f9e2af', color: '#1e1e2e', border: '2.5px solid #f9e2af', boxShadow: '0 0 14px #f9e2af88', opacity: 1 };
    case 'frontier':
      return { ...base, background: '#89dceb', color: '#1e1e2e', border: '2px solid #89dceb', opacity: 1 };
    case 'visited':
      return { ...base, background: '#a6e3a1', color: '#1e1e2e', border: '2px solid #a6e3a1', opacity: 1 };
    case 'highlight':
      return { ...base, background: '#cba6f7', color: '#1e1e2e', border: '2px solid #cba6f7', opacity: 1 };
    default:
      return { ...base, opacity: 0.25 };
  }
}

export default function App() {
  const [dsType, setDsType] = useState<DSType>('graph');
  const [code, setCode] = useState(EXAMPLES['graph']);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [showInfo, setShowInfo] = useState(false);
  const [traversalSteps, setTraversalSteps] = useState<TraversalStep[]>([]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Overlay step colours on top of the base layout
  const displayNodes = useMemo(() => {
    const step = traversalSteps[stepIdx];
    if (!step) return nodes;
    return nodes.map(n => ({
      ...n,
      style: applyNodeStep(n.id, step, n.style as Record<string, unknown>),
    }));
  }, [nodes, stepIdx, traversalSteps]);

  const displayEdges = useMemo(() => {
    const step = traversalSteps[stepIdx];
    if (!step) return edges;
    return edges.map(e => {
      const state = step.edgeStates.get(`${e.source}__${e.target}`);
      const color = state === 'active' ? '#f9e2af' : state === 'traversed' ? '#a6e3a1' : '#45475a';
      const opacity = state ? 1 : 0.15;
      const width = state ? 3 : 1.5;
      return {
        ...e,
        style: { ...(e.style as object), stroke: color, strokeWidth: width, opacity },
        markerEnd: e.markerEnd
          ? { ...(e.markerEnd as Record<string, unknown>), color } as Edge['markerEnd']
          : undefined,
      };
    });
  }, [edges, stepIdx, traversalSteps]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStepIdx(prev => {
        if (prev >= traversalSteps.length - 1) { setIsPlaying(false); return prev; }
        return prev + 1;
      });
    }, PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [isPlaying, traversalSteps.length]);

  const resetTraversal = useCallback(() => {
    setTraversalSteps([]);
    setStepIdx(-1);
    setIsPlaying(false);
  }, []);

  const handleTypeChange = useCallback((type: DSType) => {
    setDsType(type);
    setCode(EXAMPLES[type]);
    setError(null);
    setHasRun(false);
    setNodes([]);
    setEdges([]);
    resetTraversal();
  }, [setNodes, setEdges, resetTraversal]);

  const runCode = useCallback(() => {
    setError(null);
    setIsPlaying(false);
    try {
      Vertex.reset();
      TreeNode.reset();
      ListNode.reset();

      const rec = new TraversalRecorder();
      const BFS = createBFS(rec);
      const DFS = createDFS(rec);

      // Expose the full primitive API + convenience BFS/DFS into user scope.
      // Users can implement any algorithm they want using:
      //   mark(node, state)         – 'current' | 'visited' | 'frontier' | 'highlight'
      //   unmark(node)
      //   markEdge(from, to, state) – 'active' | 'traversed'
      //   unmarkEdge(from, to)
      //   step("description")       – snapshot the current state as one animation frame
      //   BFS(startNode)            – built-in breadth-first search
      //   DFS(startNode)            – built-in depth-first search
      // eslint-disable-next-line no-new-func
      new Function(
        'Vertex', 'TreeNode', 'ListNode',
        'BFS', 'DFS',
        'mark', 'unmark', 'markEdge', 'unmarkEdge', 'step',
        code,
      )(
        Vertex, TreeNode, ListNode,
        BFS, DFS,
        rec.mark, rec.unmark, rec.markEdge, rec.unmarkEdge, rec.step,
      );

      const { nodes: n, edges: e } = parseFromRegistry(dsType, { Vertex, TreeNode, ListNode });
      setNodes(n);
      setEdges(e);

      if (rec.steps.length > 0) {
        setTraversalSteps(rec.steps);
        setStepIdx(0);
      } else {
        resetTraversal();
      }

      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHasRun(true);
    }
  }, [code, dsType, setNodes, setEdges, resetTraversal]);

  const hasTraversal = traversalSteps.length > 0;
  const currentStep = traversalSteps[stepIdx];

  return (
    <div className="app">
      <div className="toolbar">
        <h1>DS Playground</h1>
        <select value={dsType} onChange={(e) => handleTypeChange(e.target.value as DSType)}>
          {(Object.keys(LABELS) as DSType[]).map((t) => (
            <option key={t} value={t}>{LABELS[t]}</option>
          ))}
        </select>
        <button className="run-btn" onClick={runCode}>▶ Run</button>
        <button className="info-btn" onClick={() => setShowInfo(true)} title="API reference">?</button>
      </div>

      {showInfo && <InfoPanel onClose={() => setShowInfo(false)} />}

      <div className="main">
        <div className="editor-pane">
          <div className="pane-label">Editor</div>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={(val) => setCode(val ?? '')}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              wordWrap: 'on',
              tabSize: 2,
            }}
          />
          {error && <div className="error-bar">⚠ {error}</div>}
        </div>

        <div className="canvas-pane">
          {!hasRun && (
            <div className="empty-state">
              <span className="icon">⬡</span>
              <p>Press <strong>▶ Run</strong> to visualize your data structure</p>
            </div>
          )}

          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background color="#313244" variant={BackgroundVariant.Dots} gap={20} />
            <Controls />
            <MiniMap nodeColor="#cba6f7" maskColor="#1e1e2e88" style={{ background: '#181825' }} />
          </ReactFlow>

          {hasTraversal && (
            <div className="traversal-player">
              <div className="traversal-desc">{currentStep?.description ?? ''}</div>

              <div className="traversal-controls">
                <button title="First step" onClick={() => { setIsPlaying(false); setStepIdx(0); }}>⏮</button>
                <button title="Previous" onClick={() => { setIsPlaying(false); setStepIdx(i => Math.max(0, i - 1)); }}>◀</button>
                <button className="play-btn" title={isPlaying ? 'Pause' : 'Play'} onClick={() => setIsPlaying(p => !p)}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button title="Next" onClick={() => { setIsPlaying(false); setStepIdx(i => Math.min(traversalSteps.length - 1, i + 1)); }}>▶</button>
                <button title="Last step" onClick={() => { setIsPlaying(false); setStepIdx(traversalSteps.length - 1); }}>⏭</button>
                <span className="traversal-step-count">{stepIdx + 1} / {traversalSteps.length}</span>
              </div>

              <div className="traversal-progress">
                <div className="traversal-progress-fill" style={{ width: `${((stepIdx + 1) / traversalSteps.length) * 100}%` }} />
              </div>

              <div className="traversal-legend">
                <span className="legend-item"><span className="legend-dot" style={{ background: '#f9e2af' }} />Current</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#89dceb' }} />Frontier</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#a6e3a1' }} />Visited</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#cba6f7' }} />Highlight</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
