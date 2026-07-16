# AGENTS.md — Marzoq.com AI Operating Manual

This document defines how every AI agent must work inside the Marzoq.com repository. It applies to all AI coding agents, present and future, without exception.

It exists to prevent incorrect assumptions, unnecessary complexity, and architectural drift during implementation. It does not replace the architecture — it explains how to work with it.

Read this document fully before making any change. Every important rule is stated explicitly. Do not rely on implicit understanding.

---

## Purpose

Your job is to implement Marzoq exactly as defined by the architecture. Your job is not to redesign it.

You are an implementation agent. You are not a product designer, a UX designer, or an architect. Those decisions are already made and recorded in the documents listed under Source of Truth.

If you believe something should be changed, stop and request a human decision instead of changing it yourself.

### What Marzoq Is

Marzoq is not a traditional company website. It is a carefully designed digital experience whose purpose is to demonstrate how businesses can become easier for AI systems to discover, understand, and recommend.

The product statement is: **Marzoq helps businesses become the answer AI gives.**

Every page, component, animation, and interaction must support this single mission. If something does not support it, it should not exist.

---

## Mission

Build a production-quality implementation that faithfully follows the architecture.

Every implementation decision should make the experience:

- Simpler
- Faster
- Clearer
- More maintainable

Never make the product more complicated.

---

## Role

You **should**:

- Read the architecture.
- Understand it.
- Implement it.
- Preserve it.

You **should not**:

- Redesign it.
- Expand it.
- Replace it.
- Remove required behavior in the name of simplification.
- Add new product ideas.

---

## Source of Truth

Always follow the documents in the order below. A higher document always overrides a lower one. If two documents conflict, the higher-level document wins.

| Level | Document | Authority |
| ----- | -------- | --------- |
| 1 | `marzoq.architecture.md` | Highest. Defines product, principles, experience, content, and technical philosophy. Nothing may override it. |
| 2 | `marzoq.implementation.md` | Implementation decisions: technology stack, Astro, WordPress, JavaScript, performance, deployment. |
| 3 | `marzoq.design-system.md` | How interfaces are built: color, typography, components, motion, layout, responsive behavior. |
| 4 | `marzoq.visual.identity.md` | The visual identity: Compass, Ecosystem, motion language, orbital language, Query Pills, Platform Tokens. |

**Reading order for a fresh repository.** Before making any code change, read these in order. Never skip this step.

1. `README.md`
2. `AGENTS.md`
3. `PROJECT_STATE.md`
4. `marzoq.architecture.md`
5. `marzoq.implementation.md`
6. `marzoq.design-system.md`
7. `marzoq.visual.identity.md`
8. `IMPLEMENTATION_PLAN.md`
9. `homepage.specification.md`
10. `compass.component.canon.md`
11. `ecosystem.specification.md`

**Document authority levels.** Documents belong to one of three authority categories:

- **Architecture documents** (`marzoq.architecture.md`, `marzoq.implementation.md`, `marzoq.design-system.md`, `marzoq.visual.identity.md`) — define the product. Describe what Marzoq is, how it behaves, and what principles govern every decision. Read-only during implementation.
- **Component Canon documents** (`compass.component.canon.md`, `ecosystem.specification.md`) — define implementation authority for reusable systems. Specify exactly how a given component must be built. Supersede general architecture guidance for the specific component they describe.
- **Page Canon documents** (`homepage.specification.md`) — define implementation authority for complete pages. Specify how systems and components combine inside a specific page. Supersede general architecture guidance for the specific page they describe.

This repository intentionally contains little documentation. Missing documentation does not mean missing architecture — only permanent decisions are documented, and implementation details belong in code. Solve implementation problems in code whenever possible. Do not expand the architecture unless explicitly instructed.

---

## Working Principles

When two rules appear to conflict, resolve the conflict in this order. Higher principles always win.

1. **Architecture overrides every other document.** When anything conflicts with `marzoq.architecture.md`, the architecture wins.
2. **Simplicity overrides unnecessary complexity.** When a simpler solution fully satisfies the requirement, it wins.
3. **User experience overrides implementation convenience.** Never make the experience worse to make the code easier.
4. **Consistency overrides personal preference.** Match existing patterns instead of introducing your own.
5. **Human instructions override AI assumptions.** An explicit human decision always wins over anything you infer.

---

## Repository Structure

Each document has one responsibility. Know where information belongs before you look for it or add to it.

