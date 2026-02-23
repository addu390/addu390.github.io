---
layout: post
title: "Flink Internals"
date: 2026-02-21
tags:
- System Design
- Realtime
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/the-kafka.webp
feature: assets/featured/webp/the-kafka.webp
category: System Wisdom
---

<h3>1. Components</h3>

<p>A running Flink system has two sides: the user-facing side and the system side.</p>

<p>The user-facing side is the Client, where the application code lives. This includes the <code>DataStream</code> API calls, job configuration, and JAR packaging. The Client's job is to compile that code into a graph representation and submit it to the cluster.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/flink/flink-program.svg">

<p>The system side consists of the <code>JobManager</code> and <code>TaskManagers</code>. The <code>JobManager</code> receives the submitted job, plans its execution, and coordinates the entire lifecycle: scheduling, checkpointing, failure recovery. <code>TaskManagers</code> are the workers that receive individual tasks from the <code>JobManager</code> and run the actual data processing.</p>

<p>The journey from user code to running tasks involves a series of graph transformations, each adding the detail the runtime needs to distribute and execute the job across the cluster.</p>

<h3>2. Code to Execution</h3>

<p>Consider a simple streaming job: read from a source, apply a map transformation, group by key, aggregate in a window, and write to a sink.</p>

<img class="center-image-0 center-image-65" src="./assets/posts/flink/flink-topology.svg">

<p>Code does not execute anything until env.execute() is called. Between that call and actual task execution, Flink builds a series of progressively more detailed graphs.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/flink/flink-planning.svg">

<h3>2.1. Transformations</h3>

<p>Each API call (<code>fromSource, map, keyBy, window, apply, sinkTo</code>) creates a <code>Transformation</code> object and appends it to a list inside the <code>StreamExecutionEnvironment</code>. Each <code>Transformation</code> holds a reference to its input, its output type, its parallelism, and the operator logic.</p>
<p>Because each one points back to its input(s), they implicitly form a DAG.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/flink/flink-transformations.svg">

<details class="text-container"><summary class="p"> &nbsp;2.1.1. Relevant classes</summary>
<p>In <code>streaming/api/transformations/</code></p>
<pre><code>Transformation, 
OneInputTransformation, 
SourceTransformation, 
PartitionTransformation, 
SinkTransformation
</code></pre>
</details>

<h3>2.2. Logical Topology</h3>

<p>When <code>env.execute()</code> fires, <code>StreamGraphGenerator</code> walks the <code>Transformation</code> list and produces a <code>StreamGraph</code>, a DAG of <code>StreamNode(s)</code> connected by <code>StreamEdge(s)</code>.</p>

<p>Each physical Transformation (Source, Map, Window/Apply, Sink) becomes a <code>StreamNode</code>. Each <code>StreamNode</code> holds its operator factory, parallelism, and serializers. Connections between nodes become <code>StreamEdges</code>, each carrying a <code>StreamPartitioner</code> that defines how data flows between operators.</p>

<p>Non-physical Transformations like <code>PartitionTransformation</code> (created by keyBy) don't produce their own node. Instead, they attach partitioning information to the downstream edge. These are handled as virtual nodes during generation.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/flink/flink-logical-topology.svg">

<p>The resulting StreamGraph is a direct representation of the job logic. No optimization has happened yet.</p>

<details class="text-container"><summary class="p"> &nbsp;2.2.1. Relevant classes</summary>
<p>In <code>streaming/api/graph/</code></p>
<pre><code>StreamGraphGenerator, 
StreamGraph, 
StreamNode, 
StreamEdge
</code></pre>
In <code>streaming/runtime/partitioner/</code>
<pre><code>StreamPartitioner, 
ForwardPartitioner, 
KeyGroupStreamPartitioner, 
etc.
</code></pre>
</details>

<h3>2.3. Operator Chaining</h3>

<p>The <code>StreamGraph</code> is compiled into a <code>JobGraph</code> by <code>StreamingJobGraphGenerator</code>. The key optimization here is operator chaining: operators that meet certain conditions are fused into a single <code>JobVertex</code>.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/flink/flink-operator-chaining.svg">

<p>Source and Map chain together (same parallelism, forward edge). Window/Apply and Sink chain together. The keyBy between Map and Window introduces a hash partitioner, a shuffle boundary, so those two cannot chain. That boundary becomes a real <code>JobEdge</code> between the two <code>JobVertices</code>.

