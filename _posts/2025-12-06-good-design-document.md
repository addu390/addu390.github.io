---
layout: post
title: "What Makes a Good Design Document"
date: 2025-02-09
tags:
- System Design
- Realtime
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/the-kafka.webp
feature: assets/featured/webp/the-kafka.webp
category: System Wisdom
---

<details open class="text-container"><summary class="h4"> Anatomy of a Design Document</summary>

<h3>1. The Three-Layer Structure</h3>
<p>Think of the design document like a layered onion, where each layer builds upon the prior ones. The core or lower layers have the most impact on changing the direction of the document, hence the need to bring as much clarity as possible to the lower layers. For example, with problem definition and requirements being the core, changing them may have a drastic impact on the solution (the rest of the layers built upon them).</p>

<p>And as far as the document is concerned, each layer can have multiple headings/sub-headings. A 3-layer structure is a good starting point and suffices for most use cases, with more add-on layers when it makes sense to exist as a conceptual build-on. Avoid deriving a rigid template for everyone else to follow, it takes away the developer’s creativity and flexibility and even hampers room for growth and improvisation. Instead, back the layers with examples and categorize the examples.</p>

<img class="center-image-0 center-image-65" src="./assets/posts/design-3-layer.png">

<h3>1.1. Layer 1: Problem Definition</h3>
<p>Establish clear and sufficient requirements, both functional and non-functional.</p>
<ul>
<li><p>Start with questions, be it to internal stakeholders and/or external users. All in the vein of making the problem definition/statement a lot clearer to prevent <a target="_blank" href="https://en.wikipedia.org/wiki/Scope_creep">scope creep</a>.</p></li>

<li><p>Define the problem statement, and be explicit about the goals and the non-goals.</p></li>

<li><p>The goal here is to make sure the requirements are well thought through early, going beyond the initial definition, understanding the current state, and gaining clarity on the end state.</p></li>
</ul>

<h3>1.2. Layer 2: Setting the Stage</h3>

<p>Layer 2 is the most flexible layer of the document. Its purpose is to establish the right context and mental model before introducing the detailed design in Layer 3. The content included here should be chosen based on what best helps the reader understand why the proposed solution exists and how to reason about it.</p>

<ul>
<li><p>Functional Specification: expand into a deeper functional specification, describing how the system works from an external or consumer perspective. The focus remains on behavior, interactions, and expectations rather than design details.</p></li>

<li><p>Component breakdown: When many components are involved, it is reasonable to provide a high-level breakdown of each component and an overview of how they interact. Such breakdowns improve comprehension while remaining conceptual and may naturally sit closer to Layer 3 when complexity increases.</p></li>

<li><p>Abstract Solution: A more abstract, technology-agnostic solution can be introduced. Highlights the major moving parts and responsibilities, helps bridge the reader into the detailed proposed solution in Layer 3.</p></li>

<li><p>Trade-offs and rationale: Highlight trade-offs, an example being bespoke vs. extensibility, which provides the context for why the solution is going beyond the current requirements, keeping future state in mind.</p></li>

<li><p>Alternatives considered: Discuss current/alternative solutions/technologies that don't work as well, or ideal solutions that aren't pragmatic given current limitations. Explain why they weren't chosen.</p></li>
</ul>

<h3>1.3. Layer 3: Technical Deep Dive</h3>

<p>With the requirements and the prior context about the design set, describe the deeper internal details and justify your choices.</p>

<ul>
<li><p>Proposed Solution: Start with the high-level abstract design if it was not already covered, and then take a stance on what the system looks like based on the chosen options. From there, expand on the proposed solution with a breakdown, explaining how it works, key trade-offs, and the reasoning behind decisions.</p></li>

<li><p>Depth of Analysis: The extent of detail also warrants consideration, ensuring there is sufficient information to support decisions ranging from high-level comparisons of options to more thorough, in-depth evaluations where needed. The key point is knowing when to pursue greater depth.</p>
</li>