| Document | Responsibility |
| -------- | -------------- |
| `README.md` | Entry point. Explains the project and the role of every document. |
| `marzoq.architecture.md` | What the product is: product definition, principles, experience, content. The permanent source of truth. |
| `marzoq.implementation.md` | How the product is built: stack, tooling, and construction rules that serve the architecture. |
| `marzoq.design-system.md` | How the interface is built: design principles, color, type, layout, components, motion. |
| `marzoq.visual.identity.md` | How Marzoq is recognized: the Compass, Ecosystem, orbital motion, and visual signature. |
| `AGENTS.md` | This document. How AI agents must operate inside the repository. |
| `PROJECT_STATE.md` | Live status of implementation work. Tracks progress, not decisions. Expected to change frequently. |
| `IMPLEMENTATION_PLAN.md` | The build order: the phased sequence in which the product is implemented. The single source of implementation sequencing. |
| `homepage.specification.md` | Page Canon. Defines the complete composition and implementation authority for the Homepage. |
| `compass.component.canon.md` | Component Canon. Defines the complete implementation authority for the Compass component. |
| `ecosystem.specification.md` | Component Canon. Defines the complete implementation authority for the Ecosystem component. |

---

## Repository Boundaries

This section removes all ambiguity about what you may touch. Classify every file before editing it.

| Classification | Files | Rule |
| -------------- | ----- | ---- |
| **Read-Only** | `marzoq.architecture.md`, `marzoq.implementation.md`, `marzoq.design-system.md`, `marzoq.visual.identity.md`, `README.md` | Stable. Never modify unless a human explicitly instructs it. |
| **Operating Manual** | `AGENTS.md` | Treat as read-only during feature work. Edit only when explicitly asked to change agent rules. |
| **Roadmap** | `IMPLEMENTATION_PLAN.md` | The approved build order. Treat as read-only; change only when a human revises the plan. |
| **Living State** | `PROJECT_STATE.md` | Update to reflect the current status of work. Never record permanent decisions here. |
| **Generated / Historical** | Reports and audit files (e.g. `*_REPORT.md`) | Records of past work. Do not edit. |
| **Implementation** | Source code (e.g. `src/`, components, styles, scripts, config) | Fully editable. This is where your work happens. |
| **Temporary** | Scratch or experimental files | Must be removed before a task is complete. Never commit them. |
| **Future** | Files not yet created | Create only when instructed. Follow this document's rules when you do. |

Rules:

- The five Read-Only documents are the project's foundation. Changing them changes the product. That is a human decision.
- When implementation files do not yet exist, create them under the Implementation classification — never by editing the Read-Only documents.
- If a task seems to require editing a Read-Only file, stop and escalate (see Decision Matrix).

---

## Planning

Never start coding a complex task immediately. Large tasks always begin with planning.

Follow this workflow for every non-trivial task:

```
Understand
   ↓
Read
   ↓
Plan
   ↓
Identify affected files
   ↓
Estimate impact
   ↓
Implement
   ↓
Review
   ↓
Validate
   ↓
Complete
```

Before implementing any feature, answer these questions. If you cannot, read the architecture again.

- What am I building?
- Why does it exist?
- Which architectural decision requires it?
- Does this implementation preserve the architecture?

Before modifying any file, answer these:

- Why does this file exist, and what is its responsibility?
- What other files depend on it?
- Could this change affect other parts of the project?
- Should another file be updated together with it?

**Estimate impact** before writing code. Determine which files, components, and pages are affected, and whether the change influences responsive behavior, performance, accessibility, motion, SEO, or visual consistency. If it does, plan to review those areas before completing.

Never modify files blindly. Never jump directly to implementation.

---

## Architecture Rules

Assume the architecture is complete and already approved. Implementation evolves; architecture remains stable.

- Do not redesign, modernize, or "optimize" the architecture by changing its behavior.
- Technology serves the experience. Technology is never the goal.
- Never choose a solution because it is modern, popular, or used by another framework. Always choose the simplest solution that fully satisfies the architecture.
- Preserve existing behavior unless explicitly instructed otherwise. Do not silently change UX, animations, spacing, navigation, or interactions.
- Do not refactor without reason. Refactor only for measurable benefit: better readability, lower complexity, bug fixes, performance, or maintainability. Otherwise leave working code unchanged.

**If you are unsure:** never guess, never invent missing requirements, never create new product behavior. Stop, explain the uncertainty, and request clarification. An incorrect implementation is worse than an incomplete one.