<p>4 operators → 2 JobVertices. Fewer network exchanges, less serialization, better throughput.</p>

<details class="text-container"><summary class="p"> &nbsp;2.3.1. Relevant classes</summary>
<p>In <code>streaming/api/graph/</code></p>
<pre><code>StreamingJobGraphGenerator 
</code></pre>
In <code>runtime/jobgraph/</code>
<pre><code>JobGraph, 
JobVertex, 
JobEdge
</code></pre>
</details>

<h3>2.4. Physical Topology</h3>

<p>The physical topology describes how it actually runs, in parallel, distributed across machines.</p>

<p>Each operator runs at some parallelism, the number of parallel instances (subtasks) that execute it. At parallelism N, the operator's data stream is divided into N stream partitions.</p>

<p>Using the same example:</p>
<img class="center-image-0 center-image-80" src="./assets/posts/flink/flink-physical-topology.svg">

<p>Each subtask produces a stream partition, an independent slice of the data.
Between operators, data either flows forward or gets redistributed:</p>

<ul>
<li><p>Forward: data stays local, 1:1 from upstream partition to downstream partition. No serialization, no network. [Source → Map] uses this because both run at the same parallelism and no repartitioning is needed.</p></li>

<li><p>Redistribution (shuffle): data crosses the network. Every upstream partition can send to every downstream partition. Records get serialized, sent over TCP, deserialized. <code>keyBy</code> triggers this, records are hashed by key so that all records for a given key land on the same downstream subtask. [Map → Window] in the diagram above is a hash shuffle.</p></li>
</ul>

<p>Where these shuffle boundaries land is one of the most important performance factors in a Flink job. Forward connections are cheap. Shuffles are expensive.</p>

<details class="text-container"><summary class="p"> &nbsp;2.4.1. Relevant classes</summary>
<p>In <code>streaming/runtime/partitioner/</code></p>
<pre><code>StreamPartitioner, 
ForwardPartitioner, 
KeyGroupStreamPartitioner, 
RebalancePartitioner, 
BroadcastPartitioner
</code></pre>
In <code>streaming/api/graph/</code>
<pre><code>StreamEdge
</code></pre>
</details>

<h3>2.5. Execution Plan</h3>

<p>The <code>JobGraph</code> is submitted to the <code>JobManager</code>. The <code>JobMaster</code> takes each <code>JobVertex</code> and expands it by parallelism to produce the <code>ExecutionGraph</code>.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/flink/flink-execution-graph.svg">

<p>Each <code>JobVertex</code> becomes an <code>ExecutionJobVertex</code>. Each parallel instance becomes an <code>ExecutionVertex</code>. Each <code>ExecutionVertex</code> tracks its current Execution attempt. If a subtask fails and needs to restart, a new Execution is created for the same <code>ExecutionVertex</code>.</p>

<p>The <code>ExecutionGraph</code> is the structure the <code>JobMaster</code> uses for scheduling, tracking task state, coordinating checkpoints, and handling failures.</p>

<p>Each <code>ExecutionVertex</code> is deployed to a <code>TaskManager</code> as a Task. A Task is the actual runtime entity: a dedicated thread that runs the <code>OperatorChain</code>, reads from InputGates, processes records through the chained operators, and writes to <code>ResultPartition</code>(s).</p>

<details class="text-container"><summary class="p"> &nbsp;2.5.1. Relevant classes</summary>
<p>In <code>runtime/executiongraph/</code></p>
<pre><code>DefaultExecutionGraph, 
ExecutionJobVertex, 
ExecutionVertex, 
Execution.
</code></pre>
</details>

<h3>3. State</h3>

<p>Operators can be stateless or stateful. From the above example, the <code>map</code> transforms the record, has no state. On the other hand, the window operation collect records until a trigger fires uses state.</p>

<p>Flink state is fault tolerant (through checkpoints) and rescalable (by redistributing it when parallelism changes). Without which, every operator would have to manage its own storage and recovery.</p>

<h3>3.1. State Backend</h3>

<p>Going back to the example, <code>keyBy(...).window(TumblingEventTimeWindows.of(Time.seconds(10)))</code>, the window operator collecting events for 10 seconds needs to store that data somewhere until the window fires. Each parallel subtask of a stateful operator maintains its own local state storage. This storage is embedded within the TaskManager process, so state access is fast and does not require any network calls.</p>

<img class="center-image-0 center-image-60" src="./assets/posts/flink/flink-window-state.svg">

