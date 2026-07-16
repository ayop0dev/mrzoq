# IMPLEMENTATION_PLAN.md

# Marzoq.com — Implementation Plan

This document defines the implementation order for the Marzoq.com repository.

It answers one question:

**In what order should the project be built?**

It does not define the architecture.

It does not replace the design system.

It does not define implementation details.

Its purpose is to provide a safe, logical sequence for building the product.

Every implementation task should follow this plan unless a human explicitly decides otherwise.

---

# Philosophy

The implementation order exists to reduce risk.

Each phase builds the foundation required by the next phase.

Avoid building features before the systems they depend on exist.

Always build from the inside out.

Foundation before components.

Components before pages.

Pages before optimization.

Optimization before release.

---

# Guiding Principles

Every phase should produce a stable foundation for the next.

Avoid temporary implementations.

Avoid duplicate work.

Avoid placeholder systems.

Avoid rewriting completed work.

Each completed phase should require minimal future modification.

---

# Canonical Execution Order

Phases must be executed in the following order regardless of their numeric labels:

```
Phase 0
↓
Phase 1
↓
Phase 3
↓
Phase 2
↓
Phase 4
↓
Phase 5
↓
Phase 6
↓
Phase 7
↓
Phase 8
↓
Phase 9
↓
Phase 10
↓
Phase 11
↓
Phase 12
```

Although Phase 3 appears later numerically, it must be implemented before Phase 2 because the Core Experience Components depend on the shared Motion System.

The numbering represents logical grouping rather than mandatory numeric execution order.

An autonomous agent must always follow the sequence above rather than the numeric order.

---

# Phase 0

## Repository Preparation

Objective

Prepare the repository for development.

Deliverables

* Initialize Astro project.
* Configure project structure.
* Configure Vite.
* Configure code formatting.
* Configure linting.
* Configure path aliases if required.
* Configure environment management.
* Configure Git ignore rules.

Exit Criteria

The repository can be built successfully.

No application features exist yet.

---

# Phase 1

## Foundation

Objective

Build the global foundation shared by every page.

Deliverables

* Global CSS
* Design Tokens
* Typography
* Color System
* Layout System
* Responsive Breakpoints
* Utility Classes
* Global Animations
* Global Assets

Exit Criteria

Every future page can be built using the shared foundation.

---

# Phase 2

## Core Experience Components

Objective

Build the reusable components that define the Marzoq experience.

Prerequisites

* Phase 1 (Foundation) must be complete.
* Phase 3 (Motion System) must be complete or available for component integration.

Deliverables

* Compass
* Ecosystem
* Query Pills
* Platform Tokens
* Navigation
* CTA Buttons
* Cards
* Glass Components
* Content Blocks

Exit Criteria

Core components are reusable and independent.

No page-specific logic exists.

All components integrate with the motion system from Phase 3.

---

# Phase 3

## Motion System

Objective

Implement the shared motion language that components depend on.

Prerequisites

* Phase 1 (Foundation) must be complete.

Dependents

* Phase 2 (Core Experience Components) requires the motion system for Compass, Ecosystem, and interactive elements.

Deliverables

* Motion utilities
* Lerp utilities
* Orbital movement
* Inertia
* Interaction helpers
* Reduced-motion support

Exit Criteria

Motion behaves consistently across the project.

All motion utilities are ready for component integration in Phase 2.

---

# Phase 4

## CMS Integration

Objective

Connect the frontend with WordPress and establish content delivery.

Prerequisites

* Phase 1 (Foundation) must be complete.
* Phase 2 (Core Experience Components) must be complete.
* WordPress REST API available (the canonical content interface for Version 1).

Dependents

* Phase 5–8 (Page Building) require content from WordPress.

Deliverables

* Content API integration
* Services content fetching
* Blog content fetching
* Portfolio content fetching
* SEO Metadata integration
* Media management
* Error handling

Exit Criteria

Frontend successfully fetches all required content from WordPress.

WordPress remains presentation-independent and content-only.

Content is structured and accessible for page building phases.

---

# Phase 5

## Homepage

Objective

Build the flagship experience.

Priority

Highest.

The homepage defines the quality and vision of the product.

Prerequisites

