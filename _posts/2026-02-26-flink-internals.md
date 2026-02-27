---
layout: post
title: "Apache Flink Internals"
date: 2026-02-26
tags:
- Realtime
author: Adesh Nalpet Adimurthy
category: System Wisdom
---

<p>Most blog posts on Flink's internals and architecture, even the official documentation, tend to be fragmented across different examples and cover components in isolation. The approach taken here is to follow a single reference Flink job end-to-end, through every component and moving part it touches, keeping the discussion grounded in the example, rather than attempting broad coverage of Flink's full capabilities. The tradeoff is intentional: depth over breadth.</p>

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

<p>Source and Map chain together (same parallelism, forward edge). The keyBy between Map and Window introduces a hash partitioner, a shuffle boundary, so those two cannot chain. Window and Sink also cannot chain because their parallelism differs (2 vs 1). That gives three JobVertices.</p>

<p>4 operators → 3 JobVertices. Chaining reduces the number of network exchanges and avoids unnecessary serialization within a chain.</p>

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

<p>There is also an third option (gaining popularity), <code>ForStStateBackend</code>, built on <code>ForSt</code> (a fork of RocksDB). It stores SST files on remote storage (S3, HDFS) instead of local disk (outside of local cache), allowing state to exceed local disk capacity entirely. Designed for disaggregated, cloud native setups and supports asynchronous state access.</p>

<p>Note: <code>ForStStateBackend</code> does not support canonical savepoint, full snapshot, changelog and file-merging checkpoints</p>

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
<p>Keyed State is partitioned by key. In the example job, the <code>keyBy(...)</code> before the window means each window subtask only processes events for its assigned keys. The window operator internally uses keyed state to buffer incoming events until the window fires. In `MyJob` that buffer is a <code>ListState</code> scoped to each key, stored in whichever state backend is configured.</p>

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

<h3>3.3.1. Checkpoint Barriers</h3>

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

<p>Note, Unaligned checkpoints:</p>
<ul>
<li><p>require exactly-once mode and only one concurrent checkpoint is allowed with unaligned mode. So they will take slightly longer.</p></li>
<li><p>break with an implicit guarantee in respect to watermarks during recovery. On recovery, Flink generates watermarks after it restores in-flight data, which means pipelines that apply the latest watermark on each record may produce different results than with aligned checkpoints.</p></li>
</ul>

<p>Flink also supports a hybrid approach. Checkpoints start aligned, but if alignment takes longer than a configured timeout (<code>execution.checkpointing.aligned-checkpoint-timeout</code>), the operator switches to unaligned mid-checkpoint. This gets the benefits of aligned checkpoints under normal conditions while avoiding the stalling problem under backpressure.</p>



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

<li><p>Portable format: savepoints can be created in canonical format, a standardized representation that is compatible across state backends. A job checkpointed with <code>HashMapStateBackend</code> can be restored on <code>EmbeddedRocksDBStateBackend</code> from a canonical savepoint. Native format (default and preferred) is faster to create and restore but is tied to the specific state backend and does not support cross-backend restoration.</p></li>
</ul>

<p>Savepoints are used for planned operations: upgrading application code, changing parallelism, migrating to a different cluster, or switching state backends. The workflow is: take a savepoint, stop the job, make changes, restart from the savepoint.</p>

<p>In the example job, if the parallelism of the Window operator needs to change from 2 to 4, a savepoint captures the current state (including Key Group assignments). On restart with the new parallelism, Flink redistributes the Key Groups across the 4 new subtasks and restores the state accordingly.</p>

<h3>3.4. Recovery</h3>

<p>When a failure occurs (TaskManager crash, network fault, user code exception, etc.), Flink stops the affected pipeline region (which for a single-region streaming job like this example, means the entire job) and rolls back to the latest completed checkpoint.</p>

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
<li><p>Event Time (most common): The timestamp embedded in the event itself, representing when the event actually occurred. A sensor reading generated at <code>14:00:03</code> carries that timestamp regardless of when Flink processes it.</p></li>
<li><p>Processing Time: The wall clock of the machine running the operator at the moment it processes the event. Simple and fast, but non-deterministic. The same data replayed at a different speed produces different results.</p></li>
<li><p>Ingestion Time (least common/discouraged): The timestamp assigned when the event enters Flink. More stable than processing time, but still does not reflect actual event occurrence.</p></li>
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

<p>The <code>JobManager</code> is the control plane. It contains three RPC endpoints running in the same JVM. TaskManagers are the data plane: worker processes that execute tasks. Communication between them splits into two layers: <code>Pekko</code> (formerly Akka) for control messages (scheduling, heartbeats, checkpoint triggers) and <code>Netty</code> for actual data exchange between tasks.</p>