<p>The storage engine behind this is called the State Backend. Flink provides two production-ready options:</p>

<ul>
<li><p><code>HashMapStateBackend</code>: State lives as Java objects on the JVM heap. Fast access since there is no serialization overhead, but limited by available memory.</p></li>

<li><p><code>EmbeddedRocksDBStateBackend</code>: State is serialized and stored in an embedded RocksDB instance on local disk. Slower per access (every read/write goes through serialization), but can hold state much larger than memory, bounded only by disk space.</p></li>
</ul>

<p>The tradeoff is speed vs. capacity. For small to moderate state, heap is faster. For large state (GBs to TBs), RocksDB is the only viable option.</p>

<p>Because each subtask has its own local state backend instance, state scales naturally with parallelism. Two parallel subtasks of the window operator means two independent state stores, each holding only the data for its own subset of keys.</p>

<p>There is also an experimental third option, <code>ForStStateBackend</code>, built on <code>ForSt</code> (a fork of RocksDB). It stores SST files on remote storage (S3, HDFS) instead of local disk, allowing state to exceed local disk capacity entirely. Designed for disaggregated, cloud native setups and supports asynchronous state access, but is <code>@Experimental</code>.</p>

<details class="text-container"><summary class="p"> &nbsp;3.1.1. Relevant classes</summary>
<p>In <code>flink-runtime/</code>, <code>flink-statebackend-rocksdb/</code>, <code>flink-statebackend-forst/</code></p>
<pre><code>StateBackend,
HashMapStateBackend,
EmbeddedRocksDBStateBackend,
ForStStateBackend
</code></pre>
</details>

<h3>3.2. Snapshots and Checkpointing</h3>

<p>State stored locally in each subtask solves the access problem, but not the durability problem. If a <code>TaskManager</code> crashes, that local state is gone. Flink needs a way to periodically capture a consistent snapshot of the entire job's state so it can recover from failures.</p>

<p>This mechanism is called checkpointing, and it is based on the <code>Chandy-Lamport</code> algorithm for distributed snapshots, adapted for Flink's dataflow model.</p>

<p>The process works as follows:</p>
<ul>
<li><p>The <code>CheckpointCoordinator</code> (running inside the <code>JobManager</code>) periodically initiates a checkpoint by sending a trigger to all source operators.</p></li>

<li><p>Each source, records its current position (e.g., Kafka partition offsets) and injects a special marker called a checkpoint barrier into the data stream. The barrier is not a separate signal; it flows with the records, in order, through the DAG.</p></li>

<li><p>When an operator receives a barrier, it snapshots its local state and forwards the barrier downstream. The state snapshot is written to durable storage (typically a distributed file system like HDFS or S3).</p></li>

<li><p>When all sink(s) have received the barrier and acknowledged it back to the <code>CheckpointCoordinator</code>, the checkpoint is considered complete.</p></li>
</ul>

<div class="slider" id="slider2">
  <div class="slides center-image-0 center-image-70">
    <img src="./assets/posts/flink/flink-checkpoint-1.svg" class="slide">
    <img src="./assets/posts/flink/flink-checkpoint-2.svg" class="slide">
    <img src="./assets/posts/flink/flink-checkpoint-3.svg" class="slide">
    <img src="./assets/posts/flink/flink-checkpoint-4.svg" class="slide">
    <img src="./assets/posts/flink/flink-checkpoint-5.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'slider2')" class="prev black-button">Prev</button>
    <button onclick="playSlides('slider2')" class="play black-button">Play</button>
    <button onclick="stopSlides('slider2')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'slider2')" class="next black-button">Next</button>
  </div>
</div>

<p>The result is a consistent global snapshot: source offsets plus the state of every operator, all corresponding to the same logical point in the stream. No records are lost, no records are counted twice.</p>

<p>A key detail: barriers never overtake records. They flow strictly in line. This is what ensures the snapshot captures exactly the state that results from processing all records before the barrier and none of the records after it.</p>

<img class="center-image-0 center-image-75" src="./assets/posts/flink/flink-window-barrier.svg">

<p>For operators with multiple inputs (like after a shuffle), the barrier must arrive from all input channels before the snapshot is taken. This is called barrier alignment, and it ensures that no pre-checkpoint and post-checkpoint data gets mixed. This alignment can briefly pause processing on the faster channels, which is a tradeoff explored further in unaligned checkpoints.</p>

<h3>3.3. Recovery</h3>