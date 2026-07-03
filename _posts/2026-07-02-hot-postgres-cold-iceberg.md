---
layout: post
title: "Hot Postgres, Cold Iceberg"
description: "The landscape of transactional data meeting analytics: scaling Postgres itself, HTAP engines, separate OLAP stores, open table formats, zero-ETL, and why I built Modak."
date: 2026-07-02
tags:
  - Databases
  - Distributed Systems
author: Adesh Nalpet Adimurthy
highlight: green
deck: "The options for analytics on Postgres data, what each one costs to run, and where Modak fits: recent data stays in Postgres, history moves to Iceberg, and both read as one table."
---

<p>Postgres handles more analytics than it gets credit for. With partitioning, the right indexes, and rollup tables, a single instance serves dashboards over hundreds of gigabytes without drama. The breaking point is specific rather than general: the working set outgrows memory, scans read years of history from disk, the row layout fetches every column to aggregate one, and the same buffers and IO that serve those scans also serve OLTP traffic. Past that point the analytical copy of the data moves somewhere else, and the question becomes where, and through what pipe.</p>

<p>Disclosure up front: this post ends at <a href="https://github.com/addu390/modak" target="_blank" rel="noopener noreferrer">Modak</a>, a project I built. The rest of the landscape comes first, because its gaps are the reason Modak exists.</p>

<h3>1. Staying in Postgres</h3>

<p>The first moves happen inside Postgres, and they are usually correct. A read replica isolates analytical load from the primary. Partition pruning keeps scans off irrelevant data. Materialized views and rollup tables pre-answer the known questions cheaply.</p>

<p>The structural fix inside Postgres is columnar execution as an extension: Citus columnar storage, Hydra, ParadeDB, or pg_duckdb embedding DuckDB in the server. These close much of the scan gap, and for many workloads they are the whole answer. What they do not change is where the data lives. The history still sits in one Postgres, on the most expensive storage in the stack, and vacuum, backups, and restore times still scale with all of it. The extensions fix the execution model, not the capacity model.</p>

<h3>2. HTAP, the Recurring Merge</h3>

<p>The industry's recurring answer is one engine for both workloads. Gartner named the category HTAP in 2014, SAP HANA carried it earliest, SingleStore (born MemSQL) built a business on it, TiDB pairs its row store with TiFlash columnar replicas, AlloyDB bolts a columnar engine onto Postgres, and Snowflake approached from the opposite side with Unistore's hybrid tables.</p>

<p>A decade of attempts shows a consistent shape. Row and columnar layouts want different write paths, different compaction, and different scaling profiles, so "one engine" in practice means two engines behind one SQL surface, synchronized by machinery the user cannot see or operate. That is workable, but it only exists inside a single vendor's system, and it asks for the hardest migration there is: moving the system of record. HTAP did not fail on the idea. It stalled on the entry price.</p>

<h3>3. A Second System</h3>

<p>The mainstream answer is two systems: Postgres keeps the transactions, something else serves the analytics. That something else is either an analytical engine that owns its storage, or an open table format on object storage that no engine owns. Data arrives by one of three pipes, and any pipe can feed either destination.</p>

<img class="center-image-0 center-image-95" src="./assets/img/posts/modak/modak-paths.svg">

<h3>3.1. An Analytical Engine</h3>

<p>This covers both real-time OLAP stores (ClickHouse, Doris, StarRocks, Pinot) and cloud warehouses (Snowflake, BigQuery, Redshift). Columnar storage and vectorized execution put them one to two orders of magnitude ahead of a row store on scans. Warehouses add governed, elastic BI at per-query prices. The real-time stores serve sub-second aggregations over fresh events.</p>

<p>Self-hosting one is operating a distributed system: its own storage model, replication, upgrades, capacity planning, and failure modes, commonly with a dedicated team past a certain scale. And each engine has edges that surface in production. ClickHouse implements updates as asynchronous mutations that rewrite whole data parts, so update-heavy or late-arriving data works against its storage model. Doris takes updates more seriously, its unique key tables with merge-on-write exist precisely for mutable data, and it can even run as a query and cache layer over Iceberg instead of its native format. The edges move rather than vanish: merge-on-write taxes ingestion, and constant backfills scattered across old partitions leave small rowsets everywhere and put compaction under pressure. These engines are at their best on append-mostly, recent-window workloads, and data that drifts from that shape pays somewhere.</p>

<h3>3.2. An Open Table Format</h3>

<p>Iceberg, Delta, and Hudi on object storage are the cheapest and most open place data can live. The format is a specification, so Spark, Trino, DuckDB, and whatever comes next read the same table without a vendor in the path.</p>