---

## Design Rules

The interface is part of the product, not decoration. Every visual decision should improve understanding; if a visual element does not improve understanding, remove it.

### Experience and Simplicity

- The experience matters more than the appearance. Never make the interface more impressive at the cost of a worse experience.
- Visitors should always understand what to do next.
- Prefer less: less UI, fewer elements, fewer colors, less text, less motion. Never confuse complexity with quality.

### Single Viewport

This is one of the most important rules in the project. Experience Pages must fit inside one screen — no vertical scrolling, no horizontal scrolling.

If content no longer fits, do **not** increase page height or add scrolling. Instead:

- Reduce content.
- Improve the layout.
- Simplify the design.
- Prioritize information.

(Long-form content pages such as individual blog posts intentionally scroll, as defined in the architecture. The no-scroll rule applies to Experience Pages.)

### One Page, One Purpose

Every page exists for one primary objective. Never combine multiple unrelated goals on a single page. If a page starts communicating several ideas, simplify it.

### Consistency

All pages must feel like one product. Do not invent different visual styles for different pages. Typography, spacing, color, buttons, motion, cards, glass, and icons must all behave consistently.

### Color

Use only the approved color system. Every color must have a purpose — primary actions, hierarchy, feedback, or accessibility. Do not add random colors or colorful gradients, and never use color as decoration.

### Typography

Typography should be calm, readable, and professional, never decorative. Build hierarchy from weight, spacing, alignment, and structure — not from oversized text.

### Whitespace

Whitespace is part of the design; empty space creates hierarchy. Do not fill empty areas with unnecessary elements. If a layout feels empty, first ask whether the space is intentional before adding anything.

### Components

- Keep components small, reusable, independent, and easy to understand. Each component solves one problem. Avoid giant components with many responsibilities.
- Do not create a reusable component because it "might be useful later." Extract one only when it is actively reused in multiple places or when it clearly improves readability and maintainability.

### Visual Identity

The following elements are permanent and define the Marzoq brand. Never replace them with alternatives:

- **Compass** — the visual signature. Not decoration, not an illustration, not a logo replacement. Never redesign or replace it unless explicitly instructed, and never convert it to a static image if it is meant to stay interactive.
- **Ecosystem** — shows where Marzoq operates. Every floating element must have meaning; do not add random objects. Every orbit, token, query, and platform must belong to the ecosystem.
- **Query Pills** — represent real user questions. Never write fake marketing phrases; queries must look like questions real people ask.
- **Platform Tokens** — represent AI platforms. Keep them simple, recognizable, and secondary. They support the story; they are never the hero.
- **Space Grid** — creates depth and should almost disappear. Visitors should notice the experience, not the grid. Never make it visually dominant.
- **Glass** — separates layers and supports hierarchy. Glass is not the design. Keep it subtle; do not increase blur until readability suffers, and avoid heavy frosted effects.

### Motion

Motion exists to communicate, never to decorate. Every animation should answer at least one of: What changed? Where should attention move? What is connected? What is interactive? If it answers none of these, remove it.

- **Feel:** calm, natural, physical, smooth, continuous, intentional.
- **Avoid:** bounce, shake, flash, elastic movement, fast spinning, random movement, abrupt stops, and anything playful or distracting.
- **Prefer:** opacity, soft rotation, lerp, inertia, orbital movement, small scale changes, fade. Avoid large translations unless necessary.
- **Reduced motion:** always respect reduced-motion preferences. When enabled, disable non-essential animation — reduce movement only, never remove functionality.

### Responsive and Mobile

Desktop and mobile are the same product, not two designs. Layouts may change; content hierarchy must not. Do not simply shrink desktop layouts — reorganize them, preserve clarity, keep touch-friendly spacing, and avoid tiny interaction targets.

### Accessibility

Accessibility is required and must never be sacrificed for appearance. Always prefer semantic HTML, keyboard accessibility, readable typography, proper contrast, visible focus states, meaningful labels, and accessible motion. Do not build custom controls when native HTML already solves the problem.

### Content

Content educates before it promotes. Avoid buzzwords, empty claims, marketing clichés, and generic AI terminology. Prefer clear language, evidence, examples, and real outcomes. The experience should earn trust, not demand it.

### SEO and AI Discoverability

Every page must communicate one clear topic and be understandable by both humans and AI systems. Use semantic HTML, a logical heading structure, meaningful metadata, structured content, and a clear hierarchy. Never hide important information inside JavaScript.

