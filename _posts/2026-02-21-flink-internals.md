---
layout: post
title: "Apache Flink Internals"
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

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
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

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
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

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
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
<img class="center-image-0 center-image-90" src="./assets/posts/flink/flink-physical-topology.svg">

<p>Each subtask produces a stream partition, an independent slice of the data.
Between operators, data either flows forward or gets redistributed:</p>

<ul>
<li><p>Forward: data stays local, 1:1 from upstream partition to downstream partition. No serialization, no network. [Source → Map] uses this because both run at the same parallelism and no repartitioning is needed.</p></li>

<li><p>Redistribution (shuffle): data crosses the network. Every upstream partition can send to every downstream partition. Records get serialized, sent over TCP, deserialized. <code>keyBy</code> triggers this, records are hashed by key so that all records for a given key land on the same downstream subtask. [Map → Window] in the diagram above is a hash shuffle.</p></li>
</ul>

<p>Where these shuffle boundaries land is one of the most important performance factors in a Flink job. Forward connections are cheap. Shuffles are expensive.</p>

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
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

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
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

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
<p>In <code>flink-runtime/</code>, <code>flink-statebackend-rocksdb/</code>, <code>flink-statebackend-forst/</code></p>
<pre><code>StateBackend,
HashMapStateBackend,
EmbeddedRocksDBStateBackend,
ForStStateBackend
</code></pre>
</details>

<h3>3.2. State Primitives</h3>

<p>The state backends described above are the storage engines. What gets stored in them broadly falls into two categories.</p>

<h3>3.2.1. Keyed State</h3>
<p>Keyed State is partitioned by key. In the example job, the <code>keyBy(...)</code> before the window means each window subtask only processes events for its assigned keys. The window operator internally uses keyed state to buffer incoming events until the window fires. That buffer is a <code>ListState</code> scoped to each key, stored in whichever state backend is configured.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/flink/flink-state.svg">

<p>Beyond the internal use by windows, Flink exposes keyed state primitives for custom operators:</p>
<ul>
<li><code>ValueState&lt;T&gt;</code>: A single value per key.</li>
<li><code>ListState&lt;T&gt;</code>: A list of values per key.</li>
<li><code>MapState&lt;K, V&gt;</code>: A key-value map per key.</li>
<li><code>ReducingState&lt;T&gt;</code> / <code>AggregatingState&lt;IN, OUT&gt;</code>: Applies a reduce or aggregate on each addition, storing only the accumulated result.</li>
</ul>

<h3>3.2.2. Operator State</h3>
<p>Operator State is per subtask, not tied to keys. Each parallel instance holds its own independent state. The typical use case is a source connector tracking partition assignments and offsets.</p>

<p>Both categories are managed by Flink: included in checkpoints, restored on failure, redistributed on rescale. Keyed state is redistributed through Key Groups, the atomic unit of state redistribution. The total number of Key Groups is fixed at the configured maximum parallelism. Each subtask is assigned a range of Key Groups, and when parallelism changes, those ranges are simply reassigned across the new set of subtasks.</p>

<h3>3.3. Snapshots and Checkpointing</h3>

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

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
<p>In <code>runtime/checkpoint/</code>, <code>runtime/io/network/api/</code></p>
<pre><code>CheckpointCoordinator,
CheckpointBarrier
</code></pre>

<p>In <code>streaming/api/checkpoint/</code>, <code>streaming/runtime/tasks/</code></p>
<pre><code>CheckpointedFunction,
SubtaskCheckpointCoordinator
</code></pre>
</details>

<h3>3.3.2. Aligned Checkpoint</h3>

<p>For operators with multiple inputs (like after a shuffle), the barrier must arrive from all input channels before the snapshot is taken. This is called barrier alignment, and it ensures that no pre-checkpoint and post-checkpoint data gets mixed. This alignment can briefly pause processing on the faster channels, which is a tradeoff explored further in unaligned checkpoints.</p>

