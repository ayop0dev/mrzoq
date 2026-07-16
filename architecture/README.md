# Marzoq.com — Architecture

This directory is the single source of truth for the Marzoq.com project — the product, technical, and visual decisions made before development begins. Every design, engineering, and content decision should align with these documents.

---

# Philosophy

Marzoq is not a traditional company website. It is a carefully designed digital experience that demonstrates how businesses can become easier for AI systems to discover, understand, and recommend — the future, understood from the first second.

---

# Deliberately Lightweight

This architecture is intentionally small, and meant to stay that way.

It avoids over-engineering on purpose. When a question comes up during the build, prefer implementing the answer over expanding these documents. Add to the architecture only when a **permanent** decision needs to be recorded — one that future implementation must obey. Everything else belongs in code.

The architecture stays stable. Implementation evolves around it; it does not modify it.

---
## AI Contributors

AI coding agents must read `AGENTS.md` before making any implementation changes.

# Documentation

## README.md

This document. The entry point and map to every other document.

---

## marzoq.architecture.md

The primary architectural document.

Defines:

* Product Definition
* Product Principles
* Experience Architecture
* Content Architecture
* Technical Architecture

This document should always be read first among the architecture set.

---

## marzoq.implementation.md

Defines all implementation choices.

Includes:

* Frontend Stack
* Headless WordPress Architecture
* Development Rules
* Performance Strategy
* Deployment Decisions

This document translates architecture into implementation.

---

## marzoq.design-system.md

Defines the design language of the product.

Includes:

* Design Principles
* Colors
* Typography
* Layout
* Components
* Motion
* Responsive Rules

This document ensures visual consistency.

---

## marzoq.visual.identity.md

Defines the visual signature of Marzoq.

Includes:

* Compass
* Ecosystem
* Query Pills
* Platform Tokens
* Orbital Language
* Motion Language

This document protects the unique identity of the product.

---

## AGENTS.md

The AI operating manual.

Defines how AI agents work inside the repository: source of truth, boundaries, planning, validation, and decision authority.

---

## PROJECT_STATE.md

The live status of the project.

Tracks the current phase, priority, and progress. Expected to change frequently.

---

## IMPLEMENTATION_PLAN.md

The build order.

Defines the phased sequence in which the product is implemented. The single source of implementation sequencing.

---

# Reading Order

New contributors should read the documents in the following order:

1. README.md
2. AGENTS.md
3. PROJECT_STATE.md
4. marzoq.architecture.md
5. marzoq.implementation.md
6. marzoq.design-system.md
7. marzoq.visual.identity.md
8. IMPLEMENTATION_PLAN.md
9. homepage.specification.md
10. compass.component.canon.md
11. ecosystem.specification.md

## Document Authority Levels

**Architecture documents** define the product. They describe what Marzoq is, how it behaves, and what principles govern every decision. They are read-only during implementation.

**Component Canon documents** define implementation authority for reusable systems. They specify exactly how a given component must be built. The Compass and Ecosystem canon documents are in this category.

**Page Canon documents** define implementation authority for complete pages. They specify how the systems and components combine inside a specific page. `homepage.specification.md` is in this category.

---

# Guiding Principles

The principles that govern every decision are defined once, in **marzoq.architecture.md → Product Principles**. They are not repeated here.

---

# Project Status

**Architecture Phase: Complete.** The project is ready for implementation.

Future changes should refine the implementation without changing the architectural principles, unless a new architecture phase is explicitly started.
