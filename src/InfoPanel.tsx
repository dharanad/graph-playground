interface Props {
  onClose: () => void;
}

export default function InfoPanel({ onClose }: Props) {
  return (
    <div className="info-overlay" onClick={onClose}>
      <div className="info-panel" onClick={e => e.stopPropagation()}>
        <div className="info-header">
          <h2>API Reference</h2>
          <button className="info-close" onClick={onClose}>✕</button>
        </div>

        <div className="info-body">

          {/* ── Data structures ── */}
          <section>
            <h3>Data Structures</h3>
            <table className="api-table">
              <tbody>
                <tr><td colSpan={2} className="api-group">Graph</td></tr>
                <tr><td><code>new Vertex("A")</code></td><td>Create a graph vertex</td></tr>
                <tr><td><code>v.addEdge(other, weight?)</code></td><td>Directed edge, optional weight label</td></tr>
                <tr><td><code>v.markSource()</code></td><td>Highlight vertex as the source (green ring)</td></tr>
                <tr><td><code>v.neighbors()</code></td><td>Returns outgoing <code>Vertex[]</code></td></tr>
                <tr><td><code>v.label</code></td><td>Read the vertex label</td></tr>

                <tr><td colSpan={2} className="api-group">Tree</td></tr>
                <tr><td><code>new TreeNode(val)</code></td><td>Create a tree node</td></tr>
                <tr><td><code>n.setLeft(child)</code></td><td>Set left child</td></tr>
                <tr><td><code>n.setRight(child)</code></td><td>Set right child</td></tr>
                <tr><td><code>n.getLeft() / getRight()</code></td><td>Read children</td></tr>
                <tr><td><code>n.children()</code></td><td>Returns <code>[left, right]</code> (non-null)</td></tr>
                <tr><td><code>n.value</code></td><td>Read the node value</td></tr>

                <tr><td colSpan={2} className="api-group">Linked List</td></tr>
                <tr><td><code>new ListNode(val)</code></td><td>Create a list node</td></tr>
                <tr><td><code>n.setNext(other)</code></td><td>Link to next node</td></tr>
                <tr><td><code>n.getNext()</code></td><td>Read the next node</td></tr>
                <tr><td><code>n.value</code></td><td>Read the node value</td></tr>
              </tbody>
            </table>
          </section>

          {/* ── Traversal API ── */}
          <section>
            <h3>Traversal API <span className="info-subtitle">— injected into every Run</span></h3>
            <table className="api-table">
              <tbody>
                <tr><td colSpan={2} className="api-group">Mark nodes</td></tr>
                <tr>
                  <td><code>mark(node, state)</code></td>
                  <td>
                    Set a node's visual state:<br />
                    <span className="dot" style={{background:'#f9e2af'}}/>
                    <code className="state">'current'</code>
                    <span className="dot" style={{background:'#89dceb'}}/>
                    <code className="state">'frontier'</code>
                    <span className="dot" style={{background:'#a6e3a1'}}/>
                    <code className="state">'visited'</code>
                    <span className="dot" style={{background:'#cba6f7'}}/>
                    <code className="state">'highlight'</code>
                  </td>
                </tr>
                <tr><td><code>unmark(node)</code></td><td>Remove marking (node goes dim)</td></tr>

                <tr><td colSpan={2} className="api-group">Mark edges</td></tr>
                <tr>
                  <td><code>markEdge(from, to, state)</code></td>
                  <td>
                    <span className="dot" style={{background:'#f9e2af'}}/>
                    <code className="state">'active'</code>{' '}— edge being explored<br />
                    <span className="dot" style={{background:'#a6e3a1'}}/>
                    <code className="state">'traversed'</code>{' '}— already used
                  </td>
                </tr>
                <tr><td><code>unmarkEdge(from, to)</code></td><td>Remove edge marking</td></tr>

                <tr><td colSpan={2} className="api-group">Record frames</td></tr>
                <tr><td><code>step("message")</code></td><td>Snapshot current markings as one animation frame</td></tr>

                <tr><td colSpan={2} className="api-group">Built-in algorithms</td></tr>
                <tr><td><code>BFS(startNode)</code></td><td>Breadth-first search (graph or tree)</td></tr>
                <tr><td><code>DFS(startNode)</code></td><td>Depth-first search / pre-order (graph or tree)</td></tr>
              </tbody>
            </table>
          </section>

          {/* ── Quick example ── */}
          <section>
            <h3>Quick example</h3>
            <pre className="info-code">{`let a = new Vertex("A")
let b = new Vertex("B")
a.addEdge(b)

mark(a, 'current')
step('Start at A')

markEdge(a, b, 'active')
mark(b, 'frontier')
step('Discover B')

mark(a, 'visited')
markEdge(a, b, 'traversed')
mark(b, 'current')
step('Visit B')

mark(b, 'visited')
step('Done!')`}</pre>
          </section>

        </div>
      </div>
    </div>
  );
}