<p>A format is not a query engine, so the lake ships with one attached: Spark or Trino that you operate, or a serverless scanner like Athena for lighter reach. The engines being interchangeable is the whole point, but one of them still has to run somewhere, and it is one more system on the list.</p>

<p>The flip side of being a specification is that nothing owns the table. No service is responsible for consistency, compaction, or freshness. Every reader and writer carries the context itself: which snapshot to scan, what has been compacted, what is still in flight. Small-file compaction and snapshot expiry become jobs you schedule and monitor. An open format gives every engine access to the data and no engine responsibility for it.</p>

<h3>3.3. The Pipes</h3>

<p>Direct ingest writes events straight to the destination, into the store or as streaming commits to the lake (streaming-storage systems like Fluss are this pipe productized). Freshness is as good as it gets. The catch is where the fresh data actually lives: in the store's own memory structures, or in the streaming system's servers and format, with only the older portion landed in the open format behind it. The last few minutes are readable only through that system, so the "open" part of the data is the part that is no longer fresh. And when the same rows also matter transactionally, the application dual-writes, and dual writes drift, since no transaction spans both systems. Against a lake, frequent commits also mean small files from day one.</p>

<p>CDC keeps Postgres as the single write path and replays the WAL into the destination, with Debezium or a managed equivalent. This is the right shape on paper and the costs are operational: the copy runs minutes to hours behind, streaming commits make the lake maintenance jobs load-bearing, and at any moment some rows exist only in Postgres while nothing records exactly where the copy ends. Query the copy and recent rows are missing. Query both and deduplication is your problem.</p>

<p>Batch ETL loads on a schedule, a day behind by construction. It is the cheapest to operate and the easiest to reason about, and it stops being an option the moment anyone needs today's data.</p>

<h3>4. Zero-ETL and Bundled Platforms</h3>

<p>Cloud vendors sell the pipe problem away. Aurora zero-ETL replicates into Redshift, Datastream feeds BigQuery, and the managed pipeline replaces the Debezium deployment. The destinations and their quirks are unchanged, only the plumbing is somebody else's pager.</p>

<p>Databricks went further, and the sequence deserves credit as strategy. Acquire Tabular and with it the creators of Iceberg. Pour years into Unity Catalog so the catalog, not the engine, becomes the center of gravity. Acquire Neon, a Postgres with storage decoupled onto object storage. Then ship Lakebase: managed Postgres sitting directly on lakehouse storage, transactional up front, analytical behind, one vendor end to end. Whether or not it was planned as one arc, it lands as one, and in practice it is a genuinely good solution to exactly the problem this post is about.</p>

<p>For a team already on Databricks, especially at enterprise scale, this is close to a no-brainer, and the product is still very early with plenty of room to grow into. The natural trade of the platform route is that the tiering, the freshness boundary, and the catalog run inside the platform.</p>

<h3>5. The Ground Reality</h3>

<p>A few observations cut across all of it.</p>

<p>First, data platforms fail on operational surface more often than on query speed. Every added system brings its own ingestion, auth, monitoring, upgrades, capacity model, and on-call load. For most teams, fewer systems beats faster benchmarks.</p>

<p>Second, Postgres itself is the gravity well. Half the systems above advertise Postgres wire compatibility as a feature, because the migration everyone wants is the one where nothing about the application changes. The pull is always toward the interface teams already know and the system they already run.</p>

<p>Third, the boundary between fresh transactional data and the analytical copy is nobody's job by default. Engines do not track what has not arrived. Formats deliberately do not own it. Pipes move data across the boundary without recording where it sits. Every composed setup inherits this gap and papers over it with staleness tolerances.</p>

<p>And underneath all of it sits a question the options above answer only implicitly: how much of the table does Postgres actually need to hold? Everything, forever, as the system of record? Everything passing through, with copies fanning out behind? Or only the hot fraction, and if so, how hot is hot: a day, a month, a quarter? Most architectures inherit an answer from whatever pipe they picked. Very few let you choose it per table and change your mind later.</p>

<p>Which leaves a concrete wishlist: few systems, open formats, an explicit dial for how much lives in Postgres, and a boundary that is somebody's explicit job.</p>

<h3>6. One Table, Two Tiers</h3>

<p>Modak is built against that wishlist, starting from the system already present. Postgres stays the transactional hot tier. History moves into Iceberg on object storage. It remains one logical table.</p>

<p>The premise is simplicity and ownership. It is your Postgres, wherever it already runs, and your Iceberg tables on your object storage. Modak is the bridge between them, not a platform around them: a Postgres extension and a worker process, both of which you can remove while everything you own stays exactly where it is. There is no exit cost because there is nothing to exit.</p>

