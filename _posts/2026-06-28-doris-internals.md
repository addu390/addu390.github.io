---
layout: post
title: "Apache Doris Internals"
description: "A diagram-heavy tour of Apache Doris, the MPP real-time data warehouse that speaks MySQL, covering its storage engine, meta service, backend, and frontend."
date: 2026-06-28
tags:
  - Internals
  - Databases
  - Distributed Systems
author: Adesh Nalpet Adimurthy
highlight: green
deck: "A diagram-heavy tour of the storage engine, meta service, backend, and frontend, going deeper than the official manual."
---

<p>Apache Doris is an MPP-based real-time data warehouse known for its high query speeds, handling high concurrency and throughput, and speaking the MySQL protocol. Commonly used for real-time analytics, lakehouse analytics that federate queries over data lakes such as Iceberg and Hive, and hybrid search that runs text and vector search alongside aggregation.</p>

<p>Its growth has not been linear. While still incubating at the ASF, the <a href="https://lists.apache.org/thread/23ry2zdzpgnr44qn3p34175ml2zox1c7" target="_blank" rel="noopener noreferrer">DorisDB fork infringed the trademark</a> and stalled the project's graduation, before it was later rebranded as StarRocks. Doris has since recovered as a top-level Apache project with broad production use.</p>

<h3>1. Architecture</h3>

<p>Doris runs in one of two deployment architectures. They differ in where data lives and how storage and compute scale, while sharing the same SQL interface, data format, and query engine.</p>

<h3>1.1. Storage-Compute Integrated</h3>

<p>The integrated architecture has two node types. Data lives on BE local disks as replicated tablets, so storage and compute scale together.</p>

<ul>
<li><p><strong>Frontend (<code>FE</code>).</strong> Handles client requests, parses and plans SQL, and manages metadata and nodes. It is deployed as master, follower, and observer nodes, each holding a full copy of the metadata kept in sync over BDB JE.</p></li>
<li><p><strong>Backend (<code>BE</code>).</strong> Stores data and executes queries. Each table is split into tablets, and every tablet is kept as several replicas spread across BEs for durability.</p></li>
</ul>

<img class="center-image-0 center-image-85" src="./assets/img/posts/doris/doris-integrated.svg">

<h3>1.2. Storage-Compute Decoupled</h3>

<p>The decoupled architecture, available from version 3.0, splits Doris into three layers so storage and compute scale on their own.</p>

<ul>
<li><p><strong>Metadata layer.</strong> The FE plus a separate Meta Service. The FE parses and plans SQL, while the Meta Service holds the data-layer metadata and transactions in FoundationDB.</p></li>
<li><p><strong>Compute layer.</strong> Stateless BEs organized into compute groups. Each group is an independent set of nodes that scales or pauses on its own and keeps only a local file cache.</p></li>
<li><p><strong>Storage layer.</strong> Shared object storage (S3, HDFS, OSS, and similar) that holds the data files. This is the single durable copy.</p></li>
</ul>

<img class="center-image-0 center-image-95" src="./assets/img/posts/doris/doris-separated.svg">

<p>The rest of this post follows the storage-compute decoupled architecture. Internals shared by both shapes, such as the data format and the query engine, are flagged where they come up.</p>

<h3>2. Components</h3>

<p>At a high level, the decoupled architecture has four components:</p>

<ul>
<li><p><strong>Frontend (<code>FE</code>).</strong> Handles client connections, parses and plans SQL, and coordinates queries and transactions. It runs as a replicated set of master, follower, and observer nodes and keeps the catalog metadata on its own local disk.</p></li>
<li><p><strong>Backend (<code>BE</code>).</strong> Stateless compute that executes query fragments and caches data locally. BEs are grouped into compute groups that scale up and down independently.</p></li>
<li><p><strong>Meta Service.</strong> Stores all metadata and transaction state and tracks the compute groups and nodes, backed by FoundationDB. It also runs the recycler that deletes data files in object storage once the metadata no longer references them.</p></li>
<li><p><strong>Storage.</strong> Shared object storage (S3, HDFS, and similar) that holds the actual data files. This is the one durable copy of the data.</p></li>
</ul>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-components.svg">

<p>These four split into a shared, durable backend (Storage and the Meta Service) and the nodes that run on top of it (FE and BE). The BE is stateless and scales freely, while the FE is replicated and keeps its own catalog metadata. The sections below go from the foundation up, beginning with the storage layer.</p>

<h3>2.1. Storage</h3>

<p>In the decoupled architecture, storage is the shared object store that holds the one durable copy of the table data. A few other things also look like storage but are not this layer. The BE keeps a local file cache, each FE keeps its catalog on local disk, and the Meta Service keeps metadata in FoundationDB. The map below places each one, and the rest of this section covers only the durable copy.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-storage-map.svg">

<h3>2.1.1. Storage Vault</h3>

<p>A storage vault is a durable backend that holds the data files. It is an abstraction over a real object store or a distributed filesystem, so the rest of the engine reads and writes through one uniform file interface and never has to know which backend sits underneath. The vault keeps the only durable copy of the data. There are no Doris-managed replicas at this layer, because the backend is already a replicated, durable store responsible for keeping the data safe.</p>

<p>A vault is one of two types:</p>

<ul>
<li><p><strong>S3.</strong> Any S3-compatible object store. The one type covers AWS S3, Alibaba OSS, Tencent COS, Huawei OBS, Baidu BOS, Google Cloud Storage, Azure Blob, MinIO, and others. Its definition carries the endpoint, region, bucket, a key prefix, and credentials, which can be static keys or an assumed role.</p></li>
<li><p><strong>HDFS.</strong> An HDFS cluster, described by its NameNode address, a path prefix, and the usual Hadoop settings, including Kerberos where it is required.</p></li>
</ul>

<p>Either way the engine reaches the backend the same way. The BE writes and reads segments through the vault, and the recycler deletes them through the same interface.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-storage-vault.svg">

<p>A vault is used in three stages: definition, binding, and locating a file.</p>

<p>A vault is first defined: its credentials and location are registered centrally with the Meta Service, not kept beside the data, so any FE can use a vault by name without ever holding its credentials.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-vault-resolution.svg">

