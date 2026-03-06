export const EXAMPLES: Record<string, string> = {
  graph: `// Available in scope:
//   Vertex, BFS, DFS
//   mark(node, state)         'current' | 'visited' | 'frontier' | 'highlight'
//   unmark(node)
//   markEdge(from, to, state) 'active' | 'traversed'
//   unmarkEdge(from, to)
//   step("description")       record one animation frame

let a = new Vertex("A")
let b = new Vertex("B")
let c = new Vertex("C")
let d = new Vertex("D")
let e = new Vertex("E")

a.markSource()
a.addEdge(b, 3)
a.addEdge(c, 7)
b.addEdge(d, 2)
c.addEdge(d, 1)
d.addEdge(e, 5)

// --- Write your own BFS ---
function bfs(start) {
  const visited = new Set()
  const queue = [start]
  mark(start, 'frontier')
  step('Enqueue "' + start.label + '"')

  while (queue.length > 0) {
    const curr = queue.shift()
    if (visited.has(curr)) continue
    visited.add(curr)
    mark(curr, 'current')

    for (const nb of curr.neighbors()) {
      markEdge(curr, nb, 'active')
      if (!visited.has(nb)) {
        mark(nb, 'frontier')
        queue.push(nb)
      }
    }
    step('Visit "' + curr.label + '"')

    mark(curr, 'visited')
    for (const nb of curr.neighbors()) markEdge(curr, nb, 'traversed')
  }
  step('Done!')
}

bfs(a)

// Tip: replace bfs(a) with DFS(a) to use the built-in DFS
`,

  tree: `// Available in scope:
//   TreeNode, BFS, DFS
//   mark / unmark / markEdge / unmarkEdge / step

let root = new TreeNode(1)
let n2 = new TreeNode(2)
let n3 = new TreeNode(3)
let n4 = new TreeNode(4)
let n5 = new TreeNode(5)
let n6 = new TreeNode(6)
let n7 = new TreeNode(7)

root.setLeft(n2)
root.setRight(n3)
n2.setLeft(n4)
n2.setRight(n5)
n3.setLeft(n6)
n3.setRight(n7)

// --- Write your own DFS (pre-order) ---
function dfs(node) {
  if (!node) return
  mark(node, 'current')
  step('Visit ' + node.value)

  for (const child of node.children()) {
    markEdge(node, child, 'active')
    mark(child, 'frontier')
  }
  if (node.children().length) step('Explore children of ' + node.value)

  mark(node, 'visited')
  for (const child of node.children()) markEdge(node, child, 'traversed')

  for (const child of node.children()) dfs(child)
}

dfs(root)
step('DFS complete!')

// Tip: replace dfs(root) with BFS(root) for level-order traversal
`,

  linkedList: `// Available in scope: ListNode
// (BFS / DFS do not apply to linked lists)

let n1 = new ListNode(1)
let n2 = new ListNode(2)
let n3 = new ListNode(3)
let n4 = new ListNode(4)
let n5 = new ListNode(5)

n1.setNext(n2)
n2.setNext(n3)
n3.setNext(n4)
n4.setNext(n5)
`,
};
