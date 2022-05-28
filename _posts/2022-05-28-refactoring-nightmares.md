---
layout: post
title: "Refactoring Nightmares"
date: 2022-05-28
tags:
  - Project
author: Adesh Nalpet Adimurthy
feature: assets/featured/refactor-tomato.png
category: Leisure Seizure
---

<img class="center-image" src="./assets/featured/refactor-tomato.png" /> 
<p style="text-align: center;">Get Well Soon. </p>

Hey 👋 it's a work in progress; stay tuned. [Subscribe](https://pyblog.medium.com/subscribe) maybe?

You are working on a fast-growing, never-stopping product; 35 sprints and 600 coffees later, you finally got to move on, and a new engineer steps in, or you realize sooner or later that you cannot keep up with the feature requests while ensuring code quality. Then, after raising the need for refactoring as blockers for a couple of features, finally! It's the day when your engineering team decides to dedicate bandwidth for refactoring - Sounds familiar? You are not alone.

## How to prevent the need for a major refactor

### Don't Rebuild; Build the Right Things.
(1) Striking the right balance between business needs and development time is beyond important, especially in an early-stage start-up, quantifying the need to follow best practices to write clean code with meaningful test cases can be harder than it looks. One of the go-to approaches is to retrospect the hotfixes/number of bugs/blockers to the original story. Have a process around merging code to pre-production/production:
- Set a code coverage threshold, 
- automatically tag pull/merge requests without review comments, or the classic "LGTM" (Looks Good To Me), 
- link hotfixes to production to the original story/PR,
- "code owners" for certain critical classes/modules, not everyone has access to merge changes to any file/module (important for a monolith codebase).

(2) Almost never start a feature directly on your IDE, 
- gather the requirements,
- start a rough solutioning document, 
- list down the different components, 
- direct how each of these components talks to each other, 
- think of the extent of abstraction and probable future use cases, 
- decide on the contracts and re-iterate 

Finally, it's time to get on to that IDE and start off with the low-level design: interfaces, entities, DTOs, request/response, etc, followed by the implementation backed with test cases (Test Driven Development).

### If it's a Stable Product, Don't Touch it
...