<img class="center-image-0 center-image-75" src="./assets/posts/flink/flink-window-barrier.svg">

<p>While aligned checkpoint (default) guarantees a clean cut: the snapshot contains exactly the state that results from all records before the barrier and none after, the pausing can cause backpressure. If one channel is significantly faster than another, the fast channel's data backs up, stalling upstream operators.</p>

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
<p>In <code>streaming/runtime/io/checkpointing/</code></p>
<pre><code>SingleCheckpointBarrierHandler,
AbstractAlignedBarrierHandlerState,
AlternatingCollectingBarriersUnaligned
</code></pre>
</details>

<h3>3.3.3. Unaligned Checkpoint</h3>

<p>Instead of pausing, the operator reacts to the first barrier it sees from any channel. It immediately forwards the barrier downstream and continues processing all channels. The records that are already in the input/output buffers (in-flight data between the two barriers) are stored as part of the checkpoint state.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/flink/flink-unaligned-checkpoint.svg">

<p>The result: checkpoint duration becomes independent of throughput and alignment time. Barriers travel through the DAG as fast as possible. The tradeoff is larger checkpoint sizes (in-flight data is included) and more I/O.</p>

<p>Flink also supports a hybrid approach. Checkpoints start aligned, but if alignment takes longer than a configured timeout (<code>alignedCheckpointTimeout</code>), the operator switches to unaligned mid-checkpoint. This gets the benefits of aligned checkpoints under normal conditions while avoiding the stalling problem under backpressure.</p>

<p>Note: Unaligned checkpoints require exactly-once mode and only one concurrent checkpoint is allowed with unaligned mode.</p>

<h3>3.3.4. Incremental Checkpoints</h3>

<p>Full checkpoints upload the entire state every time. For an operator holding 10 GB of state where only 200 MB changed, uploading the full 10 GB is wasteful.</p>

<p>Incremental checkpoints exploit how RocksDB stores data. Writes go into an in-memory MemTable. When full, it flushes to disk as an immutable SST file (Sorted String Table). A background compaction process merges smaller SST files into larger ones, discarding duplicates. The key property: SST files are never modified after creation, only created (by flush) or deleted (by compaction).</p>

<p>Going back to the example job, the Window operator [2] buffers events in RocksDB until the 10 second window fires. With incremental checkpoints enabled and 2 retained checkpoints:</p>

<div style="width: 100%; overflow-x: auto;">
<img class="center-image-0 center-image-100" style="width: 135%; max-width: none; display: block;" src="./assets/posts/flink/flink-incremental-checkpoint.svg">
</div>

<p>Flink tracks which SST files are new or deleted between checkpoints and only uploads the delta.</p>

<p>The shared state registry tracks how many active checkpoints reference each file. When a checkpoint is pruned (retained count exceeded), Flink decrements the reference counts. Files that drop to 0 are deleted from storage.</p>

<p>The result: instead of uploading the full state each time, only new SST files are uploaded. The tradeoff is that recovery may need to reconstruct state from multiple incremental deltas, potentially making restores slower than with full checkpoints.</p>

<h3>3.3.5. Savepoint</h3>

<p>Savepoints use the same mechanism as checkpoints (barriers, state snapshots, source offsets) but are triggered manually by the user, not by the periodic scheduler.</p>

<p>The key differences:</p>

<ul>
<li><p>Always aligned: unaligned mode does not apply to savepoints.</p></li>

<li><p>Do not expire: checkpoints are automatically cleaned up when newer ones complete. Savepoints persist until explicitly deleted. Triggered on demand: via CLI (flink savepoint <code>jobID</code>) or REST API, not on a timer.</p></li>

<li><p>Portable format: savepoints use a standardized format that is compatible across state backends. A job checkpointed with HashMapStateBackend can be restored on EmbeddedRocksDBStateBackend from a savepoint.</p></li>
</ul>