<p>A table then picks its vault once, at creation, and that choice is permanent: all of its files go to one backend, and a table never spreads across vaults. One vault can be the default for tables that name none.</p>

<p>After that, locating a file is arithmetic rather than a lookup. A segment's path is computed from the ids that already identify it, as in <code>data/{tablet_id}/{rowset_id}_{seg_id}.dat</code>, so nothing keeps a file index and reclaiming space is just deleting a prefix.</p>

<h3>2.1.2. Data File Hierarchy</h3>

<p>Before any of this becomes files, a table is divided into <b>buckets</b>, and optionally into <b>partitions</b> first. Bucketing is required. Every table names a <b>distribution</b> key, and hashing that key spreads each row across a fixed number of buckets, so the key alone decides which bucket holds a row. Partitioning is optional. A table can be cut into partitions by range or list over a column, usually a date, so a month or a day of <code>sales</code> is one partition, or it can be left unpartitioned, which is simply one partition holding everything. Either way each partition is bucketed, every partition-and-bucket pair is one <b>tablet</b>, and the tablet count is the partitions times the buckets.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-data-sharding.svg">

<p>The two cuts do different jobs. Partitioning works on whole slices of the table. A query with a date filter reads only the partitions it needs and skips the rest, an old partition is dropped in a single step, and each partition carries its own version. Distribution spreads a partition's rows evenly and keeps related ones together. Because the hash is deterministic, every row for one <code>store_id</code> lands in the same bucket, so a query grouped or joined on that key finds each group already whole on one backend and needs no shuffle. Hash distribution is the rule whenever rows that share a key must meet, which is every model except a plain duplicate table, which may scatter its rows at random instead.</p>

<p>Inside a tablet, that vault path, <code>data/{tablet_id}/{rowset_id}_{seg_id}.dat</code>, names the rest of the hierarchy. From the outside in, a tablet holds rowsets, and a rowset holds segments.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-data-hierarchy.svg">

<p><strong>Tablet</strong>: one bucket of one partition, and the unit the system places, versions, and compacts. In the decoupled architecture a tablet is a single copy in the vault, with no replicas, and it acts as the container for everything below it.</p>

<p><strong>Rowset</strong>: the immutable output of one successful load or one compaction. Every rowset carries a version range. A load produces a rowset at a single new version, written <code>[v, v]</code>, while a compaction produces one rowset that spans the range of the inputs it replaced, such as <code>[2, 7]</code>. A rowset holds one or more segments.</p>

<p><strong>Segment</strong>: a single columnar file, the level that actually stores the rows. A segment is written once and never changed, and its rows are sorted by the table's key columns.</p>

<p>Writing a handful of <code>sales</code> rows produces the following.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-data-example.svg">

<p>The whole hierarchy is append-only. A load adds a new rowset at the next version and leaves every existing rowset and segment untouched. Nothing rewrites a file in place: deletes and updates are recorded as new rowsets or as small side files, never by editing the segments that already exist. Because each rowset is pinned to a version, a query reads a consistent snapshot as of one version. How those rows are then reconciled at read time depends on the table model.</p>

<p>The cost of this design shows up at read time. A tablet that has taken many loads accumulates many rowsets, and the segments inside a freshly loaded rowset can overlap in key order, so any given key might sit in several of them. Compaction rewrites those into fewer rowsets whose segments are sorted and non-overlapping, so a key range lives in exactly one segment and a read can seek straight to it instead of opening them all.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-segment-overlap.svg">

<p>Most of a query's read performance comes from how a single segment lays out its data on disk.</p>

<h3>2.1.3. Inside a Segment</h3>

<p>A segment is a single columnar file, and its bytes fall into a few regions: the column data, then the indexes built over it, a short-key index, and a footer. The footer is written last, so a reader works from the tail inward.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-segment-layout.svg">

<p>That trailing footer makes the file self-describing: it names every column and points at where its pages and indexes live. Writing it last lets the writer stream data out in a single pass, and reading it first lets a query jump straight to the bytes it needs instead of scanning from the front.</p>

<p>Inside the data region, each column is stored on its own and broken into pages of about 64 KB, the unit Doris reads and decodes at a time. A page's values are first encoded in whatever scheme fits the column, such as bit-shuffle, run-length, dictionary, or frame-of-reference, and then run through a block compressor like LZ4 or ZSTD. Holding one column's values together is exactly what makes both the encoding and the compression pay off.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-segment-columns.svg">

<p>This would still be slow if every read touched every page, so a segment carries small indexes that rule pages out. A zone map keeps the min and max of each page, so a filter can drop any page whose range cannot match. The short-key index seeks into the sorted rows by their leading key columns, an ordinal index maps a row position to the page that holds it, and an optional bloom filter answers equality checks. Inverted indexes are the one exception that sits in separate files beside the segment rather than inside it.</p>

<p>The sort order and the short-key index are both built on the table's key columns. What those keys actually mean, and how Doris reconciles two rows that share one, is the table model.</p>

<h3>2.1.4. Table Models</h3>

<p>A table fixes its model when it is created, and that choice decides what the key columns mean and how Doris handles two rows that carry the same key. There are three of them, and the storage underneath does not change between them: the same immutable rowsets and segments hold the data, so a model is mostly a policy for what happens when keys collide.</p>

<p>A <b>Duplicate Key</b> table keeps every row. The key columns set the sort order and nothing more, so two rows with the same key are both kept. This fits append-only data like logs and events, where there is nothing to reconcile and the cheapest possible write and read are what matter.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-model-duplicate.svg">

<p>An <b>Aggregate Key</b> table folds rows that share a key into one, column by column. Each non-key column is declared with a function, such as SUM, MAX, MIN, REPLACE, or set-builders like BITMAP_UNION and HLL_UNION, and that function combines the colliding values. It suits pre-aggregated metrics, where the rolled-up number is all anyone reads and the individual rows are never needed.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-model-aggregate.svg">

<p>A <b>Unique Key</b> table treats the key as a true primary key, so a later row with the same key replaces the earlier one. This is the update and upsert behavior that most OLAP stores handle poorly, and it is one of the main reasons to use Doris. The semantics are fixed, but Doris resolves them in one of two ways, differing only in when the replaced row is dealt with.</p>

