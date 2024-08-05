---
layout: post
title: "Breath-First Search using Stack"
date: 2024-07-21
tags:
- Graph Theory
- Data Structures
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/stack-bfs.webp
feature: assets/featured/webp/stack-bfs.webp
category: Code on the Road
---

<img class="center-image-0 center-image-65" src="./assets/featured/stack-bfs.png" />

<h3>1. BFS using Queue</h3>
<p>Just in the prior post on <a href="{{ site.url }}/stack-based-bfs">graph traversal</a>, we went into details of Depth-First Search (DFS) and Breadth-First Search (BFS). BFS is a way of traversing down the graph, level-by-level. Specifically for a balanced-tree, the first/root node is visited first, followed by its immediate children, then followed by the next level children, and so on. Here's the same example of BFS using a queue:</p>

<div class="slider" id="slider8">
  <div class="slides center-image-0 center-image-80">
    <img src="./assets/posts/graph-theory/bfs-tree/bfs-tree-Page-1.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-tree/bfs-tree-Page-2.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-tree/bfs-tree-Page-3.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-tree/bfs-tree-Page-4.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-tree/bfs-tree-Page-5.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-tree/bfs-tree-Page-6.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-tree/bfs-tree-Page-7.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-tree/bfs-tree-Page-8.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'slider8')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider8')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider8')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider8')" class="next black-button">Next</button>
  </div>
</div>

<h3>2. Problem: Space Complexity</h3>
<p>The problem with this solution is adding all the immediate children to the queue before visiting them. While this isn't much of a concern for a binary tree, imagine a non-binary tree where at each level the number of nodes grows exponentially. In the example below, when the second-level <code>node G</code> is visited, the queue now has 49 entries. For the nth level: <code>7^(N-1)</code> nodes. For level 100, there would be <code>282,475,249</code> entries in the queue. Nearly 300 million entries and a 4-byte address pointer per entry would lead to around ~1 MB.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/graph-theory/bfs-stack-problem.svg">

<h3>3. Solution: BFS using Stack</h3>
<p>The recursive approach below, the space coordinate depends on the number of levels. In a balanced tree, the space complexity is now <code>O(log(n))</code>, where <code>n</code> is the total number of nodes.</p>

<p>Pusedo Code:</p>
<pre><code>procedure bfs(root:NODE*);
    var target = 0;
    var node = root;
BEGIN
    for each level in tree do
    begin
        printtree(node, target, 0);
        target = target + 1;
    end
END
</code></pre>

<pre><code>procedure printtree(node:NODE*, target:int, level:int);
BEGIN
    if(target > level) then
    begin
        for each child of node do
            printtree(child, target, level + 1);
    end
    else
        print node;
END
</code></pre>

<p>Going back to the same example for a balanced binary tree with nodes: <code>A, B, C, D, E, F, G</code></p>

<img class="center-image-0" style="width: 48%" src="./assets/posts/graph-theory/binary-tree.svg">

<p>Initializing the root node and setting the initial target level to 0. The main BFS loop iterates through each level of the tree, incrementing the target level after processing each one.</p>

<p>Iteration 1 (target = 0)</p>
<div class="table-container">
<table>
  <tr>
    <th>Step</th>
    <th>Action</th>
    <th>Current Call Stack</th>
    <th>Visited Nodes</th>
  </tr>
  <tr>
    <td>1</td>
    <td>Initial setup</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>2</td>
    <td>Iteration with target=0</td>
    <td>printtree(A, 0, 0)</td>
    <td></td>
  </tr>
  <tr>
    <td>3</td>
    <td>Visiting A</td>
    <td></td>
    <td>A</td>
  </tr>
</table>
</div>

<p>For each level, the <code>printtree</code> function is called with the current node, the target level, and the current level (starting from zero). Checks if the target level is greater than the current level. If so, recursively call for each child of the current node, incrementing the level by 1. This continues until the target level equals the current level, at which point the node is printed.</p>

<p>Iteration 2 (target = 1)</p>
<div class="table-container">
<table>
  <tr>
    <th>Step</th>
    <th>Action</th>
    <th>Current Call Stack</th>
    <th>Visited Nodes</th>
  </tr>
  <tr>
    <td>4</td>
    <td>target=1</td>
    <td></td>
    <td>A</td>
  </tr>
  <tr>
    <td>5</td>
    <td>Iteration with target=1</td>
    <td>printtree(A, 1, 0)</td>
    <td>A</td>
  </tr>
  <tr>
    <td>6</td>
    <td>Call B</td>
    <td>printtree(A, 1, 0) → printtree(B, 1, 1)</td>
    <td>A</td>
  </tr>
  <tr>
    <td>7</td>
    <td>Visiting B</td>
    <td>printtree(A, 1, 0)</td>
    <td>A, B</td>
  </tr>
  <tr>
    <td>8</td>
    <td>Call C</td>
    <td>printtree(A, 1, 0) → printtree(C, 1, 1)</td>
    <td>A, B</td>
  </tr>
  <tr>
    <td>9</td>
    <td>Visiting C</td>
    <td>printtree(A, 1, 0)</td>
    <td>A, B, C</td>
  </tr>
</table>
</div>

<p>by incrementing the target level and repeating the process until all levels of the tree have been processed, nodes are printed level-by-level, leadind to a breadth-first traversal.</p>