<p>Savepoints are used for planned operations: upgrading application code, changing parallelism, migrating to a different cluster, or switching state backends. The workflow is: take a savepoint, stop the job, make changes, restart from the savepoint.</p>

<p>In the example job, if the parallelism of the Window operator needs to change from 2 to 4, a savepoint captures the current state (including Key Group assignments). On restart with the new parallelism, Flink redistributes the Key Groups across the 4 new subtasks and restores the state accordingly.</p>

<h3>3.4. Recovery</h3>

<p>When a failure occurs (TaskManager crash, network fault, user code exception, etc.), Flink stops the entire job and rolls back to the latest completed checkpoint.</p>

<p>The recovery process:</p>

<ul>
<li><p>The <code>JobManager</code> selects the most recent successfully completed checkpoint (all sinks acknowledged, all state stored durably).</p></li>
<li><p>All operators are redeployed across available <code>TaskManagers</code>.</p></li>
<li><p>Each operator's state is restored from the checkpoint storage (Remote File System, S3/HDFS). The window operator gets back its buffered events, aggregation operators get back their partial results.</p></li>
<li><p>Source operators rewind to the offsets recorded in the checkpoint. For Kafka, this means resetting the consumer to the checkpointed partition offsets.</p></li>
<li><p>Processing resumes from that point. Every record after the checkpoint offset is reprocessed, but since the state has been rolled back to match, the end result is as if the failure never happened.</p></li>
</ul>

<img class="center-image-0 center-image-75" src="./assets/posts/flink/flink-state-restore.svg">

<p>This is what gives Flink <code>exactly-once</code> processing semantics. Records between the checkpoint and the failure are reprocessed, but the state they are applied to has been rolled back to before those records were processed the first time. No double counting.</p>

<p>However, the source must support replay (rewinding to a previous position). Kafka, Kinesis, filesystem, etc., sources all support replay. If a source cannot rewind, exactly-once guarantees cannot be met.</p>

<h3>4. Time</h3>
<p>There are three notions of time:</p>

<ul>
<li><p>Event Time: The timestamp embedded in the event itself, representing when the event actually occurred. A sensor reading generated at <code>14:00:03</code> carries that timestamp regardless of when Flink processes it.</p></li>
<li><p>Processing Time: The wall clock of the machine running the operator at the moment it processes the event. Simple and fast, but non-deterministic. The same data replayed at a different speed produces different results.</p></li>
<li><p>Ingestion Time: The timestamp assigned when the event enters Flink. More stable than processing time, but still does not reflect actual event occurrence.</p></li>
</ul>

<img class="center-image-0 center-image-90" src="./assets/posts/flink/flink-times.svg">

<p>In the example job, <code>TumblingEventTimeWindows.of(Time.seconds(10))</code> uses event time. The window boundaries are determined by the timestamps in the data, not by when the records happen to arrive. This makes the results deterministic and reproducible.</p>

<h3>4.1. Disorder Problem</h3>

<p>Processing time is always monotonically increasing, the wall clock only moves forward. Event time has no such guarantee. In distributed systems, events produced in order can arrive at Flink out of order due to network delays, partitioning, or upstream buffering.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/flink/flink-disorder.svg">

<p>A window covering <code>t=1</code> to <code>t=5</code> cannot simply close when it sees <code>t=6</code>, because <code>t=4</code> or <code>t=5</code> might still be in transit. The system needs a way to know when it is safe to fire the window.</p>

<h3>4.2. Watermarks</h3>

<p>Watermarks are Flink's solution to the disorder problem. A watermark is a special marker that flows through the data stream carrying a timestamp <code>t</code>. It declares: "no more events with a <code>timestamp ≤ t</code> will arrive."</p>

<img class="center-image-0 center-image-80" src="./assets/posts/flink/flink-watermarks.svg">

<p>When the window operator receives a watermark that passes the window's end time, it knows the window is complete and fires it. Until that watermark arrives, the window holds its state.</p>

