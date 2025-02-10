---
layout: post
title: "Kafka Internals"
date: 2025-02-09
tags:
- System Design
- Realtime
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/the-kafka.webp
feature: assets/featured/webp/the-kafka.webp
category: System Wisdom
---
<div class="blog-reference">
<p>🚧 This post is a work in progress, but feel free to explore what’s here so far. Stay tuned for more!</p>
</div>

<p><code>14 years</code> of <a href="https://kafka.apache.org/" target="_blank">Apache Kafka</a>! Kafka is the de facto standard for event streaming, just like AWS S3 is for object storage and PostgreSQL is for RDBMS. While every TD&H has likely used it, managing a Kafka cluster is a whole other game. The long list of <a href="https://kafka.apache.org/documentation/#configuration" target="_blank">high-importance configurations</a> is a testament to this. In this blog post, the goal is to understand Kafka's internals enough to make sense of its many configurations and highlight best practices.</p>

<img class="center-image-0 center-image-60" src="./assets/posts/kafka/kafka-api.webp">

<p>On a completely different note, the cost and operational complexity of Kafka have led to the emergence of alternatives, making the <code>Kafka API</code> the de facto standard for event streaming, similar to the S3 API and PG Wire. Some examples include: Confluent Kafka, RedPanda, WrapStream, AutoMQ, AWS MSK, Pulsar, and many more!</p>

<hr class="hr">

<h3>1. Event Stream</h3>
<p>The core concept of Kafka revolves around streaming events. An event can be anything, typically representing an action or information of what happened such as a button click or a temperature reading.</p> 
<p>Each event is modeled as a <code>record</code> in Kafka with a <code>timestamp</code>, <code>key</code>, <code>value</code>, and optional <code>headers</code>.</p> 

<img class="center-image-0 center-image-70" src="./assets/posts/kafka/event-stream.svg">

<p>The payload or event data is included in the <code>value</code>, and the <code>key</code> is used for:</p>

<ul class="one-line-list">
    <li>imposing the ordering of events/messages,</li>
    <li>co-locating the events that has the same key property,</li>
    <li>and key-based storage, retention or compaction.</li>
</ul>

<p>In Kafka, the <code>key</code> and <code>value</code> are stored as byte arrays, giving flexibility to encode the data in whatever way (serializer). Optionally, using a combination of <a target="_blank" herf="https://github.com/confluentinc/schema-registry">Schema Registry</a> and <a href="https://mvnrepository.com/artifact/io.confluent/kafka-avro-serializer" target="_blank">Avro serializer</a> is a common practice.</p>

<hr class="hr">

<h3>2. Kafka Topics</h3>
<p>As for comparison, <code>topics</code> are like tables in a database. In the context of Kafka, they are used to organize events of the same type, hence the same schema, together. Therefore, the producer specifies which topic to publish to, and the subscriber or consumer specifies which topic(s) to read from. Note: the stream is immutable and append-only.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/kafka/kafka-cluster.svg">

<p>The immediate question is, how do we distribute data in topics across different nodes in the Kafka cluster? This calls for a way to distribute data within the topic. That's where <code>partitions</code> come into play.</p>

<h3>2.1. Kafka Topic Partitions</h3>
<p>A Kafka topic can have one or more <code>partitions</code>, and a partition can be regarded as the unit of data distribution and also a unit of <code>parallelism</code>. Partitions of a topic can reside on different nodes of the Kafka cluster. Each partition can be accessed independently, hence you can only have as many consumers as the number of partitions (strongly dictating horizontal scalability of consumers).</p>

<img class="center-image-0 center-image-100" src="./assets/posts/kafka/kafka-partitions.svg">

<p>Furthermore, each event/record within the partition has a unique ID called the <code>offset</code>, which is a monotonically increasing number, once an offset number is assigned, it's never reused. The events in the partition are delivered to the consumer in assigned offset order.</p>

<h3>2.2. Choosing Number of Partitions</h3>

<p>The number of partitions dictates <code>parallelism</code> and hence the <code>throughput</code>.</p>