<li><p>Information Flow: Consider highlighting different forms of information flow, for example distinguishing between the flow of requests and the flow of data. This helps clearly show component interactions and responsibilities. Diagrams and sequence flows can make sync/async interactions, dependencies, and points of coupling or failure apparent.</p>
</li>

<li>
<p>Implementation Details: Avoid going too deep into implementation specifics such as API contracts or database schemas and focus on the design decisions.</p>
</li>

<li><p><b>Forget Me Not</b>: Beyond the core design, double down on the rest of the important details, such as security, testability (unit, integration, performance), monitoring & alerting, and deployment strategy (A/B testing, rollout, migration) and many more.
</p></li>

</ul>

<h3>1.4. Planning and Execution</h3>
<p>An optional, but sometimes valuable extension to the 3-layer structure, intended to provide early planning and execution context for the design.</p>

<img class="center-image-0 center-image-45" src="./assets/posts/design-4-layer.png">

<p>The design document is not the place for full planning or execution details. Instead, the intent is to capture approximate timelines, key milestones, and dependencies to help understand sequencing, cross-team coordination needs, and delivery implications early on.</p>

<details open class="grey-container"><summary class="p">1.4.1. [Example] Milestones and Dependencies</summary>
<p></p>
<table>
  <thead>
    <tr>
      <th>Milestone</th>
      <th>Priority</th>
      <th>Dependencies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Milestone A</td>
      <td>🔴 High</td>
      <td>None</td>
    </tr>
    <tr>
      <td>Milestone B</td>
      <td>🔴 High</td>
      <td>Milestone A</td>
    </tr>
    <tr>
      <td>Milestone C</td>
      <td>🟡 Medium</td>
      <td>Milestone A, Milestone B</td>
    </tr>
    <tr>
      <td>Milestone D</td>
      <td>🟢 Low</td>
      <td>Milestone C</td>
    </tr>
  </tbody>
</table>
</details>

<hr class="hr">

<h3>2. Self-Review</h3>
<p>Self-reviewing the document is a big part of writing a design document. Despite doing it along the way, take a step back to evaluate. A few heuristics that help with completeness and clarity:</p>

<ul>
<li><p>Skeptic Test: Pretend you are a reviewer with no prior context. What questions would you ask? Identify gaps or weak assumptions and address them.</p></li>
<li><p>Vacation Test: Imagine leaving for a long vacation. Could someone on your team implement the design exactly as you intended? Clarify ambiguous parts or add examples if necessary.</p></li>
<li><p>Traceability Test: Can the choices be traced back to a clear requirement or the problem statement? This ensures decisions aren’t arbitrary and reviewers can see the “why” behind each choice.</p></li>
<li><p>Simplification Test: Could any section be explained more clearly or concisely without losing meaning? This reduces hidden complexities and improves readability.</p></li>
</ul>

<hr class="hr">

<h3>3. Tips and Tricks</h3>

<p>As much as it deserves its own post, a couple of easy-to-get-started-on tips are to:</p>

<h3>3.1. Structure and Organization</h3>
<ul>
<li><p>Number the sections and diagrams, including sub-sections, to provide a natural progression toward an index and also makes referencing easier.</p></li>
<li><p>If a section grows large or complex (for example, detailed requirements), move it into its own dedicated page. Include a short summary in the main document and reference the sub-page</p></li>
<li><p>Use appendix for content that's not necessary to read to understand the main conclusion of the document, but still has value for closely involved readers/reviewers. Moving it to the appendix gives both the freedom to describe details and keeps the main document less cluttered.</p></li>
</ul>

<h3>3.2. Communication and Clarity</h3>
<ul>
<li><p>Simplify the language. Keep the reader in mind when using jargon and acronyms; don't assume prior knowledge.</p></li>
<li><p>Use short paragraphs. Think of your document as a series of bullet points that flow into each other. This doesn't mean less information, but it may infer the need to break it down.</p></li>
<li><p>Avoid overusing arbitrary terms and adjectives. Use data-driven language like P95, P70, P50 instead of vague terms like "near-real-time."</p></li>
<li><p>Be intentional about expressing uncertainty when using terms like "might" or "may."</p></li>
<li><p>If you quote from external references, especially when they are critical in decision-making, add references.</p></li>
</ul>