<img class="center-image-0 center-image-95" src="./assets/img/posts/modak/modak-tiers.svg">

<p>For a registered time-partitioned table, recent partitions live in the Postgres heap and behave exactly like Postgres: transactional writes, indexes, fast point reads. A worker moves partitions past a cut-line into Iceberg and drops them from the heap. Queries do not change. The extension plans each query across both tiers, serving the hot branch from the heap and the cold branch through DuckDB scanning Iceberg, and unions them into one answer. Tables that should keep a complete heap can instead be mirrored, where CDC maintains the Iceberg copy while Postgres holds everything. That is the dial from the wishlist, set per table: mirrored keeps everything in Postgres, tiered keeps only the hot window, and the cut-line policy decides how hot is hot.</p>

<p>What the shape buys:</p>

<ul>
<li><p><strong>Updates work, including to history.</strong> The hot tier is plain Postgres, so OLTP semantics are untouched. Corrections to rows already in Iceberg are recorded as deltas, visible to readers immediately and folded into the lake by compaction. The update-heavy, backfill-prone workload that strains columnar stores is a plain UPDATE here.</p></li>
<li><p><strong>History is cheap and open.</strong> Cold data is standard Iceberg on S3, at object-storage prices, with snapshot history, readable by any engine with no Modak in the path.</p></li>
<li><p><strong>The hot path stays small.</strong> Postgres holds weeks instead of years, so the heap, its indexes, and its backups shrink accordingly. Hot queries never touch the small files and snapshot churn of ongoing ingestion, because live partitions are not in the lake at all.</p></li>
</ul>

<p>Tiering inside Postgres is not a new idea. Timescale's cloud tiers old hypertable chunks to object storage, and Crunchy Data Warehouse (since acquired by Snowflake) pairs Postgres with Iceberg. The differences that matter: Modak's cold tier is standard Iceberg rather than a proprietary layout, it runs on vanilla self-hosted Postgres, and the boundary between the tiers is published rather than internal.</p>

<p>And the honest limit: raw scan speed over full history is not the strong suit. A warm ClickHouse cluster will out-scan a DuckDB-over-Iceberg cold branch. The trade is a different one: no second cluster, no pipeline to babysit, one table that is always consistent.</p>

<h3>7. The Seam</h3>

<p>Consistent is the load-bearing word. Anyone can point a federation engine at both tiers today: Trino with a Postgres connector and an Iceberg connector, or a foreign data wrapper, and union the results. What that query cannot know is where one tier ends and the other begins at the moment it runs. Rows mid-migration show up twice or not at all, and the answer depends on when the two scans happened to start. Federation without a recorded boundary is guesswork at the edge.</p>

<p>Modak makes that boundary explicit and shared. The worker maintains the seam state in plain Postgres catalog tables: the cut-line T (rows at or above it are in the heap), the Iceberg snapshot S holding everything below it, the delta of corrections not yet folded, and read pins that hold lake maintenance back while a scan runs. T and S advance together in one transaction, so no committed moment has a row in both tiers or in neither.</p>

<img class="center-image-0 center-image-95" src="./assets/img/posts/modak/modak-seam.svg">

<p>A consistent read is then a fixed recipe: pin and capture (T, S) atomically, scan the heap at or above T, scan Iceberg at exactly S, merge the delta, union. The Postgres extension runs this recipe inside the planner, which is what makes reads transparent. Nothing about the recipe needs Postgres to execute it, though. A Spark job follows the same steps through a small connector library and gets the same point-in-time view, which matters on managed Postgres like RDS and Aurora where extensions cannot be installed. Trino and DuckDB recipes follow the same spec.</p>

<p>Open formats made data readable everywhere. They did not create the context that lets two systems serve one table correctly. Carried in ordinary catalog tables, that context turns federation from guesswork into a contract.</p>

<h3>8. Where This Lands</h3>

<p>If analytics can run a day behind, batch ETL stays underrated. If the workload is append-mostly and the team exists to run it, a dedicated OLAP store is unbeatable at what it does. If the organization is already inside a platform, zero-ETL or a bundled platform gets there fastest.</p>

<p>Modak is for the case in between: a team that already runs Postgres, wants years of history in an open format without operating a second distributed system, and values one consistent table over the fastest possible scan. The code, docs, and the seam protocol spec are at <a href="https://github.com/addu390/modak" target="_blank" rel="noopener noreferrer">github.com/addu390/modak</a> and <a href="https://addu390.github.io/modak/" target="_blank" rel="noopener noreferrer">addu390.github.io/modak</a>.</p>
