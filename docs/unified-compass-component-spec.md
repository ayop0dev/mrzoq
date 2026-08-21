# Unified Compass / Radar Component — Design Specification
**Status:** Description only — no implementation, no code. This document is the single source of truth for the design intent of the new component. It supersedes ad-hoc decisions; any implementation must be validated against this document.

**Context:** Replaces the legacy `.layer-ecosystem` + `.layer-compass` system (documented separately in `homepage-ecosystem-compass-audit.md`), which suffers from dual, uncoordinated center calculations. This new component is built from scratch as a single layer with one center and one coordinate logic, and does not modify or depend on the legacy files.

---

## 1. Core Principle: Single Center, Single Logic

Every visual element in this component — the needle, the radar rings, and every floating element — must derive its position from **one shared center point** and **one coordinate/scaling system**. There must be no independent center calculations between sub-systems. This is the direct fix for the root cause identified in the legacy audit (mismatched centers between Ecosystem and Compass).

Across breakpoints (mobile / tablet / desktop), all proportions must scale consistently from this one center so that no element visually "jumps" or misaligns when the viewport changes.

---

## 2. Visual Structure

### 2.1 Needle
- A single needle with a fixed pivot at the shared center point.
- Rotates freely through the full 360°.
- Not target-locked — it does not "snap to" or stop at specific elements. Its rotation/direction is continuous.

### 2.2 Radar Rings (concentric circles)
- Multiple concentric circles sharing the same center as the needle (revives the "radar" feel of the legacy design, but under the unified center logic).
- Rings are low-opacity overall — they must not visually compete with the needle or the floating elements.
- Opacity gradient across rings: **the ring closest to the center is the most visible; opacity decreases progressively for each ring further out** (a soft radar/depth effect).
- Rings serve as a loose visual reference for where floating elements sit — not every ring needs to host elements.

### 2.3 Floating Elements
- Fixed, evenly-spaced anchor points around the circle, distributed like clock positions (e.g., 12/3/6/9 and the positions between them) — not clustered only at top/bottom/left/right.
- Each element floats within a **small, bounded range** around its fixed anchor point:
  - Not static (must feel alive).
  - Not a full 360° orbit (must not travel around the whole circle).
  - A contained drift/breathing motion around its own anchor.
- Shape: an organic "pill" (rounded, flowing) container per element.
- Content: short phrases of **variable length** (mix of AI product names, SEO keywords, and search-engine names). Word count/length is not fixed.
- **Content must be manually editable** — the phrases/links for each floating element are a configurable field, not hardcoded in the component logic.
- **Width behavior:** the pill **expands with the word width**, constrained by a min/max width range, with a fallback of slight automatic font-size reduction if a phrase exceeds the max width. Pills must stay single-line — text must never wrap to a second line inside a pill (wrapping breaks the "flowing phrase" identity of the shape).
- **Brightness tiers:** each element is assigned one of **3 brightness levels** (dim / medium / bright) at rest. Assignment is **visually/artistically driven** — not tied to functional meaning (e.g., not strictly "AI names brighter than keywords"). Purpose: avoid visual clutter around the ring and create a sense of depth and cohesion.

---

## 3. Needle Motion Behavior