<p>The more the partitions:</p>
<ul>
<li>Higher is the <code>throughput</code>: both the producer and the broker can process different partitions independently and in parallel, leading to better utilization of resources for expensive operations such as <code>compression</code> and other processes.</li>
<li>More partitions mean more consumers in a <code>consumer group</code>, leading to higher throughput. Each consumer can consume messages from multiple partitions, but one partition cannot be shared across consumers in the same consumer group.</li>
</ul>

<img class="center-image-0 center-image-85" src="./assets/posts/kafka/kafka-cluster-example.svg">

<p>However, it's important to strike a balance when choosing the number of partitions. More partitions may increase unavailability/downtime periods.</p>
<ul>
    <li>Quick pre-context (from <a href="#3-3-data-replication">Section 3.3</a>): A partition has multiple <code>replicas</code>, each stored in different brokers, and one replica is assigned as the <code>leader</code> while the rest are <code>followers</code>. The producer and consumer requests are typically served by the leader broker (of that partition).</li>
    <li>When a Kafka broker goes down, the leader of those unavailable partitions is moved to other available replicas to serve client requests. When the number of partitions is high, the latency to elect a new leader adds up.</li>
</ul>

<p>More partitions mean more RAM is consumed by the clients (especially the producer): </p>
<ul>
    <li>the producer client creates a buffer per partition (<a href="#3-1-producer">Section 3.1</a>: accumulated by byte size or time). With more partitions, the memory consumption adds up. </li>
    <li>Similarly, the consumer client fetches a batch of records per partition, hence increasing the memory needs (crucial for real-time low-latency consumers).</li>
</ul>

<p>The idea behind choosing the number of partitions is to measure the maximum throughput that can be achieved on a single partition (for both production and consumption) and choose the number of partitions to accommodate the <code>target throughput</code>.</p>

<img class="center-image-0 center-image-60" src="./assets/posts/kafka/partitions-equation.svg">

<p>The reason for running these benchmarks to determine the number of partitions is that it depends on several factors such as: batching size, compression codec, type of acknowledgment, replication factor, etc. To accommodate for the buffer, choose <code>(1.2 * P)</code> or higher; It's a common practice to <code>over-partition</code> by a bit.</p>


<hr class="hr">

<p>The Kafka cluster has a <code>control plane</code> and a <code>data plane</code>, where the control plane is responsible for handling all the metadata, and the data plane handles the actual data/events.</p>

<h3>3. Kafka Broker (Data Plane)</h3>

<p>Diving into the workings of the data plane, there are two types of requests the Kafka broker handles: the put requests from the producer and the get requests from the consumer.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/kafka/record-batch.svg">

<h3>3.1. Producer</h3>
<p>The <b>producer</b> requests start with the producer application, sending the request with the key and value. The Kafka producer library determines which partition the messages should be produced to. This is done by using a hash algorithm to assign a partition based on the supplied partition key. Hence, records with the same key always go to the same partition. When a partition key is not assigned, the default mechanism is to use round-robin to choose the next partition.</p>

<p>Sending each record to the broker is not very efficient. The producer library also buffers data for a particular partition in an in-memory data structure (record batches). Data in the buffer is accumulated up to a limit based on the total size of all the records or by time (<code>time</code> and <code>size</code>). That is, if enough time has passed or enough data has accumulated, the records are flushed to the corresponding broker.</p>

<p>Lastly, batching allows records to be compressed, as it is better to compress a batch of records than a single record.</p>

<h3>3.1.1. Socker Receive Buffer & Network Threads</h3>

<p><code>Network threads</code> in a Kafka broker are like workers that handle high-level communication between the Kafka server (broker) and the outside world (clients), i,e. handle messages coming into the server (data sent by producers).<small><br/>*and also send messages back to clients (consumers fetching data)</small></p>

<p>To avoid network threads being overwhelmed by incoming data, a <code>socket buffer</code> stands before the network threads that buffers incoming requests.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/kafka/network-thread-producer.svg">

