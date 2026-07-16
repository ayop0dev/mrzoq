# Marzoq Implementation Decisions

This document records the practical choices that build Marzoq: the stack, the tools, and the rules of construction. It answers *how* — and it serves the permanent decisions in marzoq.architecture.md, never overrides them. When a choice here conflicts with the architecture, the architecture wins.

Every decision below stays lightweight by default. A technology earns its place only when it improves the experience or accelerates development.

---

# Architecture Model

Marzoq is built as a Headless WordPress application.

The project consists of two independent parts:

**Frontend**

Responsible for the complete visual experience.

**WordPress Backend**

Responsible for content management only.

The frontend should never depend on WordPress rendering.

WordPress exists as a content source rather than a presentation layer.

---

# Frontend Stack

The selected frontend stack is:

* Astro
* Vite
* HTML
* CSS
* JavaScript ES Modules

Astro is selected because it produces extremely fast server-rendered pages while shipping almost no unnecessary JavaScript.

The project is intentionally not a Single Page Application.

---

# WordPress

WordPress is responsible for:

* Services
* Portfolio
* Blog
* Media Library
* SEO Metadata
* Content Management

WordPress is the content management system only.

WordPress does not render pages.

WordPress does not control presentation.

WordPress does not execute frontend logic.

Prohibited:
* No visual page builders
* No frontend/presentation logic
* No theme-based rendering
* No direct control of page layout

The frontend (Astro) owns all presentation and rendering.

---

# Styling

Use plain CSS.

No utility-first framework is required.

Styles should remain organized around:

* Global Design Tokens
* Layout
* Components
* Pages
* Utilities

---

# JavaScript

Use Vanilla JavaScript with ES Modules.

JavaScript should only power interactive experiences such as:

* Compass
* Ecosystem
* Motion
* Navigation
* UI interactions

Avoid unnecessary client-side complexity.

---

# Motion

Motion is part of the product experience.

Preferred technologies:

* CSS Animations
* CSS Transitions
* Web Animations API
* GSAP when advanced motion improves the experience

GSAP is an approved dependency and may be used whenever it produces cleaner, more maintainable animation than native browser APIs.

---

# Components

The frontend should remain component-driven.

Components should be:

* Small
* Independent
* Reusable
* Easy to understand

Avoid deep component hierarchies.

---

# Page Types

The website contains three primary page categories.

## Experience Pages

Examples:

* Homepage
* About
* Contact
* Service Pages

These pages follow the Single Viewport principle.

No vertical scrolling.

The complete message should be visible immediately.

---

## Content Pages

Examples:

* Individual Blog Posts

These pages intentionally support vertical scrolling.

Long-form educational content is part of the product strategy.

Reading should feel comfortable and uninterrupted.

---

## Archive Pages

Examples:

* Blog Listing
* Portfolio Listing
* Services Listing

These pages should remain lightweight, easy to scan, and quickly direct visitors toward individual content.

---

# Assets

Preferred formats:

* SVG
* WebP
* AVIF

The compass and ecosystem should always remain vector-based and interactive.

Never replace them with static images.

---

# Content API

Marzoq V1 uses the **WordPress REST API** as the only content interface between the Astro frontend and the WordPress backend.

The WordPress REST API is the canonical implementation decision. It is not a placeholder and is not subject to revision in Version 1.

WPGraphQL is not part of Version 1. No abstraction should be written to support multiple CMS APIs. The implementation should assume the WordPress REST API from the beginning.

If a future version adopts a different API, that will be an architectural decision for that future version.

---

# SEO & AI Discoverability

Every page should communicate one clear topic.

Frontend and WordPress should work together to provide:

* Semantic HTML
* Structured Data
* Open Graph
* Metadata
* Canonical URLs
* Clean Information Hierarchy

The objective is to make Marzoq easily understood by both search engines and AI systems.

---

# Analytics

Google Analytics is the primary analytics platform.

No custom analytics system is required in Version 1.

Only meaningful events should be tracked.

Avoid unnecessary measurement.

---

# Performance

Performance is a product requirement (see Product Principles). In practice that means optimizing for:

* Fast First Paint
* Minimal JavaScript
* Optimized Assets
* Stable Layout
* Smooth Motion
* Lazy Loading where appropriate

Every dependency must justify its existence.

---

# Deployment

Frontend and WordPress should remain independently deployable.

Frontend deployment should remain automatic.

WordPress should only require content publishing.

The architecture should allow frontend updates without affecting the CMS.

---

# Development Rules

* Keep the code simple.
* Prefer readability over cleverness.
* Avoid unnecessary dependencies.
* Preserve the Single Viewport philosophy.
* Preserve the Compass and Ecosystem as core experience elements.
* Build reusable components without over-engineering.

---

# Canonical Decisions

* Marzoq uses a Headless WordPress architecture.
* WordPress is the content engine, not the presentation layer.
* Astro is the frontend framework.
* Vite is the build system.
* Vanilla CSS is the styling approach.
* Vanilla JavaScript powers interactions.
* GSAP is an approved animation library.
* Google Analytics is the analytics solution.
* Homepage, About, Contact, and Service pages follow the Single Viewport principle.
* Individual blog articles intentionally support vertical scrolling.
* The frontend remains independent from the CMS.
* Performance and simplicity take priority over technical complexity.
* The WordPress REST API is the canonical content interface for Version 1. WPGraphQL is not used.
