---
layout: post
title: "Graph Theory: Search and Traversal"
date: 2024-07-17
tags:
- Graph Theory
- Data Structures
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/graph-theory-search.webp
feature: assets/featured/webp/graph-theory-search.webp
category: Code on the Road
---

<img class="center-image-0 center-image-70" src="./assets/featured/graph-theory-search.png" />

<h3>0. Graph Traversal</h3>
<p>Breadth-First Search (<a href="https://en.wikipedia.org/wiki/Breadth-first_search" target="_blank">BFS</a>) and Depth-First Search (<a href="https://en.wikipedia.org/wiki/Depth-first_search" target="_blank">DFS</a>) are two of the most commonly used graph traversal methods.</p>
<p>The traversal of a graph, whether BFS or DFS, involves two main concepts: visiting a node and exploring a node. Exploration refers to visiting all the children/adjacent nodes.</p>
<p>Among BFS and DFS, Depth-First Search is more intuitive to perform, so let's first explore DFS to set a clear standpoint on what BFS is not.</p>

<h3>1. Depth First Search</h3>
<p>Depth-First is the process of traversing (visiting and exploring) down the graph until we get to a leaf node or a cycle (re-visiting a node that's already explored). Every time we encounter one of these conditions, we head back to the last parent node (previous level node) and explore an adjacent node (until leaf or cycle) and repeat the process.</p>

<p>In other words: traverse through the tree by visiting all of the children, grandchildren, great-grandchildren (and so on) until the end of a path, only then traverse a level back to start a new path.</p>

<div class="slider" id="slider1">
  <div class="slides center-image-0 center-image-40">
    <img src="./assets/posts/graph-theory/dfs-basic/dfs-basic-Page-1.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-basic/dfs-basic-Page-2.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-basic/dfs-basic-Page-3.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-basic/dfs-basic-Page-4.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-basic/dfs-basic-Page-5.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-basic/dfs-basic-Page-6.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-basic/dfs-basic-Page-7.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-basic/dfs-basic-Page-8.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'slider1')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider1')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider1')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider1')" class="next black-button">Next</button>
  </div>
</div>

<p>Explanation of the above example:</p>
<ul class="one-line-list">
<li>Starting with <code>Vertex A</code> - start exploration, say, we go to <code>Node B</code></li>
<li><code>Node A</code> has two other adjacent vertices, but in DFS, we go depth-first</li>
<li>Further exploring the visited <code>vertex B</code>, head to <code>vertex C</code></li>
<li>Cannot further explore <code>Node C</code> as it's a leaf node - hence, <code>Node C</code> is completely explored</li>
<li>Head back to its parent (back-track prior level) and explore the next adjacent node, <code>Vertex D</code></li>
<li>Similarly, <code>Vertex E</code>. Now that all adjacent nodes of <code>Vertex B</code> are already explored, head back a level again (Back to <code>Node A</code>)</li>
<li>Visit F, explore F; head back to <code>Node A</code>. Visit G, explore G; head back to <code>Node A</code>. DFS is now complete</li>
<li>Order of visiting nodes: <code>A, B, C, D, E, F, G</code></li>
</ul>

<p>Notice that in scenarios where there are more than one adjacent node, we choose the next node to explore at random, and hence there are several paths to traverse using DFS. Defining specific rules for which node to explore next brings up the topic of new strategies in DFS (In the case for Trees: Pre-order, In-order and Post-order traversal).</p>

<h3>1.1. DFS: Detecting Cycles</h3>
<p>In the previous example, we understood to <a href="https://en.wikipedia.org/wiki/Backtracking" target="_blank">back-track</a> when we reach a leaf node. Taking an example with a graph this time to cover the "detecting a cycle" scenario, i.e., visiting a node that was previously visited.</p>
<div class="slider" id="slider2">
  <div class="slides center-image-0 center-image-60">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-1.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-2.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-3.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-4.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-5.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-6.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-7.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-8.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-9.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-10.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-11.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-12.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-13.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-graph/dfs-graph-Page-14.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'slider2')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider2')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider2')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider2')" class="next black-button">Next</button>
  </div>
