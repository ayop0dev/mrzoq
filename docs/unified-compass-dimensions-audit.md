# Unified Compass — Dimensions and Spacing Audit

**Scope:** `src/components/unified-compass/UnifiedCompass.astro`, `src/pages/unified-compass-preview.astro`, `src/scripts/unified-compass/config.js`, `src/scripts/unified-compass/distribution.js`, `src/scripts/unified-compass/runtime.js`, plus the global CSS that reaches the preview page (`src/styles/global.css`, `src/styles/tokens.css`, loaded transitively via `src/layouts/BaseLayout.astro`).
**Method:** static reading of the exact shipped source, plus re-implementing and running `distribution.js`'s exact algorithm against the shipped `config.js` values to get precise pixel figures (not estimates) for Sections 4–5. No files were modified.

---

## 1. Component size

**Formula (identical for width and height):**
```css
width: clamp(var(--uc-size-min), var(--uc-size-preferred), var(--uc-size-max));
height: clamp(var(--uc-size-min), var(--uc-size-preferred), var(--uc-size-max));
```
`--uc-size-min`, `--uc-size-preferred`, `--uc-size-max` are injected as inline styles on the root `.unified-compass` div directly from `config.js`'s `size` object (`UnifiedCompass.astro:43`):

| Token | Value |
|---|---|
| `--uc-size-min` | `220px` |
| `--uc-size-preferred` | `46vw` |
| `--uc-size-max` | `460px` |

Because width and height use the byte-identical expression, the box is a perfect square by construction at every viewport — the CSS never needs to know the actual viewport height to guarantee this.

**States and the viewport widths where they apply** (`46vw` is `0.46 × window.innerWidth` in CSS px):

| State | Condition | Viewport width (`VW`) range |
|---|---|---|
| Minimum (floor, 220px) | `46vw ≤ 220px` | `VW ≤ 478.26px` |
| Fluid (`46vw`) | `220px < 46vw < 460px` | `478.26px < VW < 1000px` |
| Maximum (ceiling, 460px) | `46vw ≥ 460px` | `VW ≥ 1000px` |

These are exact breakpoints solved from `0.46 × VW = 220` and `0.46 × VW = 460` respectively. This is a single continuous formula — there is no separate "mobile/tablet/desktop" CSS rule for the component's own size (that concept only exists inside `config.js`'s `responsive.modes`, which is a distribution/content model, not a sizing model — see Section 6).

---

## 2. Preview-page layout

Source: `unified-compass-preview.astro:37–76`.

```text
<BaseLayout>                          (no width constraint added; body reset only)
  <main class="uc-preview">           display: flex; flex-direction: column; min-height: 100dvh
    <div class="uc-preview__toolbar">  display: flex; align-items: center; padding: 16px 24px; gap: 16px
    <div class="uc-preview__stage">    flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px
      <UnifiedCompass />                (the component audited in Section 1)
```

| Property | `.uc-preview` (parent-of-parent) | `.uc-preview__stage` (immediate parent) |
|---|---|---|
| Width | Not set — a block-level `<main>`, defaults to 100% of `<body>`'s content width (which itself has no explicit width in `global.css`, so it fills the viewport width minus any scrollbar) | Not set directly — stretches to the full width of `.uc-preview` because `.uc-preview` is a column flex container and its default `align-items` (cross-axis, i.e. horizontal here) is `stretch` |
| Height | `min-height: 100dvh` | Not set directly — `flex: 1` makes it grow to consume all vertical space in `.uc-preview` left over after the toolbar's own rendered height |
| Display mode | `flex`, `flex-direction: column` | `flex` (row, the default), children centered on both axes |
| Horizontal alignment of `<UnifiedCompass>` | — | `justify-content: center` |
| Vertical alignment of `<UnifiedCompass>` | — | `align-items: center` |
| min-height | `100dvh` (dynamic viewport height — accounts for mobile browser chrome show/hide) | none set explicitly (governed by `flex: 1` against the parent) |
| Overflow | Not set (default `visible`) | Not set (default `visible`) |