<p>The network handles each producer/client request throughout the rest of its lifecycle (the same network thread keeps track of the request through the entire process; the request is fully handled and the response is sent). For example, if a producer sends messages to a Kafka topic:</p>
<ul>
<li>The network thread receives the request from the producer,</li>
<li>processes the request <small><br/>*(write the message to the Kafka commit log & wait for replication).</small></li>
<li>Once processing is done, the network thread sends a response (acknowledgment that the messages were successfully received).</li>
</ul>

<h3>3.1.2. Request Queue & I/O Threads</h3>

<p>Each network thread handles multiple requests from different clients (multiplex) and is meant to be lightweight, where it receives the bytes, forms a producer request, and publishes it to a <code>shared request queue</code>, immediately handling the next request.</p> 

<p>Note: In order to guarantee the order of requests from a client, the network thread handles one request per client at a time; i.e., only after completing a request (with a response), does the network thread take another request from the same client.</p>

<img class="center-image-0 center-image-65" src="./assets/posts/kafka/i-o-threads.svg">

<p>The second main pool in Kafka, the <code>I/O threads</code>, picks requests from the shared <code>request queue</code>. The I/O threads handle requests from any client, unlike the network threads.</p> 

<h3>3.1.3. Commit Log</h3>
<p>The I/O thread first validates the data (CRC) and appends data to a data structure called the <code>commit log</code> (by partition).</p>

<pre><code>00000000000000000000.log
00000000000000000000.index
00000000000000000025.log
00000000000000000025.index
...
00000000000000004580.log
00000000000000004580.index
...
</code></pre>

<p>The suffix (<code>0, 25 & 4580</code>) in the segment's file name represents the base offset (i.e., the offset of the first message) of the segment.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/kafka/segment.svg">

<p>The commit log (per partition) is organized on <code>disk</code> as <code>segments</code>. Each segment has two main parts: the actual <code>data</code> and the <code>index</code> (<code>.log</code> and <code>.index</code>), which stores the position inside the log file. By default, the broker acknowledges the produce request only after replicating across other brokers (based on the <code>replication factor</code>), since Kafka offers high durability via replication.</p>

<p>Note: The new batch of records (producer request) is first written into the OS's <code>page cache</code> and flushed to disk asynchronously. If the Kafka JVM crashes for any reason, recent messages are still in the page cache but may result in data loss when the machine crashes. <code>Topic replication</code> solves the problem, meaning data loss is possible only if multiple brokers crash simultaneously.</p>

<h3>3.1.4. Purgatory & Response Queue</h3>

<p>While waiting for full replication, the I/O thread is not blocked. Instead, the pending produce requests are stashed in the <code>purgatory</code>, and the I/O Thread is freed up to process the next set of requests.</p>

<img class="center-image-0 center-image-65" src="./assets/posts/kafka/purgatory.svg">

<p>Once the data of the pending producer request is fully replicated, the request is then moved out of the purgatory</p>

<h3>3.1.5. Network Thread & Socket Send Buffer</h3>

<p>and then sent to the <code>shared response queue</code>, which is then picked up by the network thread and sent through the <code>socket send buffer</code>.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/kafka/broker-client.svg">

<h3>3.2. Consumer</h3>

<ul>
<li>The consumer client sends the fetch request, specifying the <code>topic</code>, the <code>partition</code>, and the <code>start offset</code>.</li>
<li>Similar to the produce request, the fetch request goes through the <code>socket receive buffer</code> > <code>network threads</code> > <code>shared request queue</code>.</li>
<li><code>IO threads</code> now refer to the index structure to find the corresponding file byte range using the <code>offset index</code>.</li>
<li>To prevent frequent empty responses when no new data has been ingested, the consumer typically specifies the minimum number of bytes and maximum amount of time for the response.</li>
<li>The fetch request is pushed to the <code>purgatory</code>, for either of the conditions to be met.</li>
<li>When either time or bytes are met, the request is taken out of purgatory and placed in the <code>response queue</code> for the network thread, which sends the actual data as a response to the consumer/client.</li>
</ul>

<p>Kafka uses <code>zero-copy</code> transfers in the network, meaning there are no intermediate memory copies. Instead, data is transferred directly from disk buffers to the remote socket, making it memory efficient.</p>