<h3>5.1.1. Dispatcher</h3>

<p>The <code>Dispatcher</code> is the entry point for the cluster. It exposes the REST API, receives job submissions, and serves the Flink Web UI.</p>

<p>When a job arrives, the Dispatcher persists it durably via the <code>ExecutionPlanWriter</code>, then creates a <code>JobManagerRunner</code> which starts a <code>JobMaster</code> for that job. This persist-before-run design is what makes HA recovery possible: if the <code>JobManager</code> crashes and a new leader takes over, the new Dispatcher recovers persisted jobs from storage and re-creates their JobMasters.</p>

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

<p>A slot has three states: <code>ALLOCATED</code> (assigned to a job by the ResourceManager, not yet in use by the JobMaster), <code>ACTIVE</code> (in use, tasks can be added), and <code>RELEASING</code> (tasks have failed, waiting to be fully emptied before the slot is freed).</p>

<p>The important detail: a slot can hold multiple tasks. The tasks map inside <code>TaskSlot</code> is keyed by <code>ExecutionAttemptID</code>, meaning multiple operator subtasks can share a single slot. This is where slot sharing comes in.</p>

<h3>5.2.2. Task Slot Sharing</h3>

<p>By default, Flink places all operators of a job into the same <code>SlotSharingGroup</code>. This means one subtask from each operator in the pipeline can be co-located in a single slot. For the running <code>MyJob</code> example:</p>

<img class="center-image-0 center-image-70" src="./assets/posts/flink/flink-task-slot.svg">

<p>The design motivation is twofold. First, it means a job with N pipeline stages does not need <code>N × parallelism</code> slots. The number of slots needed equals the maximum parallelism across all operators (here: 2). Second, co-locating a full pipeline slice in one slot enables forward connections to stay local (in-memory data exchange, no network serialization).</p>

<h3>5.2.3. Task Execution Model</h3>

<p>Each task runs in a dedicated thread and typically follows a simple internal pipeline: <code>InputGate(s) → OperatorChain → ResultPartition(s)</code></p>

<p>The task reads records from its <code>InputGate</code>, passes them through the <code>OperatorChain</code> (the chained operators from the JobGraph), and writes output to its <code>ResultPartition</code>. Source tasks are the exception: they generate data directly, with no <code>InputGate</code>.</p>

<p>A <code>ResultPartition</code> is divided into <code>SubPartitions</code>, one per downstream consumer subtask. An InputGate is composed of InputChannels, one per upstream producer subtask.</p>

<p>The data exchange between ResultPartitions and InputGates goes through the <code>ShuffleEnvironment</code>. The default implementation is <code>NettyShuffleEnvironment</code>. If the producer and consumer are in the same <code>TaskManager</code>, data can be exchanged locally without going over the network.</p>

<p>For MyJob (Source+Map chained, parallelism 2 → Window parallelism 2 → Sink parallelism 1):</p>

<img class="center-image-0 center-image-50" src="./assets/posts/flink/flink-task-execution-model.svg">

<p>Source and Map are chained, so they share a thread with no serialization between them. The <code>keyBy</code> triggers an all-to-all shuffle: each SourceMap subtask's ResultPartition has 2 SubPartitions (one per Window subtask), and each Window subtask's InputGate has 2 InputChannels (one per SourceMap subtask).</p> 

<p>Records are hashed by key and routed to the SubPartition responsible for that key group. Window to Sink has a parallelism change (2 → 1), so each Window subtask's ResultPartition has only 1 SubPartition (the single Sink), and the Sink's <code>InputGate</code> has 2 InputChannels (one per Window subtask).</p>

<h3>5.2.4. Task Manager Services</h3>

<p>In the post <code>TaskManager</code> and <code>TaskExecutor</code> may have been used interchangeably. To clarify, <code>TaskManager</code> is the process (the JVM). <code>TaskExecutor</code> is the main class running inside that process. In practice they refer to the same thing, but at different levels of abstraction.</p>

<p>When a TaskManager process starts, it initializes a set of shared services before any task is deployed. These services live for the lifetime of the process and are shared across all tasks running in it. They fall into a few categories.</p>

<p><b>Slot Management</b> is central. The <code>TaskSlotTable</code> tracks which slots exist, which are free, and which tasks are running in each slot. The <code>JobTable</code> maps each active JobID to its <code>JobMaster</code> connection, so the <code>TaskManager</code> knows which JobMaster to report to for each task. The <code>JobLeaderService</code> monitors leadership changes for each job, so if a JobMaster fails over, the TaskManager reconnects to the new leader.</p>