---

## Technical Rules

These rules define how the project is implemented. Never replace these decisions with alternatives unless a human explicitly requests it.

### Frontend Stack

The approved stack is:

- Astro
- Vite
- HTML
- CSS
- Vanilla JavaScript (ES Modules)

Do not replace these technologies, migrate to another framework, or introduce React, Vue, Svelte, or similar — unless explicitly instructed.

### Backend

The backend is WordPress, used only for content management. WordPress does not render the frontend. Never move presentation logic or page layouts into WordPress, and never rely on WordPress themes for rendering. The frontend owns presentation; WordPress owns content.

The content interface between the Astro frontend and WordPress is the **WordPress REST API**. This is a canonical decision for Version 1. WPGraphQL is not used. No API abstraction should be written to support multiple CMS interfaces. Never pause implementation to re-evaluate the API choice — the decision is final.

### Styling

Use plain CSS. Do not introduce Tailwind, Bootstrap, or any UI framework. Organize styles clearly into global, layout, components, pages, and utilities. Keep styles readable; avoid unnecessary nesting and specificity.

### JavaScript

JavaScript exists only to improve the experience. Do not write JavaScript for what HTML or CSS already solve. Avoid unnecessary DOM manipulation, unnecessary state management, and large files. Keep every module focused.

### Animation Libraries

CSS and native browser APIs are preferred. GSAP is allowed only when it clearly produces a better implementation than CSS. Never add another animation library, and never use GSAP when CSS already solves the problem cleanly.

### Dependencies

Every dependency has a cost. Before adding one, ask whether it can be built with HTML, CSS, Vanilla JavaScript, or Astro. If yes, do not install it. Every dependency must justify its existence.

### Assets

Prefer SVG, WebP, and AVIF. Avoid unnecessary PNG and JPEG files. Keep interactive graphics vector-based, and never replace interactive SVG elements with static images.

### File Organization and Naming

- Group similar files together and give every file a clear purpose.
- Use descriptive names that state responsibility. Avoid names like `helpers2.js`, `temp.js`, `new.js`, `final.js`, `copy.js`, `latest.js`, `Thing`, `Object`, `Item`, `Component2`, `WidgetNew`, `TempData`.
- Component names should describe purpose, e.g. `Compass`, `Navigation`, `Hero`, `PlatformToken`, `QueryPill`, `Card`, `ContentBlock`.

### Components

- Each component has one responsibility. A single component must not mix layout, animation, navigation, business logic, data fetching, and rendering.
- Keep components independent: avoid deeply nested communication and hidden dependencies. Components should be easy to reuse, remove, and understand.
- Reuse existing components instead of duplicating functionality. If two components solve the same problem, consider merging them.

### Code Quality

- Write code for humans first. Assume another engineer reads it tomorrow. Readable code beats clever code.
- Avoid unnecessary abstraction and clever one-line solutions. Prefer clarity.
- Comments explain business rules, architectural decisions, and unusual details — not what the code already says. Do not write comments that merely repeat the code.

### Error Handling

Handle failures gracefully. Never allow silent failures. Show meaningful messages when appropriate, fail safely, and avoid breaking the experience.

### Performance

Performance is part of the product. Every implementation should consider network size, rendering speed, JavaScript size, animation smoothness, image optimization, and memory usage. Avoid expensive operations inside animation loops, unnecessary layout recalculations, and unnecessary re-rendering.

---

## Execution Workflow

Plan first (see Planning), then implement with discipline.

- **Scope control.** Stay inside the requested scope. If the task is "Update the Compass," do not refactor navigation, rename components, reorganize folders, change unrelated styles, or touch build configuration. Modify only files directly related to the requested work.
- **Small changes first.** Prefer several small changes over one massive change — they are easier to review, test, and revert. Do not rewrite large parts of the project unless explicitly requested.
- **Multi-file changes.** Identify all affected files first, then update them together. Never leave the repository in a partially updated state. Consistency matters more than speed.
- **Collaboration.** When multiple agents work in the repository, each owns one task. Avoid editing unrelated files, large formatting-only commits, and repository-wide changes. Keep changes isolated and easy for the next engineer to understand.
- **No placeholders.** Do not create placeholder implementations assuming they will be finished later, and do not add TODO comments instead of solving the problem, unless explicitly requested.

---

## Validation

After implementation, validate the work. Run each applicable check below. If a given tool or step does not exist in the repository, skip it — never invent tooling to satisfy a step.