<p>Watermarks flow inline with the data, just like checkpoint barriers. At operators with multiple inputs (after a shuffle), the effective watermark is the minimum across all input channels. The stream can only be as far along in event time as its slowest input.</p>

<p>The gap between the actual event time and the watermark is called the bounded out of orderness. A larger gap tolerates more disorder but increases latency (windows fire later) and state lifetime (buffered data is held longer).</p>

<h3>4.3. Timers</h3>

<p>Operators can register timers for a future point in event time or processing time. When the watermark (for event time) or the wall clock (for processing time) reaches the registered timestamp, the timer fires and triggers a callback.</p>

<p>Windows use timers internally. When a new window is created, the window operator registers an event time timer for the window's end time. When the watermark passes that time, the timer fires and the window emits its result.</p>

<p>Custom operators using <code>ProcessFunction</code> can register their own timers for use cases like session timeouts, delayed cleanup of expired state, or triggering periodic aggregations.</p>

<details class="text-container"><summary class="p"> &nbsp;Relevant Packages and Classes</summary>
<p>In <code>flink-core/api/common/eventtime/</code></p>
<pre><code>WatermarkStrategy,
WatermarkGenerator
</code></pre>

<p>In <code>streaming/runtime/operators/</code>, <code>streaming/api/operators/</code></p>
<pre><code>TimestampsAndWatermarksOperator,
InternalTimerService
</code></pre>
</details>

<h3>5. Runtime</h3>

<p>A running Flink cluster consists of two types of JVM processes: one <code>JobManager</code> and one or more <code>TaskManagers</code>.</p>

<img class="center-image-0 center-image-45" src="./assets/posts/flink/flink-runtime.svg">

<h3>5.1. Job Manager</h3>

<p>The <code>JobManager</code> is the control plane. It contains three RPC endpoints running in the same JVM. TaskManagers are the data plane: worker processes that execute tasks. Communication between them splits into two layers: <code>Pekko</code> for control messages (scheduling, heartbeats, checkpoint triggers) and <code>Netty</code> for actual data exchange between tasks.</p>

<h3>5.1.1. Dispatcher</h3>

<p>The <code>Dispatcher</code> is the entry point for the cluster. It exposes the REST API, receives job submissions, and serves the Flink Web UI.</p>

<p>When a job arrives, the Dispatcher persists it durably via the <code>ExecutionPlanWriter</code> (backed by ZooKeeper or Kubernetes ConfigMaps in HA setups), then creates a <code>JobManagerRunner</code> which starts a <code>JobMaster</code> for that job. This persist-before-run design is what makes HA recovery possible: if the <code>JobManager</code> crashes and a new leader takes over, the new Dispatcher recovers persisted jobs from storage and re-creates their JobMasters.</p>

<p>In a session cluster, the Dispatcher lives for the lifetime of the cluster and handles multiple jobs. In application mode, it is scoped to a single application.</p>

<p>The Dispatcher also participates in leader election. A <code>DispatcherLeaderProcess</code> monitors whether this JobManager is the current leader. On gaining leadership, it reads recovered jobs from the <code>ExecutionPlanStore</code> and recovered dirty job results from the <code>JobResultStore</code>, then creates the actual Dispatcher instance with that recovery state.</p>

<h3>5.1.2. Resource Manager</h3>

<p>The ResourceManager owns the cluster's slot inventory. It maintains a registry of all TaskManagers and their slots, and a <code>SlotManager</code> that matches slot requests from JobMasters against available slots.</p>

<p>The flow:</p>
<ul>
<li><p>TaskManagers start up and register with the <code>ResourceManager</code> via RPC, reporting how many slots they offer and each slot's <code>ResourceProfile</code> (CPU, memory).</p></li>
<li><p>When a <code>JobMaster</code> needs slots, it declares resource requirements to the ResourceManager.</p></li>
<li><p>The <code>SlotManager</code> checks if existing free slots can satisfy the request. If yes, it sends an <code>requestSlot</code> RPC to the TaskManager, telling it to allocate that slot for the specific job.</p></li>
<li><p>If not enough free slots exist and the ResourceManager is backed by an active resource provider (Kubernetes, YARN), it requests new TaskManagers from the provider. In standalone mode, it can only wait for TaskManagers to register on their own.</p></li>
</ul>