<p><b>Network and Shuffle</b> handles all data exchange. The <code>ShuffleEnvironment</code> (default: Netty) owns the buffer pools, creates <code>ResultPartitions</code> for task output and <code>InputGates</code> for task input. This is where credit based flow control and backpressure happen. The <code>TaskExecutorPartitionTracker</code> keeps track of which result partitions this TaskManager has produced, so they can be released when no longer needed.</p>

<p><b>Memory</b> is handled by the per-slot <code>MemoryManager</code> (managed off-heap memory) and the <code>IOManager</code> (disk spill). Within managed memory, <code>SharedResources</code> enables reference-counted sharing of resources like RocksDB caches across operators in the same slot. State backends like RocksDB/ForSt and operators that sort or hash data use managed memory. The <code>IOManager</code> provides temporary file channels for spilling when memory is exhausted.</p>

<img class="center-image-0 center-image-65" src="./assets/posts/flink/flink-task-executor-services.svg">

<p><b>State and Checkpointing</b> services support fault tolerance. The <code>LocalStateStoresManager</code> maintains local copies of state on disk for faster recovery (instead of always fetching from the distributed checkpoint store). The <code>FileMergingManager</code> is a newer optimization that merges many small checkpoint files into fewer larger ones to reduce file system pressure. The <code>ChangelogStoragesManager</code> supports the changelog state backend. The <code>ChannelStateExecutorFactory</code> handles snapshotting in-flight network buffers for unaligned checkpoints.</p>

<p><b>Classloading and Artifacts</b> manages user code isolation. The <code>LibraryCacheManager</code> maintains per-job classloaders so that different jobs running on the same TaskManager do not interfere with each other. The <code>PermanentBlobService</code> downloads JAR files from the central <code>BlobServer</code> on the JobManager side. The <code>FileCache</code> handles files registered through the distributed cache API.</p>

<p><b>Connectivity</b> keeps the TaskManager linked to the cluster. Two heartbeat managers run continuously: one toward the <code>ResourceManager</code> (reporting slot availability and resource usage) and one toward each JobMaster (reporting task status and metrics). If heartbeats stop, the other side assumes the TaskManager is dead and triggers failover. <code>HAServices</code> handles leader discovery so the TaskManager always knows who the current ResourceManager leader is.</p>

<p>When a task gets deployed into a slot, it receives references to these shared services. It does not create its own network stack. The <code>NetworkBufferPool</code> is shared across all tasks in the TaskManager, though each task gets its own <code>LocalBufferPool</code> drawn from it. Managed memory is scoped per slot: all tasks sharing a slot through slot sharing share the same <code>MemoryManager</code>, but tasks in different slots have independent memory budgets. Heartbeat connections are shared across the entire TaskManager process.</p>

<h3>5.2.5. Task Manager Memory</h3>

<p>A <code>TaskManager</code> is a single JVM process. Its total memory is carved into strictly defined regions at startup, each serving a different purpose. Unlike a typical Java application where the JVM manages one undifferentiated heap, Flink explicitly budgets every byte.</p>

<p>The first distinction is between what Flink controls (Total Flink Memory) and what the JVM needs for itself (Metaspace and Overhead). Together they form Total Process Memory, which is the container or process limit. When deploying on YARN or Kubernetes, Flink uses Total Process Memory to calculate the container request size.</p>

<p>Within Total Flink Memory, the heap is split into Framework and Task. Both live in the same JVM heap at runtime; Flink does not enforce isolation between them. The separation exists for budgeting: it ensures the framework always has enough headroom for coordination even when user code is memory intensive. Task Heap has no fixed default because it is the remainder after every other component is subtracted from Total Flink Memory.</p>

<img class="center-image-0 center-image-75" src="./assets/posts/flink/flink-total-memory.svg">

<p>The off-heap region covers Framework Off-Heap, Task Off-Heap, and Network Memory. All three are counted toward <code>-XX:MaxDirectMemorySize</code>. Network Memory is allocated as JVM direct memory (<code>ByteBuffer.allocateDirect()</code>), used exclusively for the network buffer pool that moves data between tasks. Framework and Task Off-Heap budget for both JVM direct memory and native memory; Flink counts their full configured amount toward the JVM direct memory limit as a conservative measure.</p>

<p>Managed Memory in practice is scoped per slot, not per task. Each slot gets its own <code>MemoryManager</code> with a budget of total managed memory divided by the number of slots. All tasks sharing a slot (through slot sharing) share this budget. For the <code>MyJob</code> example:</p>