</div>

<p>I have highlighted when re-visiting <code>Node G</code> (Slide #6), followed by back-tracking and visiting <code>Node J</code>. Again, this is one particular Depth First Search traversal, but it can be done in many other ways by choosing a different "next" node to visit (at every explore step).</p>

<h3>1.2. DFS: Implementation</h3>
<p>The core of the solution is to find a way to back-track and head on a different path when encountering two scenarios: reaching a dead-end (leaf node) and reaching an already visited node (cycle).</p>

<h3>1.2.1. DFS: Stack</h3>
<p>The intuition behind using a <a href="https://en.wikipedia.org/wiki/Stack_(abstract_data_type)" target="_blank">stack</a> is that when we reach a dead-end, we want to get to the previously added node (LIFO: Last-In First-Out) and explore other paths. This helps you explore each path deeply before backtracking, done using a stack to go back to the last node.</p>
<p>Easier to understand with visualization:</p>
<p></p>

<div class="slider" id="slider3">
  <div class="slides center-image-0 center-image-80">
    <img src="./assets/posts/graph-theory/dfs-stack/dfs-tree-Page-1.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-stack/dfs-tree-Page-2.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-stack/dfs-tree-Page-3.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-stack/dfs-tree-Page-4.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-stack/dfs-tree-Page-5.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-stack/dfs-tree-Page-6.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-stack/dfs-tree-Page-7.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-stack/dfs-tree-Page-8.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'slider3')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider3')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider3')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider3')" class="next black-button">Next</button>
  </div>
</div>

<p>The key points to notice here are the stack <code>pop</code> operations. On reaching <code>node D</code>, a leaf node, <code>pop()</code> to explore other paths, i.e., <code>Node E</code>. Similarly, <code>Node E</code> is a leaf node, so <code>pop()</code> to head back and explore <code>Node C</code>.</p>

<div class="table-container">
<table style="width: 800px;">
  <tr>
    <th>Step</th>
    <th>Action</th>
    <th>Stack State</th>
    <th>Visited Nodes</th>
  </tr>
  <tr>
    <td>1</td>
    <td>Push A</td>
    <td>[A]</td>
    <td>{}</td>
  </tr>
  <tr>
    <td>2</td>
    <td>Pop A, Push C, B</td>
    <td>[C, B]</td>
    <td>{A}</td>
  </tr>
  <tr>
    <td>3</td>
    <td>Pop B, Push E, D</td>
    <td>[C, E, D]</td>
    <td>{A, B}</td>
  </tr>
  <tr>
    <td>4</td>
    <td>Pop D</td>
    <td>[C, E]</td>
    <td>{A, B, D}</td>
  </tr>
  <tr>
    <td>5</td>
    <td>Pop E</td>
    <td>[C]</td>
    <td>{A, B, D, E}</td>
  </tr>
  <tr>
    <td>6</td>
    <td>Pop C, Push G, F</td>
    <td>[G, F]</td>
    <td>{A, B, D, E, C}</td>
  </tr>
  <tr>
    <td>7</td>
    <td>Pop F</td>
    <td>[G]</td>
    <td>{A, B, D, E, C, F}</td>
  </tr>
  <tr>
    <td>8</td>
    <td>Pop G</td>
    <td>[]</td>
    <td>{A, B, D, E, C, F, G}</td>
  </tr>
</table>
</div>

<p>Note: When visiting a node, add all adjacent nodes to the stack to ensure all possible paths from the current node are explored. This is essential for DFS to correctly traverse the entire graph.</p>

<p>Pseudo Code: Wrapping it all up with 10 lines of code</p>
<pre><code>DFS-Iterative(graph, start):
    let stack be a stack
    let visited be a set
    stack.push(start)
    
    while stack is not empty:
        node = stack.pop()
        if node is not in visited:
            visit(node)
            visited.add(node)
            for each neighbor of node in graph (Optional: reverse order):
                if neighbor is not in visited:
                    stack.push(neighbor)
</code></pre>

<h3>1.2.2. DFS: Recursion</h3>
<p>The <a href="https://en.wikipedia.org/wiki/Recursion" target="_blank">recursion</a> solution is quite similar to the above stack solution, where we rely on the call stack as opposed to a user-defined stack.</p>

<div class="slider" id="slider4">
  <div class="slides center-image-0 center-image-80">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-1.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-2.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-3.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-4.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-5.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-6.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-7.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-8.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-9.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-10.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-11.svg" class="slide">
    <img src="./assets/posts/graph-theory/dfs-call-stack/dfs-call-stack-Page-12.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'slider4')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider4')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider4')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider4')" class="next black-button">Next</button>
  </div>
</div>

<p>There's a small difference (in traversal order). In the recursive solution, you handle each node when you see it. Thus, the first node you handle is the first child.</p>

<p>Whereas in an iterative approach, you first insert all the elements into the stack and then handle the head of the stack (which is the last node inserted). Thus, the first node you handle is the last child.</p>

<div class="table-container">
<table style="width: 800px;">
  <tr>
    <th>Step</th>
    <th>Action</th>
    <th>Call Stack State</th>
    <th>Visited Nodes</th>
  </tr>
  <tr>
    <td>1</td>
    <td>Call on A</td>
    <td>[A]</td>
    <td>{}</td>
  </tr>
  <tr>
    <td>2</td>
    <td>Visit A, Call on B</td>
    <td>[A, B]</td>
    <td>{A}</td>
  </tr>
  <tr>
    <td>3</td>
    <td>Visit B, Call on D</td>
    <td>[A, B, D]</td>
    <td>{A, B}</td>
  </tr>
  <tr>
    <td>4</td>
    <td>Visit D, Return from D</td>
    <td>[A, B]</td>
    <td>{A, B, D}</td>
  </tr>
  <tr>
    <td>5</td>
    <td>Call on E</td>
    <td>[A, B, E]</td>
    <td>{A, B, D}</td>
  </tr>
  <tr>
    <td>6</td>
    <td>Visit E, Return from E</td>
    <td>[A, B]</td>
    <td>{A, B, D, E}</td>
  </tr>
  <tr>
    <td>7</td>
    <td>Return from B, Call on C</td>
    <td>[A, C]</td>
    <td>{A, B, D, E}</td>
  </tr>
  <tr>
    <td>8</td>
    <td>Visit C, Call on F</td>
    <td>[A, C, F]</td>
    <td>{A, B, D, E, C}</td>
  </tr>
  <tr>
    <td>9</td>
    <td>Visit F, Return from F</td>
    <td>[A, C]</td>
    <td>{A, B, D, E, C, F}</td>
  </tr>
  <tr>
    <td>10</td>
    <td>Call on G</td>
    <td>[A, C, G]</td>
    <td>{A, B, D, E, C, F}</td>
  </tr>
  <tr>
    <td>11</td>
    <td>Visit G, Return from G</td>
    <td>[A, C]</td>
    <td>{A, B, D, E, C, F, G}</td>
  </tr>
  <tr>
    <td>12</td>
    <td>Return from C</td>
    <td>[A]</td>
    <td>{A, B, D, E, C, F, G}</td>
  </tr>
  <tr>
    <td>13</td>
    <td>Return from A</td>
    <td>[]</td>
    <td>{A, B, D, E, C, F, G}</td>
  </tr>
</table>
</div>

<p>Pseudo Code: now down to 5 lines of code</p>
<pre><code>DFS-Recursive(node, visited):
    if node is not in visited:
        visit(node)
        visited.add(node)
        for each neighbor of node:
            DFS-Recursive(neighbor, visited)
</code></pre>

<p>Note: if you want the user-defined stack solution to yield the same result as the recursive solution, you need to add elements to the stack in reverse order. For each node, insert its last child first and its first child last.</p>

<h3>2. Breath First Search</h3>

<p>Also called Level Order Search. Compared to DFS, exploring in BFS is level-by-level (or in layers); i.e., start with a node, explore an adjacent node (without deep diving till leaf) - repeat until all adjacent nodes are visited; then, choose an adjacent node (child), explore a level down - until its adjacent nodes are also explored; repeat the process.</p>

<p>In other words: traverse through one entire level of children nodes first before moving on to traverse through the grandchildren nodes. Repeat: traverse through an entire level of grandchildren nodes before going on to traverse through great-grandchildren nodes.</p>

<div class="slider" id="slider5">
  <div class="slides center-image-0 center-image-40">
    <img src="./assets/posts/graph-theory/bfs-basic/bfs-basic-Page-1.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-basic/bfs-basic-Page-2.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-basic/bfs-basic-Page-3.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-basic/bfs-basic-Page-4.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-basic/bfs-basic-Page-5.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-basic/bfs-basic-Page-6.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-basic/bfs-basic-Page-7.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-basic/bfs-basic-Page-8.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'slider5')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider5')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider5')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider5')" class="next black-button">Next</button>
  </div>
</div>

<p>Explanation of the above example:</p>
<ul class="one-line-list">
<li>Starting with <code>vertex A</code> (Visit A) - start exploration of all adjacent vertices.</li>
<li>Explore adjacent nodes in any order, in this case: <code>Node B</code>, followed by <code>F</code> and <code>G</code>.</li>
<li>Cannot explore any further, as all adjacent nodes/children are visited.</li>
<li>Explore any one of the children, say <code>Node B</code>, and visit all the adjacent nodes of <code>B</code>: <code>E, C, and D</code> (in any order).</li>
<li>Again, cannot explore further, as all children are visited.</li>
<li>Similar to <code>Node B</code>, explore <code>Node G</code> and <code>F</code> (nothing to explore). BFS is now complete.</li>
<li>Order of visiting nodes: <code>A, B, F, G, E, C, D</code></li>
</ul>

<p>Similar to DFS, we need to know if a node is "visited" in order to prevent cycles, i.e., re-visiting a node. Typically, BFS is implemented using a <a href="https://en.wikipedia.org/wiki/Queue_(abstract_data_type)" target="_blank">queue</a> (FIFO: First-In First-Out) data structure. I wouldn't necessarily say that it's impossible to solve it with a stack, but it's definitely not conventional and introduces complexity.</p>

<p>Fun Fact: in the worst-case scenario (for Trees), a stack-based BFS performs better than a queue-based BFS. I'll explain more on this in a different post dedicated to Trees.</p>

<div class="slider" id="slider6">
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
    <button onclick="plusSlides(-1, 'slider6')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider6')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider6')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider6')" class="next black-button">Next</button>
  </div>
</div>

<p>One important observation in BFS is that we add nodes that we have discovered but not yet visited to the queue, and come back to (visit) them later.
With the source node (or root node) in the queue, the process is to visit a node (dequeue), add all the children to the queue (enqueue), and repeat the process.</p>

<div class="table-container">
<table style="width: 800px;">
  <tr>
    <th>Step</th>
    <th>Action</th>
    <th>Queue State</th>
    <th>Visited Nodes</th>
  </tr>
  <tr>
    <td>1</td>
    <td>Enqueue A</td>
    <td>[A]</td>
    <td>{}</td>
  </tr>
  <tr>
    <td>2</td>
    <td>Dequeue A, Enqueue B, C</td>
    <td>[B, C]</td>
    <td>{A}</td>
  </tr>
  <tr>
    <td>3</td>
    <td>Dequeue B, Enqueue D, E</td>
    <td>[C, D, E]</td>
    <td>{A, B}</td>
  </tr>
  <tr>
    <td>4</td>
    <td>Dequeue C, Enqueue F, G</td>
    <td>[D, E, F, G]</td>
    <td>{A, B, C}</td>
  </tr>
  <tr>
    <td>5</td>
    <td>Dequeue D</td>
    <td>[E, F, G]</td>
    <td>{A, B, C, D}</td>
  </tr>
  <tr>
    <td>6</td>
    <td>Dequeue E</td>
    <td>[F, G]</td>
    <td>{A, B, C, D, E}</td>
  </tr>
  <tr>
    <td>7</td>
    <td>Dequeue F</td>
    <td>[G]</td>
    <td>{A, B, C, D, E, F}</td>
  </tr>
  <tr>
    <td>8</td>
    <td>Dequeue G</td>
    <td>[]</td>
    <td>{A, B, C, D, E, F, G}</td>
  </tr>
</table>
</div>

<p>The intuition to follow along is: Queues follow the first-in, first-out (FIFO) principle, which means that whatever was enqueued first is the first item that will be read and removed from the queue.</p>

<p>Pseudo Code:</p>
<pre><code>BFS(graph, start):
    let queue be a queue
    let visited be a set
    queue.enqueue(start)
    
    while queue is not empty:
        node = queue.dequeue()
        if node is not in visited:
            visit(node)
            visited.add(node)
            for each neighbor of node in graph:
                if neighbor is not in visited:
                    queue.enqueue(neighbor)
</code></pre>

<p>I hate to be the person who uses a tree to explain a graph. Reminds me of the physics class at school, where the lectures and exams are miles apart! So, here is the visualization of BFS for a graph:</p>

<div class="slider" id="slider7">
  <div class="slides center-image-0 center-image-90">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-1.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-2.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-3.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-4.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-5.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-6.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-7.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-8.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-9.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-10.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-11.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-12.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-13.svg" class="slide">
    <img src="./assets/posts/graph-theory/bfs-queue/bfs-queue-Page-14.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'slider7')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider7')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider7')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider7')" class="next black-button">Next</button>
  </div>
</div>

<p>In the Breadth-First Search (BFS) for a graph, the same element might be added to the queue multiple times in the presence of cycles (i.e. same nodes can be visited from multiple nodes). However, it will be ignored later based on the visited check. In the above graph BFS visualization, I have skipped adding the same element into the queue and indicated it with arrows (from other node(s)) instead.</p>
<p>This can be prevented by: searching the entire queue (increasing time complexity), using another hashtable to track enqueued nodes (increasing space complexity), or slightly optimized with tail checks.</p>

<h3>3. Conclusion</h3>
<p>Both Breadth-First Search (BFS) and Depth-First Search (DFS) have a lot of applications and come up way too often when dealing with graphs.</p><p>BFS is the first that pops up when finding the shortest path in an unweighted graph. DFS has tons of use-cases too. Be it computing a graph's minimum spanning tree, detecting cycles in a graph, checking if a graph is bipartite, finding bridges, articulation points, strongly connected components, topologically sorting a graph, and many more. BFS and DFS can often be used interchangeably.</p>

<h3>4. References</h3>
<pre style="max-height: 180px"><code>[1] Wikipedia contributors, "Depth-first search," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Depth-first_search.
[2] Wikipedia contributors, "Breadth-first search," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Breadth-first_search.
[3] Abdul Bari, "Graph Traversals - BFS & DFS -Breadth First Search and Depth First Search," YouTube. [Online]. Available: https://youtu.be/pcKY4hjDrxk.
[4] Pravin Kumar Sinha, "Stack-based breadth-first search tree traversal," IBM Developer. [Online]. Available: https://developer.ibm.com/articles/au-aix-stack-tree-traversal/.
[5] W. Fiset, "Algorithms repository," GitHub, 2017. [Online]. Available: https://github.com/williamfiset/Algorithms.
</code></pre>