<p>The <code>ResourceManager</code> also monitors TaskManager health through heartbeats. If a TaskManager misses heartbeats, the ResourceManager declares it dead, removes its slots from the inventory, and notifies affected JobMasters.
Importantly, the ResourceManager knows nothing about job logic. It deals purely in slots: who has them, who needs them, and how to provision more.</p>

<p>Slot Allocation Flow:</p>
<img class="center-image-0 center-image-90" src="./assets/posts/flink/flink-allocation-flow.svg">

<h3>5.1.3. Job Master</h3>

<p>One <code>JobMaster</code> per running job. This is where the actual job execution is managed. Internally it contains two critical components:</p>

<h3>5.1.3a. Scheduler</h3>
<p>Scheduler decides when and where to deploy tasks. There are multiple scheduler implementations, such as:</p>
<ul>
<li><code>DefaultScheduler</code> with <code>PipelinedRegionSchedulingStrategy</code> for streaming</li>
<li><code>AdaptiveBatchScheduler</code> for batch workloads</li>
<li><code>AdaptiveScheduler</code> for reactive scaling (adjusts parallelism based on available slots)</li>
</ul>

<p>The scheduler works with the <code>SlotPool</code>, which is the JobMaster's local view of allocated slots. The SlotPool uses a declarative resource model: it declares how many slots of what profile it needs, the <code>ResourceManager</code> fulfills them, and TaskManagers offer the allocated slots back to the JobMaster. Once slots are available, the scheduler assigns <code>ExecutionVertex</code> instances to them and triggers deployment.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/flink/flink-jobmaster.svg">

<p>For a pure streaming job like <code>MyJob</code>, the entire job is one pipelined region. On scheduling start, it finds all source regions and schedules them. Since everything is one region, all tasks launch at once.<p>

<p>For batch jobs with blocking shuffle boundaries, each stage is a separate region. Source regions are scheduled first. Downstream regions are scheduled only when their upstream blocking partitions become consumable. This saves resources by not starting downstream tasks that have nothing to consume yet.</p>

<h3>5.1.3b. Checkpoint Coordinator</h3>

<p><code>CheckpointCoordinator</code>: triggers checkpoint barriers, tracks acknowledgements from all tasks, manages completed checkpoint metadata, and decides when to discard old checkpoints. This is the component that drives the entire checkpointing flow described in the earlier State section.</p>

<p>The <code>JobMaster</code> also handles failure recovery. When a task fails, it consults a <code>FailoverStrategy</code> (typically <code>RestartPipelinedRegionFailoverStrategy</code>) to determine which tasks need to be restarted, cancels them, and redeploys from the last checkpoint.</p>

<h3>5.1.4. Job Lifecycle</h3>

<p>A job, once accepted by the <code>Dispatcher</code>, moves through a state machine managed by the <code>JobStatus</code>. The typical happy path is straightforward: <code>INITIALIZING → CREATED → RUNNING → FINISHED</code></p> 

<ul>
<li><p><code>INITIALIZING</code>: The Dispatcher has received the job, but the JobMaster has not yet gained leadership or been fully created.</p></li>
<li><p><code>CREATED</code>: The JobMaster is ready. No tasks have been scheduled yet.</p></li>
<li><p><code>RUNNING</code>: At least some tasks are scheduled or executing. The job stays in this state until all tasks finish.</p></li>
<li><p><code>FINISHED</code>: All tasks completed successfully.</p></li>
</ul>

<p>When a task fails during execution, the Scheduler evaluates whether the error is recoverable. If it is, the affected tasks are restarted. The job itself stays in <code>RUNNING</code> while individual tasks are restarted at the region level.</p>