<img class="center-image-0 center-image-75" src="./assets/posts/flink/flink-task-memory-budget.svg">

<p>Managed Memory is different: it lives outside JVM direct memory entirely. For stateful operators using RocksDB, Flink reserves a budget and RocksDB allocates its own native memory through JNI. (invisible to <code>-XX:MaxDirectMemorySize</code>). This means Managed Memory and Network Memory never compete for the same JVM budget, and the state backend (RocksDB/ForSt) cannot accidentally starve the network layer.</p>

<p>The tradeoff is that if Managed Memory is misconfigured and the process exceeds its container limit, the OS kills the process rather than the JVM throwing a catchable exception.</p>


<h3>5.3. Network</h3>

<p>Flink's network stack sits inside flink-runtime and connects all subtasks across TaskManagers. It is the layer through which all shuffled data flows, making it a primary factor in both throughput and latency. Coordination between TaskManagers and the JobManager uses RPC (Pekko). Data transport between subtasks uses a lower level API built on Netty.</p>

<h3>5.3.1. Physical Transport</h3>

<p>In the example job, <code>keyBy()</code> introduces a network shuffle between <code>SourceMap</code> and <code>Window</code>. Records can no longer stay local to the subtask that produced them. Each record is hashed by its key and routed to whichever Window subtask is responsible for that key group. This is a full all-to-all connection: every SourceMap subtask must be able to send to every Window subtask.</p>

<p>As covered in the Task Execution Model, slot sharing places each pipeline slice into a single slot. With a small twist for this section, the two slots sit on two different TaskManagers. This means some connections are <code>local</code> (same TM) and some are <code>remote</code> (cross-TM, over TCP via Netty).</p>

<p>Whether a connection is local or remote depends entirely on where the subtasks land:</p>
<img class="center-image-0 center-image-75" src="./assets/posts/flink/flink-example-recap.svg">

<p>Each remote connection gets its own <code>TCP</code> channel. Consider a higher parallelism, i.e. parallelism 4 across two TaskManagers offering 2 slots each, multiple subtasks of the same task share a <code>TaskManager</code>. Their remote connections toward the same destination TaskManager are then multiplexed over a single TCP channel, reducing resource usage.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/flink/flink-tcp-channel.svg">

<p>Each subtask's output is a <code>ResultPartition</code>, split into <code>ResultSubpartitions</code>, one per downstream consumer. In the example, each SourceMap subtask has a <code>ResultPartition</code> with 4 ResultSubpartitions (one for each Window subtask). Each Window subtask has a ResultPartition with 1 ResultSubpartition (the single Sink subtask).</p>

<p>On the receiving side, each subtask reads from an <code>InputGate</code> containing <code>InputChannels</code>, one per upstream producer. Each Window subtask's InputGate has 4 InputChannels (one from each SourceMap subtask). Sink's InputGate has 4 InputChannels (one from each Window subtask).</p>

<p>At this layer, Flink no longer deals with individual records. Data is serialized and packed into network buffers. Each subtask has its own local buffer pool, one on the sending side and one on the receiving side, bounded by: <code>#channels × buffers-per-channel + floating-buffers-per-gate</code></p>

<p>With defaults of 2 exclusive buffers per channel and 8 floating buffers per gate, each Window subtask's receiving buffer pool is capped at <code>4 × 2 + 8 = 16</code> buffers. These are drawn from the <code>NetworkBufferPool</code> covered in the Memory Model section.</p>

<h3>5.3.2. Credit-based Flow Control</h3>

<p>Since all logical channels between two TaskManagers are multiplexed over a single TCP connection, a slow receiver on one channel could stall the connection entirely, throttling every other subtask sharing the wire. Credit-based flow control solves this by tracking buffer availability per logical channel, keeping backpressure isolated.</p>

<p>The core rule: a sender may only forward a buffer if the receiver has announced capacity for it. <code>1 buffer = 1 credit</code>.</p>

<p>On the receiving side, each remote input channel has two kinds of buffers:</p>
<ul>
<li>Exclusive buffers (2 per channel): permanently assigned, never shared.</li>
<li>Floating buffers (8 per gate): shared across all channels in the gate, borrowed on demand.</li>
</ul>

<img class="center-image-0 center-image-90" src="./assets/posts/flink/flink-flow-control.svg">

<p>If there are not enough floating buffers available globally, each buffer pool gets a share proportional to its capacity of whatever is available. The cycle:</p>