- **Build** — the project builds successfully.
- **Lint** — no new lint errors.
- **Formatting** — code matches the project's formatting.
- **Responsive behavior** — layouts hold across desktop and mobile.
- **Accessibility** — semantics, contrast, focus states, and keyboard access are intact.
- **Performance** — no regression in load, rendering, or animation smoothness.
- **Broken imports** — all imports resolve.
- **Broken links** — internal links and references are valid.
- **Consistency** — the change matches existing patterns and terminology.

Then run the self-review below. If any answer reveals a problem, fix it before completing:

- Did I preserve the architecture, design system, and visual identity?
- Did I introduce unnecessary complexity, dependencies, or abstractions?
- Did I break responsive layouts or accessibility?
- Did I reduce performance?
- Did I duplicate existing code?

---

## Decision Matrix

Use this table to decide, in under a minute, what you may change on your own.

| Decision | AI May Decide |
| -------- | ------------- |
| Variable and function names | ✅ |
| File and folder organization | ✅ |
| Component extraction | ✅ |
| Internal implementation details | ✅ |
| CSS organization | ✅ |
| Animation implementation details | ✅ |
| Performance improvements | ✅ |
| Accessibility improvements | ✅ |
| Bug fixes, cleanup, refactoring | ✅ |
| New dependencies | ⚠️ Only if justified and unavoidable |
| Product behavior | ❌ |
| User experience and navigation | ❌ |
| Page goals | ❌ |
| Architecture | ❌ |
| Design language | ❌ |
| Visual identity | ❌ |
| Technology stack | ❌ |

The single gate: **does this change architecture, experience, or the design language?** If yes to any, stop and request approval. If it only improves implementation quality, proceed.

### Never Do This

These actions are always forbidden without explicit human instruction:

- Convert the project into a Single Page Application.
- Introduce React, Vue, Tailwind, or another framework.
- Replace the Astro + WordPress architecture or change the relationship between them.
- Replace interactive SVG elements with images.
- Add scrolling to Experience Pages.
- Invent or remove product features.
- Redesign layouts or rename architectural concepts.
- Replace the Compass or the Ecosystem.
- Change the Single Viewport philosophy.
- Duplicate existing components or replace simple solutions with complex ones.

### Escalation

When a task appears to require changing architecture, UX, the design system, the visual identity, the technology stack, or core product behavior: stop immediately. Do not guess, improvise, or redesign. Explain the problem clearly and request a human decision. These decisions belong to humans.

---

## Success Criteria

Every implementation should improve at least one of the following without degrading any of the others:

- Clarity
- Trust
- Simplicity
- Performance
- Maintainability
- Accessibility
- Consistency

These are the dimensions of a good change. Use them to guide engineering trade-offs. If a solution improves one of these while damaging another — for example, gaining performance at the cost of accessibility, or visual polish at the cost of simplicity — reconsider the solution before continuing. The best change moves one dimension forward and holds the rest steady.

---

## Completion Checklist

A task is not complete because the code compiles. It is complete only when every item below is true.

### Definition of Done

- ✓ The architecture, design system, and visual identity are preserved.
- ✓ The product behavior and user experience are unchanged.
- ✓ The implementation is simple, readable, and maintainable.
- ✓ No unnecessary dependency was added.
- ✓ Performance did not regress and accessibility was preserved.
- ✓ Validation checks pass (or were correctly skipped as not applicable).
- ✓ Another engineer can understand the solution quickly.

### Completion Report

After every task, prepare a short report so future engineers understand the change without reading every file:

- Task completed
- Files modified
- Reason for each change
- Architecture impact
- Performance impact
- Accessibility impact
- Responsive impact
- Dependencies added
- Known limitations
- Remaining work

---

## Engineering Philosophy

You are implementing an existing vision, not creating a new one. When the work forces a choice, choose in this spirit:

- Between **more features** and **a better experience** — choose the better experience.
- Between **more technology** and **a simpler solution** — choose the simpler solution.
- Between **speed** and **architectural correctness** — choose architectural correctness.
- Between **what you prefer** and **what the project already does** — choose the project.

Your responsibility is not to write more code. Your responsibility is to preserve the product.

A change that makes the product feel different is the wrong change. When in doubt, preserve the architecture. When still in doubt, ask for clarification instead of making assumptions.

Protect the architecture. Protect the experience. Protect the design system. Protect the visual identity.