### 3.1 Baseline / Idle State (all devices)
Unified across every device: the needle rotates automatically, continuously, and slowly around the fixed center — a smooth, non-stepped sweep (reference: a diver's watch second hand — constant, calm rotation, never pausing between "ticks").

### 3.2 Desktop — Pointer Interaction Layer
On top of the baseline idle motion, desktop adds pointer-driven control: the needle follows the mouse position.
- If the needle passes near/over a floating element (by angle), that element's brightness increases (see Focus Behavior, Section 4).
- If the pointer is inactive for a period, the needle should fall back to the idle sweeping behavior (see Section 3.4).

### 3.3 Tablet / Mobile — Touch Interaction Layer
Touch adds an equivalent interaction layer on top of the same idle motion, using a **two-tap model** per floating element:

- **Tap 1 on an element** (first tap, or first tap after a different element was targeted): triggers interaction only — the needle animates smoothly toward that element's angle and the element's brightness increases (no link opens).
- **Tap 2 on the same element** (while it is still the currently targeted element): opens the element's link (`href`).
- **Tap on a different element** (regardless of prior state): cancels the previous target immediately and redirects the needle toward the new element as a fresh "Tap 1" — it does not open any link.
- **Conflict resolution for rapid multi-touch:** "last tap wins" — each new tap immediately supersedes any prior pending target; no queueing or accumulation of taps.
- **Idle reset rule:** if the needle returns to the idle/auto-rotating state (e.g., after a period of no interaction), any previously "targeted" element state is cleared. The next tap on any element — even one that was previously targeted — is treated as a brand-new "Tap 1."

### 3.4 Desktop Click Behavior
A single click on a floating element opens its link (`href`) directly — no two-step model needed, since hover/pointer proximity already provides the pre-interaction feedback.

### 3.5 Idle Fallback
Whenever there is no active pointer/touch interaction (mouse left the area, or touch interaction timed out), the needle returns to the unified baseline idle sweep described in 3.1. The component should always feel "alive," not paused, when untouched.

---

## 4. Focus / Brightness Behavior

- **Desktop:** as the needle passes over or points toward a floating element (by angular proximity), that element transitions to full brightness. As the needle moves away, the element fades back down gradually (not an abrupt cutoff) to its base tier level.
- **Micro-feedback:** when an element reaches full brightness (needle pointing at it, or touch-targeted on mobile), it should also receive a brief **pulse** (a subtle scale/emphasis animation) in addition to the brightness change — this gives a tactile sense of response, not just a lighting change.
- **Mobile/Tablet baseline (no touch):** floating elements simply rest at their assigned base brightness tier — there is no ambient/automatic lighting interaction as the needle idly sweeps past them. The brightness-on-proximity behavior on mobile is triggered **only** by the touch interaction described in Section 3.3, not by the idle needle rotation itself.

---

## 5. Linking Behavior (href)

- Each floating element can carry a link (`href`).
- **Desktop:** single click opens the link.
- **Mobile/Tablet:** governed by the two-tap model in Section 3.3 (first tap = interact, second tap on same element = open link, tap elsewhere = retarget).

---

## 6. Interactive "Game-like" Enhancements

To push the component from "animation" to something that feels interactive and game-like, the following are included in scope:

1. **Micro-feedback pulse** on focus/targeting (Section 4) — confirmed.
2. **Physical weight on the needle (desktop):** the needle should not track the pointer with instant 1:1 precision. A slight lag/inertia/friction in its tracking gives it a sense of physical weight, like a real compass needle, rather than an SVG element rigidly glued to the cursor.
3. Both of the above apply across devices where relevant (pulse: all devices via their respective interaction models; physical weight/inertia: primarily the desktop pointer-tracking layer, and also the needle's animated transition toward a touch-selected target on mobile).

*(Two additional ideas were discussed but not adopted for this version: a hidden/low-brightness "discovery" mechanic where elements reveal themselves progressively, and haptic/audio cues on interaction. These remain open ideas for a future iteration, not part of the current spec.)*

---

## 7. Responsiveness & Direction

- The entire layout (needle, rings, floating element anchor positions) must scale consistently across breakpoints from the single shared center (Section 1) — no independent per-breakpoint recalculation of center.
- **RTL/LTR mirroring:** the arrangement of floating elements around the circle must mirror when switching between RTL (Arabic, default) and LTR layouts.

---

## 8. Accessibility — Reduced Motion

`prefers-reduced-motion` must be respected, but motion is **not eliminated entirely** (full freeze was explicitly rejected — it undermines the concept, which is inherently motion-based). Instead:
- The needle's idle sweep continues, but at a significantly slower rate.
- Floating elements' drift/breathing motion is reduced to a minimal/near-imperceptible amount rather than stopped completely.
- Goal: honor the accessibility preference (avoid strong, continuous motion for users sensitive to it) while keeping the component visibly "alive."

---

## 9. Explicitly Out of Scope / Rejected for This Version

- Full 360° orbiting of floating elements (legacy behavior) — replaced by bounded drift around fixed anchors.
- Static, non-floating elements — rejected, "kills the concept."
- A single plain ring/outline — rejected in favor of concentric radar rings.
- Complete motion freeze under reduced-motion — rejected in favor of significantly reduced motion.
- Discovery/reveal mechanic and haptic/audio feedback — noted as good future ideas, not included now.
- Functional (meaning-based) brightness tier assignment — rejected in favor of an artistic/visual-balance-driven assignment.

---

## 10. Open Items for Implementation Phase

These are intentionally left for the build/runtime phase, not decided here:
- Exact number of floating elements and their final phrase content (configurable, manually editable field).
- Exact min/max pill width values and font-size reduction thresholds.
- Exact number and spacing of concentric rings, and precise opacity values for the gradient.
- Exact easing/inertia values for the needle's "physical weight" behavior.
- Exact idle-timeout duration before falling back from active interaction to baseline sweep.
