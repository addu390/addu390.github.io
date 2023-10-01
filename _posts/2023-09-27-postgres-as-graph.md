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

Have you ever come across the need to store a graph in a relational database because using/onboarding a graph database for a small use-case is overkill? 

Before jumping into using a relational database like MySQL or PostgreSQL as a graph database, let's lay down the fundamentals:

## What is a Graph?
A graph is a set of vertices/nodes interconnected by edges/links. The edges can be directed (unidirectional or bidirectional) or undirected (no orientation, only infers a connection between nodes). 

<img class="center-image" style="width: 75%;" src="./assets/posts/graph-types.png" /> 

## Graph Data Structure in Java
A vertex represents the entity, and an edge represents the relationship between entities:
```
class Vertex {
    Integer label;
    // standard constructor, getters, setters
}
```
The graph would be a collection of vertices and edges:
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
    graph.addVertex(5);
    graph.addVertex(6);
    
    graph.addEdge(1, 2);
    graph.addEdge(1, 3);
    graph.addEdge(2, 1);
    graph.addEdge(2, 4);
    graph.addEdge(3, 5);
    graph.addEdge(3, 6);
    
    return graph;
}
```
Visual representation of the above `graph`:
<img class="center-image" style="width: 75%;" src="./assets/posts/graph-example-1.png" /> 

## Graph Data Structures in Postgres

Storing the graph `Map<Vertex, List<Vertex>>` in a relational database such as Postgres as-is would mean creating two tables: `Vertex` and `Graph`:
```
CREATE TABLE vertex (
    vertex_id INT,
    PRIMARY KEY(vertex_id)
    // Other columns
);

CREATE TABLE graph (
    graph_id INT,
    vertex_id INT,
    vertices INTEGER[]

    PRIMARY KEY(graph_id),
    CONSTRAINT fk_vertex_id
    FOREIGN KEY(vertex_id)
    REFERENCES vertex(vertex_id)
    ON DELETE NO ACTION
);
```
Ideally, each element in the `graph` -> `vertices` array should represent foreign keys to the `vertex` table.

Relational databases operate most efficiently on properly normalized data models. Arrays are not relational data structures, by definition they are sets; while the SQL standard supports defining foreign keys on array elements, PostgreSQL currently does not support it. However, there is an ongoing effort to implement this [1].

A better way to store a graph in Postgres is by creating two tables: `vertex` and `edge`
<img class="center-image" style="width: 90%;" src="./assets/posts/graph-example-2.png" /> 
```
CREATE TABLE vertex (
    vertex_id INT,
    PRIMARY KEY(vertex_id)
    // Other columns
);

CREATE TABLE edge (
    source_vertex INT REFERENCES vertex(vertex_id),
    target_vertex INT REFERENCES vertex(vertex_id),
    PRIMARY KEY (source_vertex, target_vertex)
);
```
The table `edge` represents the relationship between two vertices; the composite primary key `(source_vertex, target_vertex)` ensures that each edge is unique.

Work in Progress!