<p>If the failure is unrecoverable (or restart attempts are exhausted), the job transitions through: <code>RUNNING → FAILING → FAILED</code>. <code>FAILING</code> cancels all remaining tasks. Once every task reaches a terminal state, the job moves to <code>FAILED</code> and exits.</p>

<p>When a user manually cancels a job (via the Web UI or CLI): <code>RUNNING → CANCELLING → CANCELED</code>. <code>CANCELLING</code> cancels all tasks. Once all tasks are in a terminal state, the job enters <code>CANCELED</code>.</p>

<p>Suspension (HA only): <code>RUNNING → SUSPENDED</code>. <code>SUSPENDED</code> only occurs when high availability is configured and the JobMaster loses leadership. The job is not removed from the HA store, it just means this particular JobMaster has stopped managing it. Another <code>JobMaster</code> (or the same one after regaining leadership) will pick the job back up and restart it.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/flink/flink-job-cycle.svg">

<h3>5.2. Task Manager</h3>

<p>The <code>TaskManager</code> is a JVM process that does the actual data processing. In Flink, this process is called <code>TaskExecutor</code>. Each cluster has one or more TaskExecutors, and each one registers with the <code>ResourceManager</code> on startup by sending a <code>SlotReport</code> listing all available task slots.</p>

<h3>5.2.1. Task Slots</h3>

<p>A <code>TaskExecutor</code> divides its resources into a fixed number of task slots. Each slot is a resource container with its own <code>MemoryManager</code> and a defined <code>ResourceProfile</code> (CPU, memory). The number of slots is configured via <code>taskmanager.numberOfTaskSlots</code>.</p>

<p>A slot goes through a lifecycle of states: <code>ALLOCATED → ACTIVE → RELEASING → (freed)</code></p>
<p><code>ALLOCATED</code> means the <code>ResourceManager</code> has assigned it to a job, but the <code>JobMaster</code> has not yet started using it. <code>ACTIVE</code> means the slot is in use and tasks can be added to it. <code>RELEASING</code> means the tasks inside it have failed or finished and it is waiting to be fully emptied before it can be freed.</p>

<p>The important detail: a slot can hold multiple tasks. The tasks map inside <code>TaskSlot</code> is keyed by <code>ExecutionAttemptID</code>, meaning multiple operator subtasks can share a single slot. This is where slot sharing comes in.</p>

<h3>5.2.2. Slot Sharing</h3>

<p>By default, Flink places all operators of a job into the same <code>SlotSharingGroup</code>. This means one subtask from each operator in the pipeline can be co-located in a single slot. For the running <code>MyJob</code> example:</p>

<img class="center-image-0 center-image-70" src="./assets/posts/flink/flink-task-slot.svg">

<p>The design motivation is twofold. First, it means a job with N pipeline stages does not need <code>N × parallelism</code> slots. The number of slots needed equals the maximum parallelism across all operators (here: 2). Second, co-locating a full pipeline slice in one slot enables forward connections to stay local (in-memory data exchange, no network serialization).</p>

<h3>5.2.3. Task Execution Model</h3>

<p>Each task runs in a dedicated thread and typically follows a simple internal pipeline: <code>InputGate(s) → OperatorChain → ResultPartition(s)</code></p>

<p>The task reads records from its <code>InputGate</code>, passes them through the <code>OperatorChain</code> (the chained operators from the JobGraph), and writes output to its <code>ResultPartition</code>. Source tasks are the exception: they generate data directly, with no <code>InputGate</code>.</p>

<p>A <code>ResultPartition</code> is divided into <code>SubPartitions</code>, one per downstream consumer subtask. An InputGate is composed of InputChannels, one per upstream producer subtask.</p>

<p>The data exchange between ResultPartitions and InputGates goes through the <code>ShuffleService</code>. The default implementation is <code>NettyShuffleService</code>. If the producer and consumer are in the same <code>TaskManager</code>, data can be exchanged locally without going over the network.</p>