<p><b>Merge-on-read</b> keeps both versions on disk and resolves them on every read, merging the matching rowsets and keeping the newest version of each key. Writes stay cheap, but every read pays to merge.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-model-unique-mor.svg">

<p><b>Merge-on-write</b> moves that cost to write time. As a load lands, Doris looks each incoming key up in the existing data through the primary-key index and flags the superseded row in a delete bitmap. Reads then scan directly and skip the flagged rows, with no merge. This is the default for unique tables, spending a little more effort per load to keep queries fast.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-model-unique-mow.svg">

<p>Whichever model a table uses, the files on disk are the same immutable rowsets and segments. The model only decides what a read does with rows that share a key, and it also shapes compaction, which collapses rowsets using each model's own rules.</p>

<h3>2.1.5. Indexes</h3>

<p>Indexes in Doris are part of the durable format, written alongside the data rather than rebuilt at startup. They sit in one of two places. The lightweight ones introduced with the segment in <a href="#2-1-3-inside-a-segment">Section 2.1.3</a> live inside the segment file itself, and a heavier, optional one lives in a separate file beside it.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-index-map.svg">

<p>The in-segment indexes are always cheap to carry. The zone map, ordinal, and short-key indexes are written into every segment, and a column can add a bloom filter or an n-gram bloom filter for point and substring lookups. They share the segment's lifecycle because they are bytes within the same file. The <b>inverted index</b> is the one kept in its own file, a compound <code>.idx</code> next to the segment's <code>.dat</code> under the same name.</p>

<p>An inverted index reverses the usual lookup. Instead of scanning a column and testing every value, it keeps a dictionary of terms and, for each term, the list of rows that contain it, so a predicate jumps straight to the matching rows. Doris builds it on CLucene, which lets a single index serve full-text search through MATCH, exact and wildcard lookups on strings, and range queries on numbers and dates through a BKD tree. That breadth is what lets one engine handle log search and analytics over the same table.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-inverted-index.svg">

<p>Because it is part of the format, the inverted index is maintained across the data's whole lifecycle. The writer builds it as a load creates each segment, compaction merges the per-segment indexes alongside the rowsets it consolidates so the index never drifts from the data, and reads pull index blocks through a dedicated cache rather than reopening the file each time.</p>

<p>Whichever index a query uses, none of them change the answer. They only let a read skip pages, seek to rows, or resolve a search without touching the column data. How the optimizer picks an index and how the scan applies it belong to the read path.</p>

<h3>2.2. Meta Service</h3>

<p>The Meta Service is the single source of truth for metadata in the decoupled architecture. It tracks which rowsets make up each tablet, which version of each partition is current, where each segment sits in the vault, and the schemas, transactions, and statistics that go alongside. In integrated Doris this state lived on the backends themselves, each one authoritative for the tablets it stored. Centralizing it is what lets a backend keep no durable state of its own, so compute nodes can be added or removed without moving any metadata.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-meta-service.svg">

<p>The service itself is stateless. It writes nothing to local disk and keeps everything in FoundationDB, a distributed transactional key-value store, so any instance can answer any request and durability becomes FoundationDB's guarantee rather than the service's. This is also what cleanly splits the control plane from the data plane. Control-plane calls like registering a rowset or reading the current version go through the Meta Service, while the data plane, the segment bytes themselves, moves directly between the backends and the vault. The metadata only ever names the bytes, it never holds them.</p>

<h3>2.2.1. Metadata as Keys</h3>

<p>All of that metadata lives in one flat namespace of sorted key-value pairs. A key is built by concatenation: a keyspace byte, a family word such as <code>meta</code> or <code>txn</code> or <code>version</code>, the instance id that isolates one tenant, then a kind and the specific ids. The value is a protobuf message. A tablet is a <code>TabletMetaCloudPB</code>, each of its rowsets a <code>RowsetMetaCloudPB</code>, and the storage vault from <a href="#2-1-1-storage-vault">Section 2.1.1</a> a <code>StorageVaultPB</code>.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-metadata-keyspace.svg">

<p>Because the keys are byte-ordered, everything about one object lands beside everything else about it. All the rowsets of a tablet share the key up to the tablet id and differ only in their trailing version, so they form a contiguous range, and reading a tablet's whole version chain is a single range scan rather than a pile of point lookups. The same ordering makes deletion cheap. Dropping a partition or a table is removing a key range, not walking a file listing.</p>

<p>The family word divides the namespace by concern. <code>meta</code> holds the durable shape of the data, the tablets and rowsets and schemas, along with the delete bitmaps that back merge-on-write. <code>version</code> holds the current version of each partition, <code>txn</code> tracks the loads in flight, <code>stats</code> carries the row and byte counts the planner reads, <code>recycle</code> lists files waiting to be reclaimed, and <code>storage_vault</code> is the registry every table resolves its backend through. One store, keyed by instance id, holds all of it for the whole deployment.</p>

<h3>2.2.2. Transactions and Versions</h3>

<p>Every change to the metadata is a transaction. The Meta Service opens a FoundationDB transaction, reads and writes the keys it needs, and commits, and FoundationDB either applies the whole set at once or, if a concurrent writer touched the same keys, rejects it so the service retries. The metadata stays consistent through this optimistic retry rather than through locks held across instances.</p>

<p>A load is the clearest example, because it runs as one transaction from end to end. Its coordinator calls <code>begin_txn</code> for a transaction id, the backends write their segments straight to the vault and register each as a temporary rowset keyed by that id, and <code>commit_txn</code> finally makes the load visible.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-txn-commit.svg">

<p>The commit creates the version. In one FoundationDB transaction the Meta Service reads the partition's current version, turns each temporary rowset into a permanent one stamped at the next version, advances the partition's version counter, and marks the transaction committed. Nothing the load wrote is visible until that point, and then all of it is. This is the origin of the version ranges from <a href="#2-1-2-data-file-hierarchy">Section 2.1.2</a>: a load lands at a single new version such as <code>[4,4]</code>. A reader takes the partition's version when its query starts and sees exactly the rowsets at or below it, which is how Doris hands every query a stable snapshot while new loads keep committing.</p>