**Overflow behavior:** neither `.uc-preview` nor `.uc-preview__stage` sets `overflow`. If the toolbar + the centered compass + the stage's own padding together exceed `100dvh`, nothing clips — the page simply grows taller than the viewport and the browser's normal vertical scrollbar appears (this is standard in-flow overflow, not a clipped/hidden overflow). `body` (`global.css:46–59`) sets `overflow-x: hidden` only — horizontal only, and unrelated to this component's own vertical growth.

---

## 3. Surrounding spacing

Every margin/padding/gap that touches the component or any of its ancestors, and what produces it:

| Space | Value | Source | Category |
|---|---|---|---|
| Toolbar padding | `16px` (top/bottom), `24px` (left/right) | `.uc-preview__toolbar { padding: var(--space-2) var(--space-3); }` | **padding** |
| Toolbar internal gap | `16px` between the button and hint text | `.uc-preview__toolbar { gap: var(--space-2); }` | **gap** (flex gap) |
| Stage padding | `32px` on all four sides | `.uc-preview__stage { padding: var(--space-4); }` | **padding** |
| Space between toolbar and stage | Not a `gap` value — there is none set on `.uc-preview` (the column flex parent). The visual separation is simply the toolbar's own bottom padding edge (16px, already counted above) directly followed by the stage's own top padding edge (32px, already counted above); the two boxes are adjacent in normal flex flow with nothing between them. | `.uc-preview` has no `gap` property | **not applicable — no separate gap exists here** |
| Free space around the compass inside the stage | Variable — whatever remains in the stage's content box after its 32px padding, split evenly by flex centering | `.uc-preview__stage { align-items: center; justify-content: center; }` | **flex alignment / remaining free space** (not margin, not padding — see Section 4 for exact figures and Section 6 for the distinction) |
| Margin on `.unified-compass` or any ancestor in this chain | `0` everywhere | The universal reset in `global.css:14–20` (`*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }`) zeroes any browser default; none of `.uc-preview`, `.uc-preview__toolbar`, `.uc-preview__stage`, or `.unified-compass` adds a margin back | **none present** |
| Padding on `.unified-compass` itself | `0` | Not set in `UnifiedCompass.astro`'s own `<style>` block; reset applies | **none present** |
| `body` spacing | `0` margin/padding; `overflow-x: hidden` only | `global.css:46–59` | **none (reset only)** |

So, concretely: every fixed spacing value between the compass and the page edge is **padding** (16/24px on the toolbar, 32px on the stage). Every value that changes with viewport size is **flex-centering remainder**, not a spacing token at all.

---

## 4. Responsive values at the requested viewports

Component size = `clamp(220px, 46vw, 460px)` (Section 1). Active mode = `distribution.js`'s `resolveMode()` applied to that computed size against `config.js`'s `responsive.modes` thresholds (smallMobile ≤240px, mobile ≤300px, tablet ≤380px, desktop >380px — see Section 6 for why this is size-based, not viewport-based).