<p>For MyJob (Source+Map chained, parallelism 2 → Window parallelism 2 → Sink parallelism 1):</p>

<img class="center-image-0 center-image-50" src="./assets/posts/flink/flink-task-execution-model.svg">

<p>Source and Map are chained, so they share a thread with no serialization between them. The <code>keyBy</code> triggers an all-to-all shuffle: each SourceMap subtask's ResultPartition has 2 SubPartitions (one per Window subtask), and each Window subtask's InputGate has 2 InputChannels (one per SourceMap subtask).</p> 

<p>Records are hashed by key and routed to the SubPartition responsible for that key group. Window to Sink has a parallelism change (2 → 1), so each Window subtask's ResultPartition has only 1 SubPartition (the single Sink), and the Sink's <code>InputGate</code> has 2 InputChannels (one per Window subtask).</p>

<h3>5.2.4. Task Executor Services</h3>

<p>In the post <code>TaskManager</code> and <code>TaskExecutor</code> may have been used interchangeably. To clarify, <code>TaskManager</code> is the process (the JVM). <code>TaskExecutor</code> is the main class running inside that process. In practice they refer to the same thing, but at different levels of abstraction.</p>

<p>When a TaskManager process starts, it initializes a set of shared services before any task is deployed. These services live for the lifetime of the process and are shared across all tasks running in it. They fall into a few categories.</p>

<img class="center-image-0 center-image-65" src="./assets/posts/flink/flink-task-executor-services-1.svg">

<p>Slot Management is central. The TaskSlotTable tracks which slots exist, which are free, and which tasks are running in each slot. The JobTable maps each active JobID to its JobMaster connection, so the TaskManager knows which JobMaster to report to for each task. The JobLeaderService monitors leadership changes for each job, so if a JobMaster fails over, the TaskManager reconnects to the new leader.</p>

<p>Network and Shuffle handles all data exchange. The ShuffleEnvironment (default: Netty based) owns the buffer pools, creates ResultPartitions for task output and InputGates for task input. This is where credit based flow control and backpressure happen. The PartitionTracker keeps track of which result partitions this TaskManager has produced, so they can be released when no longer needed.</p>

<p>Memory is split into managed off-heap memory (SharedResources) and disk spill (IOManager). State backends like RocksDB/ForSt and operators that sort or hash data use managed memory. The IOManager provides temporary file channels for spilling when memory is exhausted.</p>

<p>State and Checkpointing services support fault tolerance. The LocalStateStoresManager maintains local copies of state on disk for faster recovery (instead of always fetching from the distributed checkpoint store). The FileMergingManager is a newer optimization that merges many small checkpoint files into fewer larger ones to reduce file system pressure. The ChangelogStoragesManager supports the changelog state backend. The ChannelStateExecutorFactory handles snapshotting in-flight network buffers for unaligned checkpoints.</p>

<img class="center-image-0 center-image-65" src="./assets/posts/flink/flink-task-executor-services-2.svg">

<p>Classloading and Artifacts manages user code isolation. The LibraryCacheManager maintains per-job classloaders so that different jobs running on the same TaskManager do not interfere with each other. The BlobService downloads JAR files from the central BlobServer on the JobManager side. The FileCache handles files registered through the distributed cache API.</p>

<p>Connectivity keeps the TaskManager linked to the cluster. Two heartbeat managers run continuously: one toward the ResourceManager (reporting slot availability and resource usage) and one toward each JobMaster (reporting task status and metrics). If heartbeats stop, the other side assumes the TaskManager is dead and triggers failover. HAServices handles leader discovery so the TaskManager always knows who the current ResourceManager leader is.</p>

<p>When a task gets deployed into a slot, it receives references to these shared services. It does not create its own network stack or memory manager. This is why all tasks in the same TaskManager share the same buffer pool, the same managed memory segment, and the same heartbeat connections.</p>

