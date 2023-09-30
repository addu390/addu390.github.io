---
layout: post
title: "Postgres as a Graph Database"
date: 2023-09-27
tags:
  - System Design
author: Adesh Nalpet Adimurthy
feature: assets/featured/neo4j-vs-pgsql.png
category: System Wisdom
---

<img class="center-image" src="./assets/featured/neo4j-vs-pgsql.png" /> 
<p style="text-align: center;">Neo4j vs PostgreSQL</p>

Have you ever come across the need to store a tree in a relational database because using/onboarding a graph database for a small use-case is overkill? 

Before jumping into using a relational database like MySQL or PostgreSQL as a graph database, let's lay down the fundamentals:

## What is a Graph?
A graph is a set of vertices/nodes interconnected by edges/links. The edges can be directed (unidirectional or bidirectional) or undirected (no orientation, only infers a connection between nodes). In other words, nodes are objects/things, and edges are the relationships between the two nodes.

<img class="center-image" style="width: 70%;" src="./assets/posts/graph-types.png" /> 
<!-- <p style="text-align: center;">Figure 1: Types of graphs by orientation</p> -->

## Graph Data Structure in Java
A vertex represents the entity, and an edge represents the relationship between entities:
```
class Vertex {
    Integer label;
    // standard constructor, getters, setters
}
```

```
class Graph {
    private Map<Vertex, List<Vertex>> adjVertices;
    // standard constructor, getters, setters

    void addVertex(Integer label) {
        adjVertices.putIfAbsent(new Vertex(label), new ArrayList<>());
    }

    void addEdge(Integer label1, Integer label2) {
        Vertex v1 = new Vertex(label1);
        Vertex v2 = new Vertex(label2);
        adjVertices.get(v1).add(v2);
        adjVertices.get(v2).add(v1);
    }
}
```

```
Graph createGraph() {
    Graph graph = new Graph();
    graph.addVertex(1);
    graph.addVertex(2);
    graph.addVertex(3);
    graph.addVertex(4);
    
    graph.addEdge(1, 2);
    graph.addEdge(2, 3);
    graph.addEdge(2, 1);
    graph.addEdge(3, 2);
    
    return graph;
}
```

## Graph Data Structures in Postgres

Work in Progress!