<h3>3.3. Visualization</h3>

<ul>
<li>
<div class="green-disclaimer">
<p>Strong emphasis on visualization, be it flowcharts, block diagrams, tables, screenshots, or even hand-drawn sketches, goes a long way. A picture beats a wall of text.</p>
</div>
</li>

<li><p>When comparing options or alternatives, use tabular side-by-side formats for clarity. This makes trade-offs immediately visible.</p>
<details class="grey-container"><summary class="p">3.3.1. [Example] Table Comparison</summary>
<ul style="list-style-type: none;">
<li><p>🟢 Good: Perfectly meets the criteria; no changes needed.</p></li>
<li><p>🟡 Needs Improvement: Acceptable but could benefit from enhancements.</p></li>
<li><p>🟠 Functional but Suboptimal: Works and can be used, but has notable drawbacks or requires improvements.</p></li>
<li><p>🔴 Insufficient: Does not meet the requirements; not a viable option.</p></li>
<li><p>🟣 Not Applicable: This criterion doesn't apply to this option.</p></li>
</ul>

<table>
    <tr>
        <th>Criterion</th>
        <th>Option A</th>
        <th>Option B</th>
        <th>Option C</th>
    </tr>
    <tr>
        <td>Criterion 1</td>
        <td>🟢 [Text]</td>
        <td>🟡 [Text]</td>
        <td>🟠 [Text]</td>
    </tr>
    <tr>
        <td>Criterion 2</td>
        <td>🟡 [Text]</td>
        <td>🟢 [Text]</td>
        <td>🔴 [Text]</td>
    </tr>
    <tr>
        <td>Criterion 3</td>
        <td>🟢 [Text]</td>
        <td>🟠 [Text]</td>
        <td>🟢 [Text]</td>
    </tr>
    <tr>
        <td>Criterion 4</td>
        <td>🟠 [Text]</td>
        <td>🟢 [Text]</td>
        <td>🟣 [Text]</td>
    </tr>
</table>
</details>
</li>
</ul>

<hr class="hr">

<h3>4. Decision Making</h3>

<p>It's easy to leave all decisions open for feedback and discussion, but this creates Decision fatigue. If you keep too many open-ended items:</p>

<ul>
<li><p>Progress stalls. It becomes nearly impossible to move forward on the design until you get everyone's approval on every small decision, creating a lack of clear direction.</p></li>
<li><p>Time wasted. People have opinions on everything, it's not worth spending countless hours discussing things that don't matter much or where the answer is obviously the right way to go.</p></li>
</ul>

<p>Do the homework. Set the stage to make the decision-making process easy, and call out when you have strong reasoning behind a choice.</p>

<ul>
<li><p>Limit the number of decisions you're asking for feedback on.</p></li>
<li><p>Prioritize and clearly identify which decisions need deeper discussion and which don't. Flag decisions that deeply influence the design or will be difficult to change later.</p></li>
</ul>

<p>This also goes back to the depth of information on certain topics, such as comparisons between design, technology choices.</p>

<details open class="grey-container"><summary class="p">4.1. [Example] Signal which decisions need attention</summary>
<aside>
<ul>
<li><p>🔴 Critical: Must decide now. Deeply influences the design or will be difficult/expensive to change later.</p></li>
<li><p>🟡 Important: Should decide soon. Has meaningful impact but can be revisited if needed.</p></li>
<li><p>🟢 Minor: Low impact. Can be decided by the implementer or changed easily later.</p></li>
<li><p>⚪ Informational: Already decided. Included for context, not seeking feedback.</p></li>
</ul>
</aside>
</details>
</details>

<p></p>

<details open class="text-container"><summary class="h4">Value of Writing Culture</summary>
<h3>1. Why Engineers Struggle With Writing</h3>
<p>The root of the problem is that writing is a skill to develop, much like coding or any other, yet most engineers don’t even try. For a document to be readable, it must begin with structure and organization, just as you see in countless coding conventions. Apply the logic along the way, and you start to see how it’s a skill that can be nurtured with practice.</p>

