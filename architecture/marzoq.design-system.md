# Marzoq.com — Design System

This is the toolkit for building the interface. It defines the reusable rules — color, type, layout, components, motion timing — that turn the architecture into pixels. It answers *how do we build the interface?* For what those pixels should make people feel and recognize, see marzoq.visual.identity.md.

---

# 1. Design Principles

These are not tokens. They are the decision rules that resolve any visual choice before it reaches a value. When in doubt, choose the left side.

* **Experience before Interface** — build for how it feels to use, not how it looks in isolation.
* **Clarity before Decoration** — every element earns its place by aiding understanding.
* **Geometry before Illustration** — express ideas with simple shapes, not drawings.
* **SVG before Image** — prefer vector and motion over static bitmaps.
* **Motion before Animation** — move things to inform, never to perform.
* **Space before Detail** — let whitespace carry hierarchy before adding ornament.
* **Calm before Emphasis** — quiet by default; emphasize only what matters most.
* **System before Exception** — reach for a defined pattern before inventing a new one.

---

# 2. Design Tokens

## Spacing Scale

To be defined in Phase 1 (Foundation) as the first deliverable before component building.

Recommendation: Use an 8px base unit with a scale such as 8, 16, 24, 32, 48, 64, 80, 96px.

---

## Typography Sizes

To be defined in Phase 1 (Foundation) before any components are built.

Recommendation: Establish a harmonious scale using the Thmanyah typeface with sizes such as 12px, 14px, 16px, 18px, 20px, 24px, 32px, 40px based on the available viewports.

---

## Border Radius

To be defined in Phase 1 (Foundation).

Recommendation: Use a limited scale such as 4px, 8px, 12px, 16px to maintain visual consistency.

---

## Responsive Breakpoints

To be defined in Phase 1 (Foundation) before responsive layouts are built.

Recommendation: Define mobile, tablet, and desktop breakpoints (e.g., mobile: 320px–767px, tablet: 768px–1199px, desktop: 1200px+).

---

# 3. Color System

## Primary

```css
#065830
```

Used for:

* Primary typography
* Compass
* Icons
* Lines
* Interactive states
* Brand identity

---

## Background

```css
#EADED2
```

Used as the primary canvas.

The background remains calm and allows interface elements to breathe.

---

## Supporting Colors

Supporting colors are deliberately limited. Only introduce accent colors when they measurably improve hierarchy or user interaction.

Do not use decorative colors. Every supporting color serves a functional purpose.

The interface remains calm and restrained. Colorfulness is avoided.

---

# 4. Typography

Primary Typeface

Thmanyah

Weights

* 400
* 500
* 600
* 700
* 800

Typography should remain highly readable.

Hierarchy should rely on weight and spacing rather than excessive font sizes.

---

# 5. Layout

Experience Pages follow the Single Viewport principle defined in the architecture: layouts adapt to the available space rather than scroll.

Content Pages (such as blog posts) intentionally support vertical scrolling for long-form reading.

Archive Pages remain lightweight, easy to scan, and direct visitors toward individual content.

Whitespace is part of the design. Negative space is preserved intentionally, never filled by default.

---

# 6. Components

The interface is built from a small component library.

Core components include:

* Compass
* Ecosystem
* Navigation
* Query Pills
* Platform Tokens
* CTA Buttons
* Cards
* Content Blocks

No component should exist without a clear purpose.

---

# 7. Motion

This is the catalog of approved motion for building the interface. What motion *means* for the brand is defined in the Visual Identity; here we define how it behaves.

Characteristics:

* Slow
* Smooth
* Natural
* Continuous
* Intentional

Preferred behaviors:

* Lerp
* Inertia
* Orbital Drift
* Fade
* Scale
* Soft Rotation

Avoid:

* Aggressive easing
* Bounce
* Flash
* Random movement

---

# 8. Visual Language

These are the surface treatments used to build any element. The meaning behind them — glass, geometry, depth — is defined in the Visual Identity.

Prefer:

* SVG
* Thin strokes
* Soft shadows
* Large radius
* Blur
* Glass surfaces
* Clean spacing

Avoid:

* Heavy gradients
* Thick borders
* Loud effects
* Excessive glow
* Skeuomorphism

---

# 9. Imagery

Following *SVG before Image*, prefer vector, icons, motion, and geometry to carry the message.

Photography stays secondary and never dominates the frame.

---

# 10. Responsive Design

Layouts reorganize across devices, but the product experience remains identical. Desktop and mobile are two arrangements of one design, never two separate designs.

---

# 11. Accessibility

Typography should remain readable.

Contrast should remain sufficient.

Interactive elements should provide clear visual feedback.

Motion should respect reduced-motion preferences whenever possible.

---

# 12. Canonical Decisions

* Use the Thmanyah typeface.
* Use #065830 as the primary brand color.
* Use #EADED2 as the primary background.
* Preserve the Single Viewport philosophy.
* Prefer SVG over bitmap graphics.
* Motion should always feel natural.
* Components should remain minimal and reusable.
* Every visual element must support the product experience.