* Phase 1 (Foundation) must be complete.
* Phase 2 (Core Components) must be complete.
* Phase 3 (Motion System) must be complete.
* Phase 4 (CMS Integration) must be complete.

Deliverables

* Complete homepage implementation
* Single Viewport experience
* Full Compass and Ecosystem integration
* All core components in production

Exit Criteria

Homepage communicates the complete Marzoq story.

Homepage demonstrates the quality and expertise of Marzoq.

Homepage fits within a single viewport with no scrolling.

---

# Phase 6

## Experience Pages

Objective

Build all experience-focused pages using the foundation and components from earlier phases.

Prerequisites

* Phase 5 (Homepage) must be complete or in progress.

Includes

* About
* Services
* Contact

Exit Criteria

Every page follows the Single Viewport philosophy.

Every page fits within a single viewport with no scrolling.

Experience pages use consistent visual language and components.

---

# Phase 7

## Content Pages

Objective

Build content-oriented pages with long-form reading experiences.

Prerequisites

* Phase 4 (CMS Integration) must be complete.

Includes

* Blog Posts
* Portfolio Cases

Exit Criteria

Reading experience is comfortable and uninterrupted.

Content pages support vertical scrolling as designed.

Content remains entirely CMS-driven.

---

# Phase 8

## Archive Pages

Objective

Build lightweight content listing pages that direct visitors toward content.

Prerequisites

* Phase 7 (Content Pages) must be in progress or complete.

Includes

* Blog Listing
* Services Listing
* Portfolio Listing

Exit Criteria

Archive pages are lightweight and easy to scan.

Navigation directs visitors efficiently toward individual content.

---

# Phase 9

## SEO & AI Discoverability

Objective

Ensure every page is discoverable and understandable by search engines and AI systems.

Prerequisites

* Phase 8 (Archive Pages) must be complete.

Deliverables

* Metadata
* Structured Data (Schema.org)
* Open Graph metadata
* Canonical URLs
* Sitemap
* Robots.txt
* Semantic HTML validation

Exit Criteria

Every page is understandable by both search engines and AI systems.

All metadata is complete and correct.

No broken canonical URLs or missing metadata.

---

# Phase 10

## Performance Optimization

Objective

Optimize the finished product for speed, responsiveness, and efficiency.

Prerequisites

* Phase 9 (SEO & Discoverability) must be complete.

Deliverables

* Image optimization (WebP, AVIF)
* JavaScript optimization
* Lazy loading implementation
* Animation performance optimization
* Bundle optimization
* Rendering performance optimization

Exit Criteria

Performance targets are satisfied.

Core Web Vitals meet production targets.

All pages load and render efficiently.

---

# Phase 11

## Quality Assurance

Objective

Verify the complete product meets all requirements and quality standards.

Prerequisites

* Phase 10 (Performance Optimization) must be complete.

Validation

* Responsive design across all breakpoints
* Accessibility (WCAG AA)
* Performance (Core Web Vitals)
* Motion quality and smoothness
* Navigation and user flows
* CMS Integration correctness
* SEO and metadata completeness
* Browser compatibility

Exit Criteria

No critical issues remain.

All tests pass.

Product is ready for production deployment.

---

# Phase 12

## Production Release

Objective

Deploy the first production version and establish live monitoring.

Prerequisites

* Phase 11 (Quality Assurance) must be complete.

Deliverables

* Production build
* Deployment to production environment
* Analytics verification
* Final smoke test
* Monitoring setup

Exit Criteria

Version 1 is live in production.

All systems are operational.

Analytics are tracking correctly.

---

# Rules

Never skip phases.

Never build later phases before earlier ones are stable.

Never optimize unfinished systems.

Never duplicate functionality.

Never redesign completed architecture during implementation.

If a phase reveals an architectural problem,

stop implementation and request an architectural decision instead of inventing one.

---

# Definition of Progress

A phase is complete only when:

* Its exit criteria are satisfied.
* Its deliverables are complete.
* It does not require temporary workarounds.
* It provides a stable foundation for the next phase.

Incomplete phases should never be considered finished.

---

# Final Principle

The goal of implementation is not to write code as quickly as possible.

The goal is to build a stable product that faithfully implements the approved architecture.

Every phase should make the next phase easier.

Every decision should reduce future complexity.

The architecture is complete.

The implementation should respect it.
