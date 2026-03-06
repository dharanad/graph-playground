export const EXAMPLES: Record<string, string> = {
  graph: `// Create vertices and connect them with edges.
// Use markSource() to highlight a starting vertex.

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
`,

  tree: `// Build a binary tree using TreeNode.
// Use setLeft() and setRight() to connect nodes.

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
`,

  linkedList: `// Build a linked list using ListNode.
// Use setNext() to chain nodes together.

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