<p>Two further duties build on the same transactional core. Merge-on-write loads have to agree on which rows each one supersedes, so before committing they take a short delete-bitmap lock through the Meta Service, serializing the bitmap updates for a tablet without blocking reads. Background jobs lease their work the same way, through <code>start_tablet_job</code> and <code>finish_tablet_job</code>, so two backends never compact the same tablet at once. The compaction those leases guard runs on the backend itself, so its mechanics belong with that component.</p>

<h3>2.2.3. Space Reclamation</h3>

<p>Because nothing in the storage layer is ever edited in place, files are constantly left with no version pointing at them: the rowsets of a dropped table or partition, the temporary rowsets of a load that aborted, the inputs a background compaction has already replaced. Reclaiming that space is the job of the <b>recycler</b>, a control-plane process that runs alongside the Meta Service as <code>doris_cloud --recycler</code> and shares the same FoundationDB. In the integrated architecture the same cleanup happens as a local trash sweep on each backend instead.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-recycler.svg">

<p>Reclamation is deliberately two-phased, and the commit path itself deletes nothing. When a file is orphaned, the Meta Service records a recycle entry stamped with an expiration set to the moment it was orphaned plus a retention window. The recycler scans those entries on each pass and skips any that have not expired, which leaves a margin for queries still reading an older version to finish and for an operator to undo a mistaken drop.</p>

<p>Once an entry is past its expiration, the recycler resolves the vault that holds the files, deletes them by removing each segment or the rowset's whole path prefix in one call, and only then removes the recycle entry. Deleting the data before the bookkeeping is what makes a pass safe to interrupt. A crash partway through leaves a stale entry that the next pass retries, never a live file erased by accident.</p>

<p>The storage and metadata layers together form a single lifecycle. Loads and background maintenance write immutable files into the vault, the Meta Service records which versions are live in one transactional store, and the recycler removes whatever falls out of reference once it is safe to do so.</p>

<h3>2.3. Backend</h3>

<p>The Backend is the compute layer. It runs the query fragments the Frontend hands it, and in the decoupled architecture it does so without owning any durable data. The one copy of every table lives in the storage vault and the Meta Service holds the metadata, so a backend keeps only a local cache of what it has recently read. Nothing on a backend's disk is authoritative, which is what makes it disposable: a backend can be added, removed, or replaced without moving or recovering any data.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-backend.svg">

<p>A backend has three jobs. It serves reads by running query fragments against data pulled from the vault, it keeps a local file cache so those reads do not return to remote storage every time, and it runs compaction to reorganize the data the storage layer accumulates. Two separate ideas group and divide these backends, and they are easy to confuse. A <b>compute group</b> is a pool of whole backends, the unit Doris scales and isolates by machine. A <b>workload group</b> is a slice of one backend's CPU and memory, the unit it isolates within a machine. The next two sections take them in turn.</p>

<h3>2.3.1. Compute Groups</h3>

<p>A <b>compute group</b> is an independent pool of backends over the same vault. In the cloud metadata it is a cluster, a named set of backend nodes with its own id, and one deployment runs several of them at once. Because the data is remote and every backend is stateless, a group carries no durable data of its own, so it can be scaled, paused, or dropped without touching another. A group serving interactive SQL and a group running heavy ETL read the same tables from the same vault, yet their compute never contends, because they run on different machines.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-compute-groups.svg">

<p>Within a group a tablet is not replicated, since the vault already holds the durable copy. It is assigned to one backend by a hash of its partition and bucket index over the group's backends. The assignment is deterministic and cached, so the same tablet keeps landing on the same backend, and that backend's file cache stays warm for it across queries. Spreading tablets this way also balances the scan load evenly over the group.</p>

<p>Adding or removing a backend changes the divisor in that hash, so some tablets move to a different node. A rebalancer on the Frontend master recomputes the routes, and by default it warms the new backend's cache in the background before shifting traffic to it, so a scale-up does not begin with every read missing the cache. The Meta Service is the source of truth for which backends belong to each group, and the Frontend syncs from it to keep its routing current.</p>

<h3>2.3.2. Workload Groups</h3>

<p>A compute group isolates by machine, but two workloads often have to share the same machines. A <b>workload group</b> divides a single backend's resources among them. It caps a share of CPU, memory, local and remote IO, and query concurrency, and the backend enforces the CPU and memory limits through Linux cgroups, so one group cannot starve another on the node they share.</p>

<p>A workload group is defined within a compute group, and several can apply to one. Every backend in that group runs the same set, dividing its own CPU and memory the same way, so the limits are shares of each node rather than of the group as a whole. A query is therefore placed twice: routed to a compute group that decides which nodes run it, and tagged with a workload group that decides its slice of those nodes.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-workload-groups.svg">

<h3>2.3.3. File Cache</h3>

<p>The file cache is the backend's local copy of the bytes it has read from the vault. It is block-based: each remote segment file is divided into fixed blocks, one mebibyte by default, and the block is the unit that gets cached, looked up, and evicted. A block is identified by a hash of the file name plus its offset, so every backend reading the same file addresses the same blocks.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-file-cache.svg">

<p>A scan that needs a byte range turns it into the blocks that cover it and looks each one up. Blocks already present are read straight from local disk. The misses are coalesced into a single request, the returned bytes fill those blocks, and the read completes. A backend can also pull a missing block from a peer backend that already holds it, which avoids a remote round trip when a tablet has just moved. The first read of cold data pays the remote latency once, and every read of it after that is local.</p>

<p>That naming is enough because a segment file is immutable and its name is globally unique. The bytes behind a name never change, so there is no invalidation to track and a block can be trusted on its name and offset alone. The scan has already fixed which files it reads through the snapshot version, and those files cannot change underneath it, so any block the cache already holds for one of them is byte-identical to the source and needs no freshness check.</p>

<p>Hit and miss are decided per block, and from the cache's own index rather than from the table metadata. The metadata only named the file and the byte range. For each block in that range the cache consults its in-memory record of what it holds: a present block points at a real file on local disk, an absent block is a gap to fill. So a query is rarely entirely cached or entirely missing, and the result is stitched together in order from the local blocks and the ones just downloaded.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-file-cache-lookup.svg">

