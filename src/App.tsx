import { useState, useCallback } from 'react';
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

type DSType = 'graph' | 'tree' | 'linkedList';

const LABELS: Record<DSType, string> = {
  graph: 'Graph',
  tree: 'Tree',
  linkedList: 'Linked List',
};

export default function App() {
  const [dsType, setDsType] = useState<DSType>('graph');
  const [code, setCode] = useState(EXAMPLES['graph']);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const handleTypeChange = useCallback((type: DSType) => {
    setDsType(type);
    setCode(EXAMPLES[type]);
    setError(null);
    setHasRun(false);
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const runCode = useCallback(() => {
    setError(null);
    try {
      Vertex.reset();
      TreeNode.reset();
      ListNode.reset();
      // eslint-disable-next-line no-new-func
      new Function('Vertex', 'TreeNode', 'ListNode', code)(Vertex, TreeNode, ListNode);
      const { nodes: n, edges: e } = parseFromRegistry(dsType, { Vertex, TreeNode, ListNode });
      setNodes(n);
      setEdges(e);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHasRun(true);
    }
  }, [code, dsType, setNodes, setEdges]);

  return (
    <div className="app">
      <div className="toolbar">
        <h1>DS Playground</h1>
        <select
          value={dsType}
          onChange={(e) => handleTypeChange(e.target.value as DSType)}
        >
          {(Object.keys(LABELS) as DSType[]).map((t) => (
            <option key={t} value={t}>{LABELS[t]}</option>
          ))}
        </select>
        <button className="run-btn" onClick={runCode}>▶ Run</button>
      </div>

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
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background color="#313244" variant={BackgroundVariant.Dots} gap={20} />
            <Controls />
            <MiniMap
              nodeColor="#cba6f7"
              maskColor="#1e1e2e88"
              style={{ background: '#181825' }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