<p>However, reading older data, which involves accessing the disk, can block the network thread. This isn't ideal, as the network threads are used by several clients, delaying processing for other clients. The <code>Tiered Storage</code> Fetch solves this very problem.</p>

<h3>3.2.1. Tiered Storage</h3>

<p>Tiered storage in Kafka was introduced as an early access feature in 3.6.0 (October 10, 2023).</p>

<img class="center-image-0 center-image-90" src="./assets/posts/kafka/broker-local-storage.svg">

<p><code>Tiered storage</code> is a common storage architecture that uses different classes/layers/tiers of storage to efficiently store and manage data based on access patterns, performance needs, and cost. A typical tier model has frequently accessed data or "hot" data, and less frequently accessed data is moved (not copied) to a lower-cost, lower-performance storage ("warm"). Outside of the tiers, "cold" storage is a common practice for storing backups.</p>

<p>Kafka is designed to ingest large volumes of data. Without tiered storage, a single broker is responsible for hosting an entire replica of a topic partition, adding a limit to how much data can be stored. This isn't much of a concern in real-time applications where older data is not relevant.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/kafka/broker-tiered-storage.svg">

<p>But in cases where historical data is necessary, tiered storage allows storing less frequently accessed data in remote storage (not present locally in the broker).</p>

<p>Tiered storage offers several advantages:</p>
<ul>
    <li><code>Cost</code>: It's cost-effective as inactive segments of local storage (stored on expensive fast local disks like SSDs) can be moved to remote storage (object stores such as S3), making storage cheaper and virtually unlimited.</li>
    <li><code>Elasticity</code>: Now that storage and compute of brokers are separated and can be scaled independently, it also allows faster cluster operations due to less local data. Without tiered storage, needing more storage essentially meant increasing the number of brokers (which also increases compute).</li>
    <li><code>Isolation</code>: It provides better isolation between real-time consumers and historical data consumers.</li>
</ul>

<p>Coming back to the fetch request (from consumer) with <code>tiered storage</code> enabled: If the consumer requests from an <code>offset</code>, the data is served the same way as before from the <code>page cache</code>. </p>

<img class="center-image-0 center-image-90" src="./assets/posts/kafka/broker-consumer-tiered-storage.svg">

<p>The chances of most local data being in the page cache are also higher (due to smaller local data). However, if the data is not present locally and is in the <code>remote store</code>, the broker will stream the remote data from the object store into an in-memory buffer via the <code>Tiered Fetch Threads</code>, all the way to the remote <code>socket send buffer</code> in the network thread.</p> 

<p>Hence, the network thread is no longer blocked even when the consumer is accessing historical data. i.e., real-time and historical data access don't impact each other.</p>

<h3>3.3. Data Replication</h3>  

<p><code>Replication</code> in the Data Plane is a critical feature of Kafka that offers <code>durability</code> and <code>high-availability</code>. Replication is typically enabled and defined at the time of creating the topic.</p> 

<p>Each partition of the topic will be replicated across replicas (<code>replication factor</code>).</p>

<img class="center-image-0 center-image-95" src="./assets/posts/kafka/data-replication.svg">

<p>One of the replicas is assigned to be the <code>leader</code> of that partition, and the rest are called <code>followers</code>. The producer sends the data to the leader, and the followers retrieve the data from the leader for replication. In a similar fashion, the consumer reads from the leader; however, the consumer(s) can also read from the follower(s).</p>


<!-- <h3>4. Kafka Broker (Control Plane)</h3> -->

<pre style="max-height: 180px"><code>[1] "Apache Kafka Streams Architecture," Apache Kafka, [Online]. Available: https://kafka.apache.org/39/documentation/streams/architecture.
[2] "Apache Kafka Documentation: Configuration," Apache Kafka, [Online]. Available: https://kafka.apache.org/documentation/#configuration.
[3] J. Rao, "Apache Kafka Architecture and Internals," Confluent, [Online]. Available: https://www.confluent.io/blog/apache-kafka-architecture-and-internals-by-jun-rao/.
</code></pre>