<p>The cache is bounded, so it has to choose what to keep. Blocks are split across a few least-recently-used queues by what they hold, ordinary scan data, index data, one-shot reads, and data pinned by a time-to-live, so each kind has its own budget and ages out its own coldest blocks first, and only under pressure does one queue borrow space from another. When the disk fills, eviction runs harder and a background sweep deletes the files behind the dropped blocks. Warmup runs the same path in advance, downloading a tablet's blocks after a load, after compaction, or when it moves to a new backend, so the cache is hot before the first query arrives.</p>

<p>Warmup also crosses compute groups, which is what makes read and write separation practical. A common split runs one group for ingestion and a separate group for queries (<a href="#2-3-1-compute-groups">Section 2.3.1</a>), and the query group never wrote the files the load group commits, so left to itself it starts cold for every new load. A warmup job binds the two.</p>

<p>The load group is the source and the query group the target, and as the source commits a version the target's backends pull that version's segment and index files into their own cache, taking them from a source backend that already holds them where it can and from the vault otherwise. The job runs once for a new group, on a fixed interval, or driven by events on the source as it loads, compacts, and changes schema, and it can cover the whole group or only a named set of tables.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-cache-warmup.svg">

<p>The warmth never changes what a query returns. The files a warmup copies are the same immutable, content-addressed segments any read would otherwise fetch, and the set a query reads is fixed by the version it pins from the Meta Service, not by what the cache happens to hold.</p>

<p>A block the job has already copied is a local hit, and one it has not is an ordinary miss that reads from the vault and fills the cache on the way through. So if the warmup lags, fails a round, or never ran, the only cost is that first cold read, and a new load is visible to the query group as soon as its version commits, well before any warmup catches up. The job is best-effort and observable rather than a correctness guarantee, and a lag metric reports how far the target trails the source.</p>

<p>Indexes are not a path around the cache. The indexes built into a segment are pages of the segment file, and the inverted index is a separate file beside it, but both are read through the cache rather than around it. The lightweight in-segment index pages are tagged as index data and keep their own queue budget, so a bulk scan does not flush them as quickly. The index is consulted first to find which rows and pages match, and that located data is then read through the cache as well, so nothing reaches the vault except a miss.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-index-cache.svg">

<p>The file cache holds raw file bytes. Above it the backend keeps smaller in-memory caches of decoded structures, so a hit there skips the parsing as well as the disk read. A page cache holds decompressed column and index pages, a segment cache holds opened segment readers with their footers and column metadata, and the inverted index keeps its searchers and query-result bitmaps.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-cache-layers.svg">

<h3>2.3.4. Query Execution</h3>

<p>The Frontend compiles a query into fragments and ships each one to the backends assigned the relevant tablets. A backend runs a fragment as a pipeline, a chain of operators with a source at the bottom, a scan for the fragments that read tablets, and a sink at the top that passes results to the next fragment or back to the Frontend. The operators are pull-based and scheduled cooperatively, so many fragments share the cores without one blocking the rest.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-read-path.svg">

<p>For the storage story the work that matters happens in the scan. Because a backend holds only a cached copy of the tablet metadata and not the authoritative one, the scan first syncs the tablet's rowset list from the Meta Service, pulling in whatever has committed since its last sync. The version it reads is fixed by the Frontend's plan, and the scan captures the rowsets that cover that version once, so the set it reads stays frozen for the whole scan even as loads and compaction commit newer versions.</p>

<p>Within those rowsets the scan reads as little as it can. The segment indexes built at write time, the zone maps, the short-key index, and any inverted index, prune row ranges and whole segments before column data is touched, and only the columns the query needs are read. Those bytes are served by the file cache, so a repeated scan rarely returns to the vault.</p>

<p>What survives pruning is reconciled across the rowsets by the table model (<a href="#2-1-4-table-models">Section 2.1.4</a>), which is what turns the version chain back into one logical set of rows. A duplicate table keeps every row, an aggregate table combines them through their functions, and a unique table keeps the latest version of each key. Under merge-on-write the superseded rows were already marked when they were written, so the read applies the delete bitmap and skips them instead of merging.</p>

<h3>2.3.5. Compaction</h3>

<p>Every load and every compaction adds a rowset, and the segments inside a new rowset can overlap in key range with older ones, so without intervention a read has to open more and more files and merge across them. Compaction is the background process that holds this down by rewriting many rowsets into fewer, with their segments sorted and non-overlapping.</p>

<p>A tablet is not rewritten in full each time. It keeps a <b>cumulative point</b> that divides its rowsets into a settled base below the point and the recent rowsets above it. <b>Cumulative compaction</b> runs often and cheaply, folding the small rowsets above the point into one and advancing the point past them. <b>Base compaction</b> runs occasionally and does the heavier work of merging the settled rowsets below the point into one base. <b>Full compaction</b> rewrites the whole history at once and runs only on request, for repair and maintenance.</p>

<p>Two refinements cut the cost further: vertical compaction merges one column group at a time so memory does not scale with the number of columns, and segment compaction collapses the many tiny segments a single large load produces before that load even commits.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-compaction-levels.svg">

<p>What a backend compacts, and in what order, comes down to a score it keeps for each tablet. That score is concrete. Each rowset above the cumulative point counts once if its segments are already sorted, or once per segment if a load left them overlapping, and the tablet's score is their sum. It is the number of sorted runs a read would otherwise have to merge.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-compaction-score.svg">

<p>A backend schedules its own compactions, and the Meta Service only arbitrates which one wins. A single producer thread wakes every tenth of a second, ranks its tablets by that score, and takes the highest, skipping any that were just loaded, are already in a job, or were compacted moments ago. Which kind it runs follows a fixed rotation, nine rounds of cumulative for each round of base, because the cheap merge above the point is the common case and the settled base rarely needs rewriting.</p>

<p>The chosen tablets go to two thread pools, one cumulative and one base, sized independently so a backend runs several merges at once, up to a fixed cap on jobs in flight per backend. Because a tablet can be in only one job at a time, a slow base compaction never blocks the cheap cumulative ones from clearing the rowsets piling up above its point. Full compaction has no place in this loop. It rewrites every rowset at once and runs only when asked, for repair or schema maintenance.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-compaction-scheduling.svg">