<p>Unfortunately, it’s often dismissed as acceptable simply because it’s common, and eventually becomes the norm without any course correction. After all, nobody wants to fuss about writing a good document because it hampers delivery times. Invariably, they are forced to just take what they get, flood it with comments, and have tons of "collaboration" to figure out what the document was meant to imply.</p>

<h3>2. Traits Translate Into Writing</h3>

<p>At the surface, it seems as though it is just a lack of one specific skill, but it shows a deeper gap in communication. There are a couple of common traits that go hand in hand when looking at either end of the spectrum, which, of course, go beyond just writing a good document. But it is easy to spot if you care to look for it.</p>

<h3>2.1. Good Traits</h3>
<p>These traits make people easy to work with and get things moving, and they naturally show up in how they write:</p>

<ul>
<li><p><b>Open to feedback</b>: One of the easiest to spot is the ability to take feedback and questions with an open mind and positive intent. You do not have to agree with everything, but pausing to evaluate before reacting matters. This openness is crucial for writing because it forces you to bring clarity, build context, and revisit and revise.</p></li>

<li><p><b>Drive ideas to completion</b>: Good ideas and real innovation emerge when thoughts take shape outside our heads. Putting them into words gives them form, exposes gaps, and helps move them toward completion. In a team setting, sharing ideas in ways others can engage with, through documents and early demos such as PRs, makes all the difference.</p></li>

<li><p><b>Communicate Clearly</b>: Clarity matters more than polish. Writing down or explaining is not about sounding smart. It is often about making your thought process understandable, with the audience in mind. Being authentic and direct in writing helps ideas travel further and builds a culture where shared understanding is valued.</p></li>
</ul>

<img class="center-image-0 center-image-75" src="./assets/posts/quick-call.png">

<h3>2.2. Not So Good Traits</h3>
<p>On the other hand, there’s a higher chance of running into difficult personalities if people aren’t coachable or open to learning. Here are a few common traits:</p>

<ul>
<li><p><b>Guarded and Defensive</b>: They struggle to separate themselves from their work. When challenged, their instinct is to defend rather than assess, which shuts down productive discussions and shows up in PRs and documents being treated as untouchable truths. Feedback is dismissed or argued against, yet it is disguised as "following the writing culture."</p></li>

<li><p><b>Avoiding Perspective</b>: They avoid forming opinions or have opinions without clear context in their communication, leaving decisions vague and reasoning unclear. The work becomes a record of options rather than a tool for reflection or discussion. <br><img class="twemoji" style="vertical-align: sub;" src="../assets/img/emoji/cactus.svg" /> Having an opinion clarifies the "why," prompting deeper thinking, gathering more context, justifying trade-offs, and giving others a foundation to contribute effectively.</p></li>

<li><p><b>Fragmented Communication</b>: Worse yet, to compensate for the lack of effective async collaboration, they foster a frequent hallway-huddle culture. Decisions that could be carefully considered instead become last-minute chats, group Post-it note sessions, and frantic face-to-face catch-ups.</p>

<p>To clarify, this isn’t about avoiding synchronous collaboration, sync-work can be extremely valuable. The problem arises when it’s used as a workaround for a lack of clarity, without a clear starting point or agenda.</p>

<ul>
<li><p>It goes deeper than mere inconvenience: knowledge becomes hard to access for anyone not in the room, reducing transparency.</p></li>
<li><p>Decision-making turns into a reactive scramble rather than a thoughtful process, with little accountability and reasoning.</p></li>
<li><p>It encourages “top-of-mind” solutions instead of creating space for deep, focused work.</p></li>
</ul>
</li>
</ul>

<p>These pitfalls aren’t always obvious, but they can act like silent killers. Sometimes, they even come from the very people you’d call “rockstars.” In an early-stage startup with tiny teams, this can feel fine or even necessary. But left unchecked, it compounds: misaligned decisions, lost knowledge, reactive problem-solving, and a culture that prioritizes speed over clarity, even when slowing down is essential.</p>
</details>