<ul>
<li><p>When a channel is established, the receiver announces its exclusive buffers as initial credits.</p></li>
<li><p>The sender tracks the credit score per subpartition. Each sent buffer decrements the credit by one. No credit, no sending.</p></li>
<li><p>Each buffer sent also carries the sender's current backlog size, how many buffers are still waiting in that subpartition's queue.</p></li>
<li><p>The receiver uses the backlog to request floating buffers from the gate's shared pool. It may get all, some, or none. If none are available, it registers as a listener and gets notified when one is recycled.</p></li>
<li><p>Every newly acquired buffer is announced back to the sender as a fresh credit, and the cycle continues.</p></li>
</ul>

<p>If a receiver falls behind, its credits eventually hit 0. The sender stops forwarding buffers for that channel only. The TCP connection stays open, other channels on it continue normally. In the example: if one Window subtask on TM2 falls behind, its credit drops to 0. The SourceMap subtasks stop sending to it but keep sending to every other Window subtask. The shared TCP connection between TM1 and TM2 is never blocked.</p>

<p>Because one channel in a multiplex can no longer block another, overall resource utilization improves. Full control over how much data is "on the wire" also improves checkpoint alignment. Without flow control, a stalled receiver would still have the lower network stack's internal buffers filling up, and checkpoint barriers would queue behind all of that data, waiting for it to drain before alignment could begin. With credit-based control, there is far less data sitting in transit, so barriers propagate faster.</p>

<h3>5.3.3. Buffer Flushing</h3>

<p>The <code>RecordWriter</code> serializes each record into bytes on the heap, then writes those bytes into the network buffer currently assigned to the target subpartition. If the record doesn't fit, the remaining bytes spill into a new buffer. The deserializer on the receiving side (<code>SpillingAdaptiveSpanningRecordDeserializer</code>) handles reassembly, including records that span multiple 32 KB buffers.</p>

<p>A buffer becomes available for <code>Netty</code> to consume in three situations:</p>
<ul>
<li><p>Buffer full: the writer finishes the buffer and requests a new one. The finished buffer is added to the subpartition queue, which notifies Netty.</p></li>
<li><p>Buffer timeout: a background thread (<code>OutputFlusher</code>) periodically calls flush (default: every 100ms, configured via <code>execution.buffer-timeout.interval</code>). This notifies Netty to consume whatever has been written so far without closing the buffer. The buffer stays in the queue and keeps accumulating more data from the writer side.</p></li>
<li><p>Special event: checkpoint barriers, end-of-partition events, etc. These finish all in-progress buffers immediately and add the event to every subpartition.</p></li>
</ul>

<img class="center-image-0 center-image-100" src="./assets/posts/flink/flink-buffer-flushing.svg">

<p>The buffer is added to the subpartition queue while still being written to (via the <code>BufferBuilder</code> / <code>BufferConsumer</code> pair). The writer appends through the <code>BufferBuilder</code>, Netty reads through the BufferConsumer. This avoids synchronization on every record, the two sides only coordinate through the buffer's reader and writer indices.</p>

<p>In low-throughput scenarios, the output flusher drives latency. In high-throughput scenarios, buffers fill up before the flusher fires and the system self-adjusts.</p>

<h3>6. End to End</h3>

<p>The very first section introduced the high-level picture: Client, JobManager, TaskManagers. Here is the same diagram, redrawn with everything covered since.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/flink/flink-end-to-end.svg">

<p>If you made it this far, you now have a solid mental model of what happens inside a running Flink job, from graph compilation and operator chaining to state snapshots, flow control, and much more. Not everything Flink does, but enough to reason about what is actually going on when a job runs.</p>

<h3>7. References</h3>
<pre style="max-height: 180px"><code>[1] "Flink Architecture," Apache Flink, [Online]. Available: https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/flink-architecture/.
[2] "A Deep Dive into Flink's Network Stack," Apache Flink, [Online]. Available: https://flink.apache.org/2019/06/05/a-deep-dive-into-flinks-network-stack/.
[3] "Flink Course Series 1: A General Introduction to Apache Flink," Alibaba Cloud, [Online]. Available: https://www.alibabacloud.com/blog/flink-course-series-1-a-general-introduction-to-apache-flink_597974.
[4] "Apache Flink: Concepts Overview," Apache Flink, [Online]. Available: https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/concepts/overview/.
[5] "DataStream V2: Watermark," Apache Flink, [Online]. Available: https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/dev/datastream-v2/watermark/.
[6] "DataStream V2: Building Blocks," Apache Flink, [Online]. Available: https://nightlies.apache.org/flink/flink-docs-release-2.2/docs/dev/datastream-v2/building_blocks/.
</code></pre>