<p>Because the score is read amplification, it is also the signal for whether compaction is keeping up. A handful is healthy, since cumulative compaction fires as soon as the score above the point passes a small threshold, five rowsets by default, and folds them away. A score in the hundreds means loads are arriving faster than compaction clears them, and the tablet's version count is climbing with it.</p>

<p>The hard limit is <code>max_tablet_version_num</code>, two thousand by default and twenty thousand for tablets on the time-series compaction policy. Cross it and new loads to that tablet are rejected with the too-many-versions error, the <code>-235</code> a heavy writer eventually hits. The score is the warning well before that wall, and the same threshold drives the safety valve that force-compacts a tablet whose versions approach the limit.</p>

<p>Two levers pull the score back down. The first is more compaction throughput, raising <code>max_cumu_compaction_threads</code>, <code>max_base_compaction_threads</code>, or <code>compaction_task_num_per_fast_disk</code>, the per-backend cap on jobs in flight, so a backend clears rowsets as fast as they land. The second is creating fewer of them, since every load adds a rowset above the point. Larger, less frequent loads beat a stream of tiny ones, which is why high-frequency ingestion is usually batched, through group commit for instance, rather than committing a rowset per row.</p>

<p>Arbitration matters because any backend in the group can reach any tablet's files, so two of them could try to compact the same tablet at once. The Meta Service prevents that with a lease. Before starting, the backend asks it to open the job, which grants a lease only if no other backend holds one for that tablet and the backend's view of the tablet is current. The backend then reads the input rowsets from the vault, merges them, and writes one output rowset back.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-compaction-flow.svg">

<p>The swap is committed in a single Meta Service transaction, an atomic commit like the one that makes a load visible. It promotes the output to a new rowset over the inputs' version range, marks the input rowsets for recycling, advances the cumulative point, and drops the job. The merge itself follows the table model, the reconciliation a read would otherwise do at query time: a duplicate table only sorts, an aggregate table combines values through their functions, and a unique table keeps the latest version of each key or refreshes its delete bitmaps. The old inputs are not deleted at commit. They stay in the vault, now unreferenced, until the recycler removes them (<a href="#2-2-3-space-reclamation">Section 2.2.3</a>).</p>

<h3>2.4. Frontend</h3>

<p>The Frontend is the control plane. It accepts client connections, holds the catalog of what tables and columns exist, compiles each SQL statement into a distributed plan, and coordinates the backends that run it. It sits between the client and everything behind it: it reads topology and the read version from the Meta Service, dispatches plan fragments to the backends, and never touches the data in the vault itself.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-frontend.svg">

<p>Behind the front door, which speaks the MySQL protocol and Arrow Flight SQL, sit three things this section covers in turn: the catalog and its journal, the Nereids planner, and the coordinator. Unlike a backend, the Frontend is stateful. The catalog and an append-only journal of every change to it are kept on its own local disk, even in the decoupled architecture, where the tablets, rowsets, and versions move to the Meta Service but the catalog does not. A backend can be wiped and replaced, but the Frontend holds metadata that has to survive.</p>

<h3>2.4.1. Catalog &amp; Journal</h3>

<p>The catalog is an in-memory object graph that holds every database, table, partition, and the rest of the structural metadata. Keeping it in memory is what makes planning fast, but memory does not survive a restart, so every change to it is also appended as an entry to a journal on the Frontend's local disk. The in-memory graph is the catalog the planner reads, and the journal is the durable record that can rebuild it.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-fe-journal.svg">

<p>Replaying the whole journal at every restart would get slower as it grows, so a background task periodically folds it into an image, a snapshot of the catalog at one point in time, and frees the entries the image already covers. Recovery then loads the latest image and replays only the entries written since.</p>

<p>Only one Frontend, the master, appends to the journal. Followers and observers subscribe to it and replay each entry, so their in-memory catalog stays identical to the master's and any of them can plan and serve a query. What separates the two is their part in failover: a follower votes and can be elected master, while an observer only scales reads and never votes. Because a single master owns every write, a statement that changes metadata but arrives at a follower or observer is forwarded to the master, applied there, and journaled once.</p>

<p>In the decoupled architecture this journal carries the structural metadata alone, the databases, tables, partitions, and their tablet layout, while the rowsets, versions, and delete bitmaps live in the Meta Service. The split is clean: the Frontend's journal records what the schema is, and the Meta Service records what data currently exists. With that catalog in memory, the Frontend can turn a SQL string into a plan.</p>

<h3>2.4.2. SQL to Distributed Plan</h3>

<p>Turning a SQL string into something the backends can run is the job of Nereids, the Frontend's optimizer. It works in stages. Parsing turns the text into a logical plan, a tree of operators. Analysis binds every name and type in that tree to the catalog, so a column reference becomes a specific column of a specific table. A rule-based rewrite then reshapes the tree into a cheaper but equivalent form, pushing filters down to the scans and pruning columns and partitions the query cannot need.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-nereids-pipeline.svg">

<p>Those rewrites are the changes that always help. Choosing between plans that are not strictly better is the cost-based stage. Nereids keeps the candidate plans in a Memo, a structure that shares common sub-plans instead of enumerating whole trees, derives statistics over them, and uses a cost model to pick among them. This is where join order is settled and where each table's access path is chosen.</p>

<p>Distribution is part of that cost. The same join can run by broadcasting the small side to every node, by shuffling both sides on the join key, or by exploiting tables already co-located on that key, and each carries a different price. The optimizer treats distribution as a property of a plan and inserts the data movement a plan needs to satisfy it. Those movements, the exchanges, are where the physical plan is cut into <b>fragments</b>. A fragment is the chain of operators that runs on one backend between two exchanges.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-fragment-dag.svg">

<p>The reference query becomes three fragments. One scans <code>sales</code> with the date filter, another scans the small <code>stores</code> table with the region filter and broadcasts it across, and the join and the grouped aggregate both run in the <code>sales</code> fragment. The aggregate needs no shuffle, because <code>sales</code> is hash-distributed by <code>store_id</code> and that is the grouping key, so every row for a store already sits on one backend. Only the final <code>ORDER BY ... LIMIT</code> forces a gather, sending each backend's local top ten to a single instance that merges them into the answer.</p>