Horizontal free space per side = `32px` (stage padding, fixed) + `(stageContentWidth − componentSize) / 2` (flex-centering remainder), where `stageContentWidth = VW − 64px` (VW minus the stage's own left+right padding), assuming no vertical scrollbar consumes viewport width (a caveat — see note below the table).

| Viewport (`W×H`) | `46vw` raw | Component W×H | Active mode | Left/right free space (padding + centering) | Preview-wrapper padding (fixed, non-responsive) |
|---|---|---|---|---|---|
| 1440×900 | 662.4px | **460×460px** (ceiling) | **desktop** | `32px + 458px = 490px` each side | toolbar 16/24px · stage 32px |
| 1024×768 | 471.0px | **460×460px** (ceiling) | **desktop** | `32px + 250px = 282px` each side | toolbar 16/24px · stage 32px |
| 768×1024 | 353.28px | **353.28×353.28px** (fluid) | **tablet** | `32px + 175.36px = 207.36px` each side | toolbar 16/24px · stage 32px |
| 390×844 | 179.4px | **220×220px** (floor) | **smallMobile** | `32px + 53px = 85px` each side | toolbar 16/24px · stage 32px |
| 360×800 | 165.6px | **220×220px** (floor) | **smallMobile** | `32px + 38px = 70px` each side | toolbar 16/24px · stage 32px |
| 320×568 | 147.2px | **220×220px** (floor) | **smallMobile** | `32px + 18px = 50px` each side | toolbar 16/24px · stage 32px |

None of the requested viewports lands in the `mobile` mode band (240–300px component size) — that would require a viewport roughly between 522px and 652px wide (solving `46vw` against those thresholds), which isn't among the six given.

**Top/bottom free space — only partially determinable from CSS alone.** The formula is the same shape (`32px` stage padding + a centering remainder), but the remainder depends on `stageHeight = 100dvh − toolbarRenderedHeight`, and `toolbarRenderedHeight` is **not** computable from CSS alone: the toolbar has `flex-wrap: wrap` around a button and a `max-width: 60ch` hint sentence, so whether it renders on one line or wraps to two-plus lines depends on actual glyph widths at the current viewport — a real rendering fact, not a CSS constant. Additionally, `100dvh` itself is a live value (it accounts for mobile browser chrome showing/hiding), not a fixed number derivable from the stated `H` values.
- For the two widest viewports (1440×900, 1024×768), the toolbar very likely fits on one line (ample width for the button + one-line hint), giving an estimated toolbar height in the rough 70–75px range (16px+16px padding + a ~24px text line + button padding) — this is a **rendering estimate**, not a computed value, and is flagged as such.
- For 768×1024 and all three narrow viewports (390/360/320), the hint sentence is likely to wrap to 2–3 lines given the available width, making the toolbar meaningfully taller and the resulting top/bottom free space **not reliably determinable without opening a browser**.

*Caveat on horizontal figures above:* they assume the vertical scrollbar (if the page's total height exceeds the viewport) consumes 0px of horizontal width. Real browsers vary (traditional desktop scrollbars typically take ~15–17px; many mobile/overlay scrollbars take 0px). Where a page ends up taller than the viewport (likely for the narrow viewports, given the toolbar-wrap point above), the true horizontal free space could be a few pixels less than stated per side on platforms with a reserved-width scrollbar.

---

## 5. Internal geometry

All figures below are **CSS pixels**, derived from the component's own measured `containerSize` (the same value used in Section 1/4) — never from viewport dimensions directly. Ratios are from `config.js`; radii = `ratio × (containerSize / 2)`.

### Outer invisible boundary (ring 5)
Ratio `0.82` (`config.js` `rings.radiusRatios[4]`), opacity `0` (`rings.opacities[4]`) — present in the SVG, painting nothing.

| Container size | Outer boundary radius |
|---|---|
| 460px (desktop) | `188.60px` |
| 353.28px (tablet, the 768-wide example) | `144.84px` |
| 220px (floor) | `90.20px` |

### Visible inner-ring radii (ratios `0.16, 0.24, 0.32, 0.38`)

| Container size | Ring 1 | Ring 2 | Ring 3 | Ring 4 |
|---|---|---|---|---|
| 460px | 36.80px | 55.20px | 73.60px | 87.40px |
| 353.28px | 28.26px | 42.39px | 56.52px | 67.12px |
| 220px | 17.60px | 26.40px | 35.20px | 41.80px |

### Anchor-band radii (per active responsive mode's `bandRadiusRatios`)

| Container size | Mode | Inner band radius | Outer band radius |
|---|---|---|---|
| 460px | desktop `[0.44, 0.75]` | 101.20px | 172.50px |
| 353.28px | tablet `[0.42, 0.78]` | 74.19px | 137.78px |
| 220px | smallMobile `[0.52, 0.68]` | 57.20px | 74.80px |

### Minimum distance between the component edge and floating elements

The "component edge" is the half-extent (`containerSize / 2`). A floating element's own visible outer edge is its anchor radius **plus half of the pill's own resolved max-width** (from `distribution.js`'s `resolvePillGeometry`, run against the exact shipped config):

| Container size | Resolved pill max-width | Half pill-width | Edge gap: anchor-radius only | Edge gap: to the pill's actual visible edge |
|---|---|---|---|---|
| 460px | 91.11px | 45.56px | 57.50px | **11.94px** |
| 353.28px | 60.85px | 30.43px | 38.86px | **8.43px** |
| 220px | 54.07px | 27.04px | 35.20px | **8.16px** |

The last column is the true minimum clearance between the component's own box edge and the nearest point a pill can actually paint — always positive at every size checked, confirming pills stay inside the component box with room to spare (this doesn't yet add the small additional clearance from bounded drift, which is a separate, already-accounted-for term inside `resolvePillGeometry`'s own safety math, not an extra visible gap).

### How these are derived from the measured component size
1. `runtime.js`'s `layout()` calls `root.getBoundingClientRect()` once per layout pass and takes `Math.min(rect.width, rect.height)` as `containerSize` (always equal to `rect.width` in practice, since the box is enforced square — Section 1).
2. `halfExtentPx = containerSize / 2`.
3. `distribution.js`'s `resolveMode(containerSize, UC_CONFIG.responsive.modes)` picks the active mode purely from that one number.
4. Anchor band radii = the active mode's `bandRadiusRatios[i] × halfExtentPx`.
5. `resolvePillGeometry` takes those anchor positions plus `halfExtentPx` and derives the safe pill width (Section 5's last two columns) — accounting for pill height, focus-pulse scale, and drift, not shown again here (see `docs/unified-compass-implementation-audit.md` for the full derivation).
6. Ring radii are computed independently, directly in `UnifiedCompass.astro`'s frontmatter, as `UC_CONFIG.rings.radiusRatios[i] × R` where `R = 100` — a **fixed SVG-unit constant**, not the measured pixel size (see Section 6 for why this is a different number space that still ends up proportionally correct).

---

## 6. Six distinct concepts, disambiguated

| Term | What it actually is | Where it's set | Changes with viewport? |
|---|---|---|---|
| **Component size** | The real CSS pixel width/height of the `.unified-compass` root element's box, as returned by `getBoundingClientRect()` | `clamp(220px, 46vw, 460px)` (Section 1) | Yes — this is the one value everything else derives from |
| **SVG viewBox size** | The fixed internal coordinate space the rings/needle/hub are drawn in: `viewBox="-100 -100 200 200"`, i.e. 200×200 SVG units, center `(0,0)` | `UnifiedCompass.astro:23,46` (`const R = 100`) | **No — always the same 200×200 units**, regardless of component size. The browser uniformly scales this fixed space onto whatever the component's actual CSS box is (`width: 100%; height: 100%` on the `<svg>`); 1 SVG unit therefore equals `componentSize / 200` CSS px, a ratio that itself changes with viewport, but the viewBox numbers themselves never do |
| **Visible radar size** | The diameter of the *outermost ring that actually paints anything* — since ring 5's opacity is `0`, this is ring 4 (ratio `0.38`), e.g. `2 × 87.40 = 174.80px` diameter at the 460px component size | Derived, not directly configured | Yes, proportionally to component size, but it is **smaller** than the component's own box — the "radar" you can see does not fill the component |
| **Invisible outer boundary** | Ring 5 (ratio `0.82`) — geometrically present at the same center, painting nothing (`opacity: 0`). Not a visual size at all; a geometric fact only | `config.js` `rings.radiusRatios[4]` / `opacities[4]` | Yes, proportionally, but never visible |
| **Anchor radius** | The radius at which a floating element's *center point* is placed — entirely independent of any ring; comes from `responsive.modes[activeMode].bandRadiusRatios`, not from `rings` at all | `config.js` `responsive.modes` | Yes, and also changes which literal ratio applies as the active mode changes |
| **Page padding** | Fixed CSS pixel insets belonging to the **preview page**, not the component: `32px` on `.uc-preview__stage`, `16px/24px` on `.uc-preview__toolbar` | `unified-compass-preview.astro` (Section 2/3) | **No — these are constant px values**, never responsive, never touched by `config.js` |
| **Automatic free space from centering** | Whatever width/height remains in the stage's content box *after* its fixed padding, distributed evenly by `align-items: center` / `justify-content: center` because the compass is smaller than the available area | `.uc-preview__stage`'s flex properties | Yes — this is the *only* one of these seven concepts that is neither a configured value nor a fixed constant; it's arithmetic remainder, recomputed live by the browser's flex layout on every resize |

The component's own internal geometry (viewBox, visible radar, invisible boundary, anchor radius) is entirely self-contained and has **no relationship** to the page-level concepts (page padding, centering free space) other than the one number that bridges them: the component's own measured `containerSize`, which the page's centering happens to produce as a side effect of the `clamp()` formula, but which the component never reads back from the page — it only ever measures its own box (Section 5, step 1).

---

*No implementation files were modified as part of this audit.*
