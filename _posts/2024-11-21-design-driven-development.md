---
layout: post
title: "Design Driven Development"
date: 2024-11-21
tags:
- Graph Theory
- Data Structures
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/ppt-hate.webp
feature: assets/featured/webp/ppt-hate.webp
category: Code on the Road
---

<img class="center-image-0 center-image-65 expand-image" src="./assets/featured/webp/ppt-hate.webp" />

<p>It feels good to be back, reflecting, pondering, and putting thoughts into words. Let's talk about something core to the software engineering that often gets overlooked in the rush to code: <b>design-driven development</b>.</p>

<p>The goal of the post isn't to dictate how to think, design or solve problems, but rather bring emphasis on how crucial the design phase is—and how it lays the foundation for everything that follows. Building softwares goes beyond writing clean code; it's about creating systems with a solid, scalable foundation; think of features like modular blocks that are easy to fit, which calls for abstraction at various levels, allowing flexibility and portability.</p>

<p>Given a problem statement, what steps does one take to call it a success? Here it goes:</p>

<h3>Discovery</h3>

<p>At first glance, this may sound like common-sense, but it's essential to dedicate time to thinking and analyzing before jumping into the code. It mostly involves questioning before anything else, which doesn't necessarily have to be too organized to begin with.</p>

<ul>
<li>Do I have all the required information? If not, what questions need to be answered?</li>
<li>What are the potential side effects or limitations of existing solutions?</li>
<li>Can the problem be broken down into smaller, manageable sub-problems? How does each feature fit into the bigger picture?</li>
<li>...</li>
</ul>

<p>The discovery phase tends to be all over the place; the idea here is to create a mind map to bring order to the chaos. It's not uncommon to uncover a bigger problem than the one in question.</p>

<p>The <b>discovery phase</b> is also the foundation that guides every-other decision in the subsequent steps. Coding is least of the concern at this point in time. The biggest mistake you can make is jumping straight into the implementation before thoroughly thinking things through.</p>

<h3>Requirements</h3>

<p>A common pitfall I’ve noticed is the lack of <b>requirements analysis</b>. It’s easy to gloss over, but understanding the full scope of requirements is 🗝. Requirements are often like an iceberg—what’s visible on the surface is just a fraction of the reality. Many teams fail to dive deep enough into this and rushing in without a proper understanding is nothing but trouble down the line. </p>

<p>Furthermore, requirements aren’t just about what’s written down—they’re about bridging gaps in understanding, clarifying the problem, and aligning on the root intention and the ideal end-state.</p>

<h3>Design</h3>

<p>Once the current state of the problem statement and requirements are fairly clear, the next stop-is the design. This phase is often brushed aside or sketched out hastily on a whiteboard before diving into code. While it’s tempting to start building right away—especially when you’ve worked on similar problems before—the value of a well-thought-out design cannot be overstated.</p>

<p>Rushing into implementation almost always leads to poor outcomes. In early-stage startups, there’s often a push to “move fast” and “fail fast,” (creating a <b>false illusion of efficiency and speed</b>) but this mentality can backfire. The so-called “high velocity” comes at the cost of long-term maintainability, collaboration, and scalability.</p>

<p>Taking the time to solidify your design, clarify the intent, and define the architecture before diving into the implementation phase doesn't take much time, but it makes a world of difference. It ensures that everyone on the team is aligned and that everyone understands the vision. This clarity makes it easier to collaborate, distribute tasks, and move forward with a shared understanding of the problem and solution.</p>

<p>On the other hand, if you decide to build without a clear design, you’ll often end up with:</p>
<ul>
<li>Unforeseen blockers: What seemed like a quick win turns into an unexpected roadblock, adding more development time in the end.</li>
<li>Damaged trust and poor collaboration: Without proper documentation and design, you risk creating a “trust me” culture. The code becomes a black box that no one else understands or can easily contribute to.</li>
<li>Difficult code reviews: Without a clear design review upfront, code reviews quickly devolve into debates about the implementation rather than constructive feedback on how to improve the solution.</li>
<li>Unmanageable technical debt: If the design is neglected, expect a backlog of tech debt that will need to be addressed later—often at great cost.</li>
</ul>

<h3>Document</h3>

<p>A good engineer is someone who can design, document, and implement clean code. Stop coping!</p>

<img class="center-image-0 center-image-55 expand-image" src="./assets/posts/glorified-rockstar.png" />
<p class="figure-header">High-Velocity Ninja-Rockstar Engineer on the right 🤡</p>

<p><b>Stop the PPTs 🪱</b> and start documenting 🐉. Clear, written documentation beats any PowerPoint presentation or casual conversations. Having a well-documented design allows for parallel work, clearer communication, and a shared understanding. Without it, you risk creating silos of knowledge, with one or two team members holding all the information, making collaboration difficult and inefficient.</p>

<p>I get it! most software engineers would rather skip this part. But documenting your thought process and the rationale behind your decisions is vital. It ensures that your work can be understood by others, that your decisions are well-justified, and that the design can be revisited if needed.</p>

<p>When documentation is overlooked, the risk of misunderstanding and future rework increases dramatically. A good document lays the groundwork for collaboration, clarifies the design, and sets clear expectations.</p>

<div class="blog-reference green-disclaimer">
<p>
🌻 To keep the post short and contained; NOT going into too much detail about implementation, testing, and reiteration.</p>
</div>

<p>Now comes the real implementation</p>

<p>...With the well-documented design (reiterated from collaboration and feedback) in place, you can implement with a clear(er) direction. The implementation phase becomes a translation of the plan into working code.</p>

<p>However, the design phase is iterative to an extent. While in an ideal world we want the finalized design to be rock solid, during implementation, it may open up the need for iterations—almost like cooking from a recipe book after shopping for all the groceries. You may have to make another trip for cilantro <img class="twemoji" src="../assets/img/emoji/cilantro.png" />, but you don't have to worry about missing a ton of ingredients.</p>


<h3>Conclusion</h3>

<p>In the post, I've tried to shed some light on the importance of design-first/design-driven development in software engineering and the significance of expressing it through a well-written design document.</p>