<h3>2.4.3. Scheduling &amp; Coordination</h3>

<p>The plan that leaves the optimizer is still abstract. The coordinator, running on whichever Frontend received the query, turns it into concrete work. Each fragment becomes one or more instances, and the coordinator decides which backend runs each one. Scan instances are pinned to the backends that already own the target tablets, the same routing that keeps a tablet's file cache warm (<a href="#2-3-1-compute-groups">Section 2.3.1</a>), so a scan reads local data instead of pulling it across the group. The fragments above the scans spread across the group for parallelism.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-coordination.svg">

<p>Before anything is dispatched, the coordinator fixes the version the query will read. It asks the Meta Service for each partition's current version once and stamps that version into every scan range. Every instance then reads the same snapshot, so a load or compaction that commits a newer version in the middle of the query changes nothing it sees. This is the version each backend honors when its scan syncs and captures its rowsets.</p>

<p>The coordinator then ships the fragments to their backends over the same RPC the execution layer uses, wires up the exchanges between them, and waits. The backends run their pipelines, the single gather instance produces the final ordered result, and the coordinator streams it back to the client. Because a read never changes metadata, any Frontend can coordinate one. Only statements that write are forwarded to the master.</p>

<h3>3. End to End</h3>

<p>The four components are easier to follow in motion. This section runs the <code>sales</code> example through the decoupled stack three times. The first two share one layout and five actors, the client, the Frontend, the Meta Service, the backends of a compute group, and the storage vault: one writes a row, the other reads it back. Each step adds its numbered hop and updates the state it touches without erasing what came before, so the picture accumulates into the full path by the last frame. The transaction, version, rowset, and delete-bitmap state inside the Meta Service and the build and scan stages inside a backend are drawn out, not collapsed into a single box.</p>

<p>The third walk leaves the components behind and follows the data itself, one key through every transformation the storage engine applies to it. Step through the frames in order, or play each sequence.</p>

<h3>3.1. Write Path</h3>

<div class="slider" id="e2eWrite">
  <div class="slides center-image-0 center-image-100">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-1.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-2.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-3.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-4.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-5.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-6.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-7.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-8.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-9.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-write/write-Page-10.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'e2eWrite')" class="prev black-button">Prev</button>
    <button onclick="playSlides('e2eWrite')" class="play black-button">Play</button>
    <button onclick="stopSlides('e2eWrite')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'e2eWrite')" class="next black-button">Next</button>
  </div>
</div>

<p>A load becomes a new version. It opens a transaction at the Meta Service, the backend sorts the incoming rows and writes them as immutable segments in the vault, and a commit at the Meta Service moves the partition from v3 to v4. The files become visible only at that commit, so a reader sees either the whole load or none of it. The segments are never edited afterward. This load replaces nothing, but when compaction or an update does supersede a file, the recycler deletes it once no version still refers to it.</p>

<p>The slider traces what a load does once it starts, not how it arrives. The common high-throughput path is <b>Stream Load</b>, a synchronous HTTP request. The Frontend redirects it to a backend with a 307, and that backend becomes the coordinator, parsing the CSV, JSON, Parquet, or ORC body and distributing the rows to the backends that own each tablet. One label makes the batch atomic and dedupes a retry, and a JSON body returns on the same socket once the transaction commits. The Flink and Spark connectors drive exactly this, and a two-phase variant that stops at a precommit and finishes on the next checkpoint is what gives them exactly-once.</p>

<p>Routine Load is the same load driven by a Kafka consumer the Frontend manages, Broker Load pulls a bulk file from HDFS or object storage, and a plain <code>INSERT</code> arrives over the MySQL protocol. Whichever the entry, a backend builds the segments and the Meta Service commits the version, the path the slider already walked.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-ingestion.svg">

<h3>3.2. Read Path</h3>

<div class="slider" id="e2eRead">
  <div class="slides center-image-0 center-image-100">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-1.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-2.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-3.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-4.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-5.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-6.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-7.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-8.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-9.svg" class="slide">
    <img src="./assets/img/posts/doris/e2e-read/read-Page-10.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'e2eRead')" class="prev black-button">Prev</button>
    <button onclick="playSlides('e2eRead')" class="play black-button">Play</button>
    <button onclick="stopSlides('e2eRead')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'e2eRead')" class="next black-button">Next</button>
  </div>
</div>

<p>A query reads one snapshot. The coordinator on the Frontend that received the SQL asks the Meta Service for the current version once, pins it, and stamps it into every fragment it places on the backends. Each backend syncs its rowset list up to that version, captures the covering rowsets, prunes with the segment indexes, and reads the bytes it needs through its file cache, reaching the vault only on a miss. Instances exchange rows where a join or a final ordering needs them, and a single gather reduces the result before it travels back, the backends to the coordinator and the coordinator to the client. Because the version is fixed before any fragment runs, a load or compaction that commits while the query is in flight changes nothing it sees.</p>

<h3>3.3. Data Lifecycle</h3>

<p>The two paths above followed control and version flow between the components. This last one drops to the storage engine and follows the data, taking one key in a single tablet of the <code>sales</code> table and stepping it through every transformation, from the first insert to the moment its replaced files are reclaimed. The table is unique-key with merge-on-write, the richest case, since a repeated key is a real update and a delete leaves a mark. The skeleton holds still again, and the tablet's rowsets, delete bitmaps, and indexes change underneath it.</p>

<div class="slider" id="dataLife">
  <div class="slides center-image-0 center-image-100">
    <img src="./assets/img/posts/doris/life/life-Page-1.svg" class="slide">
    <img src="./assets/img/posts/doris/life/life-Page-2.svg" class="slide">
    <img src="./assets/img/posts/doris/life/life-Page-3.svg" class="slide">
    <img src="./assets/img/posts/doris/life/life-Page-4.svg" class="slide">
    <img src="./assets/img/posts/doris/life/life-Page-5.svg" class="slide">
    <img src="./assets/img/posts/doris/life/life-Page-6.svg" class="slide">
    <img src="./assets/img/posts/doris/life/life-Page-7.svg" class="slide">
    <img src="./assets/img/posts/doris/life/life-Page-8.svg" class="slide">
    <img src="./assets/img/posts/doris/life/life-Page-9.svg" class="slide">
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'dataLife')" class="prev black-button">Prev</button>
    <button onclick="playSlides('dataLife')" class="play black-button">Play</button>
    <button onclick="stopSlides('dataLife')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'dataLife')" class="next black-button">Next</button>
  </div>