<p>Iteration 3 (target = 2)</p>
<div class="table-container">
<table>
  <tr>
    <th>Step</th>
    <th>Action</th>
    <th>Current Call Stack</th>
    <th>Visited Nodes</th>
  </tr>
  <tr>
    <td>10</td>
    <td>target=2</td>
    <td></td>
    <td>A, B, C</td>
  </tr>
  <tr>
    <td>11</td>
    <td>Iteration with target=2</td>
    <td>printtree(A, 2, 0)</td>
    <td>A, B, C</td>
  </tr>
  <tr>
    <td>12</td>
    <td>Call B</td>
    <td>printtree(A, 2, 0) → printtree(B, 2, 1)</td>
    <td>A, B, C</td>
  </tr>
  <tr>
    <td>13</td>
    <td>Call D</td>
    <td>printtree(A, 2, 0) → printtree(B, 2, 1) → printtree(D, 2, 2)</td>
    <td>A, B, C</td>
  </tr>
  <tr>
    <td>14</td>
    <td>Visiting D</td>
    <td>printtree(A, 2, 0) → printtree(B, 2, 1)</td>
    <td>A, B, C, D</td>
  </tr>
  <tr>
    <td>15</td>
    <td>Call E</td>
    <td>printtree(A, 2, 0) → printtree(B, 2, 1) → printtree(E, 2, 2)</td>
    <td>A, B, C, D</td>
  </tr>
  <tr>
    <td>16</td>
    <td>Visiting E</td>
    <td>printtree(A, 2, 0) → printtree(B, 2, 1)</td>
    <td>A, B, C, D, E</td>
  </tr>
  <tr>
    <td>17</td>
    <td>Call C</td>
    <td>printtree(A, 2, 0) → printtree(C, 2, 1)</td>
    <td>A, B, C, D, E</td>
  </tr>
  <tr>
    <td>18</td>
    <td>Call F</td>
    <td>printtree(A, 2, 0) → printtree(C, 2, 1) → printtree(F, 2, 2)</td>
    <td>A, B, C, D, E</td>
  </tr>
  <tr>
    <td>19</td>
    <td>Visiting F</td>
    <td>printtree(A, 2, 0) → printtree(C, 2, 1)</td>
    <td>A, B, C, D, E, F</td>
  </tr>
</table>
</div>

<h3>4. Recursive BFS: Implementation</h3>
<p>Without much explanation, here's an implementation in Java. In the <code>Node</code> class, <code>children</code> is an array of `Node`s, but it also works with other data structures, such as a <code>LinkedList</code>.</p>

<pre><code>class Node {
    char data;
    Node[] children;

    Node(char data, int childCount) {
        this.data = data;
        this.children = new Node[childCount];
    }
}
</code></pre>

<pre><code>public class TreeTraversal {

    // BFS subroutine
    boolean printTree(Node node, int target, int level) {
        boolean returnValue = false;
        if (target > level) {
            for (int i = 0; i < node.children.length; i++) {
                if (printTree(node.children[i], target, level + 1)) {
                    returnValue = true;
                }
            }
        } else {
            System.out.print(node.data);
            if (node.children.length > 0) {
                returnValue = true;
            }
        }
        return returnValue;
    }

    // BFS routine
    void printBfsTree(Node root) {
        if (root == null) return;
        int target = 0;
        while (printTree(root, target++, 0)) {
            System.out.println();
        }
    }

    public static void main(String[] args) {
        Node root = new Node('A', 2);
        root.children[0] = new Node('B', 2);
        root.children[1] = new Node('C', 1);
        root.children[0].children[0] = new Node('D', 0);
        root.children[0].children[1] = new Node('E', 0);
        root.children[1].children[0] = new Node('F', 0);

        TreeTraversal treeTraversal = new TreeTraversal();
        treeTraversal.printBfsTree(root);
    }
}
</code></pre>

<h3>5. Conclusion</h3>
<p>The prime difference between the queue-based BFS and stack-based BFS is that the space coordinate of queue-based BFS depends on the number of children and for stack-based BFS, it's the depth/height of the tree.</p>

<p>Taking an example, say we have a balanced tree with 9 levels (root node being level 1) and each node has 10 children. In the queue-based BFS solution, the number of nodes in the queue at level 9 would be <code>C^(N - 1)</code>, where <code>N</code> is the number of levels and <code>C</code> is the number of children per node. For <code>C = 10</code> and <code>N = 9</code>, this results in <code>10^(9 - 1) = 10^8</code>. Presuming each node is 4 bytes, that's <span class="underline">400 MB</span> in the queue (at level 9).</p>

<p>The stack-based solution, on the other hand, the call-stack can have at most <code>L</code> (number of levels) recursive calls (one for each child), but only one call at a time will be active in the stack for each depth level. Realistically the stack contains other data such as return address, local variables, saved registers, etc., and taking each stack frame size of 64 bytes, the space of the callstack at most is <code>9 × 64</code> bytes = <span class="underline">576 bytes</span>.</p>

<p>This is considerable space saving! At much higher levels, say 50 levels, the stack-based solution outperforms queue-based BFS in both time and space coordinates. However, for a more irregular/high-depth tree, queue-based BFS performs better.</p>

<h3>6. References</h3>
<pre style="max-height: 180px"><code>[1] Pravin Kumar Sinha, "Stack-based breadth-first search tree traversal," IBM Developer. [Online]. Available: https://developer.ibm.com/articles/au-aix-stack-tree-traversal.
[2] Wikipedia contributors, "Breadth-first search," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Breadth-first_search.
[3] Adesh Nalpet Adimurthy, "Graph Theory: Search and Traversal," PyBlog, 2024. [Online]. Available: https://www.pyblog.xyz/graph-traversal.
</code></pre>