</div>

<p>Nothing is ever edited in place. An insert is sorted in the memtable and flushed as a new rowset, its segment carrying the encoded column pages and every index at once. An update is just another load of the same key, and merge-on-write looks the key up in the primary-key index and marks the old copy in the previous rowset's delete bitmap rather than rewriting it. A delete is a tombstone row that does the same to the live copy. A read then skips the marked rows and the tombstone, so it never merges them, which is the whole point of paying that cost at write time.</p>

<p>Compaction is where the rewriting finally happens: it applies the bitmaps, drops the dead rows, and folds the survivors into one sorted rowset, rebuilding that segment's indexes and merging the inverted index across the inputs through a rowid map rather than leaving it stale. Only then does the recycler delete the files no version still needs.</p>

<p>The table model is the one degree of freedom in all of this. It decides what a repeated key means, kept by duplicate, combined by aggregate, or reduced to the newest by unique, and whether unique reconciles at write time through the bitmap or at read time by merging versions. The files, the versions, and the compaction are the same underneath.</p>

<h3>4. Lakehouse</h3>

<p>Everything so far has been data Doris owns, written in its own format and tracked by the Meta Service. Doris is also a query engine over data it does not own. It reads the open lake formats and outside databases in place, mapping each into the same three-level namespace of catalog, database, and table that the internal tables use, so a lake table is queried with the same SQL over the same MySQL protocol, with no copy step and no second engine to run.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-lakehouse-stack.svg">

<h3>4.1. Catalogs and Federation</h3>

<p>A <b>catalog</b> connects Doris to one outside system and maps it into the namespace, and the connector framework behind it is broad. Hive, Iceberg, Hudi, and Paimon cover the open table formats, a JDBC catalog reaches MySQL, PostgreSQL, and other databases, and a Trino-connector compatibility layer pulls in sources like Delta Lake with no new code. Each catalog points at a metastore, Hive Metastore, AWS Glue, or an Iceberg REST endpoint, and Doris reads the schemas, partition lists, and snapshots it needs from there, caching that metadata rather than listing the source on every query.</p>

<p>In the namespace an external table is just another scan source for the same Nereids optimizer and the same MPP pipeline. One statement can join an Iceberg fact table to a MySQL dimension over JDBC and an internal Doris table, with nothing staged or loaded first, and the join, the aggregation, and the shuffle are the operators an all-internal query would use. Only the scan at the bottom of the plan changes, reading a Parquet or ORC file instead of a Doris segment.</p>

<h3>4.2. Caching the Lake</h3>

<p>Reading the lake means reading over the network, and that is the bottleneck. An external scan pulls files from object storage or HDFS, where access is high-latency, low on IOPS, and less stable than a local disk, and the open table formats add their own manifest and listing reads on top. Object storage is cheap, durable, and the right place to keep the data, but a query that returns to it for every byte cannot be fast. Doris narrows the gap the same way it does for its own tables, doing as little remote work as it can and keeping what it has already read close.</p>

<img class="center-image-0 center-image-100" src="./assets/img/posts/doris/doris-lakehouse-scan.svg">

<p>Two things cut the remote work itself. The Frontend prunes to the files that matter from the metadata it cached, and it pushes the filters and the column list into the readers, so the row-group statistics, the dictionaries, and the bloom filters skip the parts that cannot match and only the needed columns are read. The bytes that remain go through the file cache, the same block cache as the decoupled engine (<a href="#2-3-3-file-cache">Section 2.3.3</a>), the same one-mebibyte blocks and typed LRU queues, holding Parquet and ORC now instead of Doris segments. The first scan fills it from object storage and every later read of those ranges is local, which is what brings remote data within reach of local speed.</p>

<p>The cache covers the file formats, Hive, Iceberg, Hudi, and Paimon, not JDBC or other row sources, and it uses the same <code>enable_file_cache</code> switch and local directories as the internal cache. A warmup can preload a table or a partition before traffic arrives, and an admission rule keeps a one-off full scan from evicting the hot set. Because the compute is stateless over shared storage, a compute group can be brought up to query the lake and paused when idle, apart from the groups doing other work, and the integrated architecture reaches the same external data through elastic compute nodes that hold no tablets of their own.</p>

<h3>5. References</h3>
<pre style="max-height: 180px"><code>[1] "System Architecture," Apache Doris, [Online]. Available: https://doris.apache.org/docs/4.x/features-architecture/system-architecture/.
[2] "Compute-Storage Decoupled Deployment Preparation," Apache Doris, [Online]. Available: https://doris.apache.org/docs/4.x/compute-storage-decoupled/before-deployment/.
[3] "Managing Storage Vault: Creation, Configuration, and Access Control," Apache Doris, [Online]. Available: https://doris.apache.org/docs/4.x/compute-storage-decoupled/managing-storage-vault/.
[4] "Unique Key Model," Apache Doris, [Online]. Available: https://doris.apache.org/docs/4.x/table-design/data-model/unique/.
[5] "Apache Doris Source Code," The Apache Software Foundation, [Online]. Available: https://github.com/apache/doris.
[6] "FoundationDB Documentation," Apple, [Online]. Available: https://apple.github.io/foundationdb/.
[7] "Lakehouse Overview," Apache Doris, [Online]. Available: https://doris.apache.org/docs/dev/lakehouse/lakehouse-overview.
[8] "Data Cache," Apache Doris, [Online]. Available: https://doris.apache.org/docs/dev/lakehouse/data-cache/.
[9] "Data Cache & Page Cache," Apache Doris, [Online]. Available: https://doris.apache.org/docs/4.x/key-features/data-cache-page-cache/.
</code></pre>

