# Unified Compass — Implementation Audit

**Scope:** `src/components/unified-compass/`, `src/scripts/unified-compass/`, `src/pages/unified-compass-preview.astro`.
**Normative reference:** `docs/unified-compass-component-spec.md` only. `docs/homepage-ecosystem-compass-audit.md` was not used as a requirement source.
**Method:** static code review of every file in scope, line-by-line, plus targeted `grep` verification of specific claims (client-router presence, dead config values, viewport-dimension usage). No files were modified. No browser was used — see Section 4 for what that means for confidence level.

---

## 1. Executive Verdict

**Requires engineering fixes.**

The architecture is sound: single center, single coordinate system, single runtime controller, and the motion model (idle sweep / targeting handoff / reduced motion) are all correctly and faithfully implemented — these were the hardest and most consequential parts of the spec, and they hold up under direct code inspection. This is not a "not compliant" / rebuild situation.

However, the review found one **High**-severity, code-provable defect (floating-element pills will overlap their neighbors at ordinary small-mobile widths, independent of content — not an edge case) and several **Medium**-severity defects (a dead/unused config value, a missing per-item `lang`/`dir` attribute that is an accessibility regression versus the legacy component, a font-fit routine that cannot actually guarantee non-clipped text, and an incomplete idle-fallback condition on desktop). These are scoped, identifiable fixes, not architectural rework.

---

## 2. Confirmed Compliant Behaviors

### Single center (spec §1)
Verified directly in code that every geometric system resolves to the same point:
- Rings: `<circle cx="0" cy="0">` inside an SVG with `viewBox="-100 -100 200 200"` (`UnifiedCompass.astro:38-58`) — center is the SVG's local `(0,0)`.
- Needle: `<g data-uc-needle>` contains only shapes drawn around local `(0,0)` and is rotated via `rotate(deg)` with no `cx/cy`, which SVG resolves around `(0,0)` — same point (`UnifiedCompass.astro:60-79`).
- Floating elements: positioned via `left:50%; top:50%` plus a `translate(-50% + var(--ax), -50% + var(--ay))` (`UnifiedCompass.astro:170-182`), where `--ax/--ay` are computed in `runtime.js:56-64` from `root.getBoundingClientRect()` — the same DOM node whose box the SVG fills 100%/100%.
- Pointer angle origin: `updatePointerAngle` (`runtime.js:115-119`) computes `cx/cy` from the same `root.getBoundingClientRect()`.
- Because `.unified-compass`'s CSS width and height use the identical `clamp(...)` expression (`UnifiedCompass.astro:127-128`), the box is guaranteed square by construction — width and height can never diverge from a viewport-width-only formula, so the "50%/50%" DOM center and the SVG's `(0,0)` are the same physical pixel at all sizes.

No hidden second center was found. `window.innerWidth`/`window.innerHeight` do not appear anywhere in the runtime (only in a comment stating their absence, `runtime.js:42`) — confirmed via `grep`.

### Coordinate system (spec §1, §7)
All floating-element positions are written as CSS custom properties local to each element, derived only from the component's own measured box. Pointer `clientX/clientY` are used only to derive a direction (angle) relative to the component's own center — never to place anything — which is the correct and necessary use of screen coordinates for pointer tracking, not a violation.

### Floating-element motion (spec §2.3, §9)
- Anchor angle is fixed at build time in `data.js:33-41` and never incremented at runtime — only re-projected (not recalculated) on resize/direction change.
- Drift is a closed-loop CSS `@keyframes` (`0% → ... → 100%: translate: 0 0`, `UnifiedCompass.astro:188-204`) — bounded by construction, cannot accumulate, and involves no JS per-frame work.
- No `Math.random()` anywhere in the five new JS files (confirmed via `grep`) — drift timing offsets are deterministic formulas keyed on array index (`data.js:39-40`).
- No orbit of any kind exists in the new implementation.

### Needle motion & mode handoff (spec §3, §6.2)
- Continuous, non-stepped idle sweep via delta-time accumulation (`runtime.js:241-247`).
- Idle↔targeting handoff is jump-free: entering targeting seeds the spring from the current idle angle (`spring.snap(idleAngleDeg)`), and leaving targeting resyncs the idle angle from the spring's settled value (`runtime.js:217-226`) — verified there is no code path that snaps the needle to a new angle without first reading its current position.
- Desktop uses a continuous pointer-angle target; touch uses a discrete tap-selected target — both go through the same spring, with separate speed/friction presets (`config.js:38-41`), matching §6.2's "physical weight" requirement.

### Two-tap touch model (spec §3.3)
Traced the full state machine in `onElementClick` (`runtime.js:163-179`): first tap on a new/different id intercepts and retargets; second tap on the *same* id (tracked in a single `touchTargetId` variable, so "last tap wins" falls out for free, with no queue) lets the native link click proceed; the idle timeout (`scheduleIdleReset`, `runtime.js:156-161`) nulls `touchTargetId`, which the RAF loop picks up on its very next tick and correctly resyncs the needle back to idle — and because the variable is `null` afterward, a subsequent tap on the *same, previously-targeted* element is correctly treated as a fresh Tap 1, exactly as §3.3 requires.

### Focus / brightness (spec §4)
- Three tiers are wired and distinct (`--tier-opacity: .34 / .55 / .78`, `UnifiedCompass.astro:233-241`).
- Desktop focus is angular-proximity-based unconditionally (runs every frame regardless of idle/targeting mode); touch/tablet focus is driven **only** by `touchTargetId`, never by the idle sweep angle (`runtime.js:193-205`) — matches the split described in §4.
- Pulse is guarded by a change-detection check (`if (shouldFocus !== el.focused)`, `runtime.js:200-203`) before `classList.toggle`, so the one-iteration `uc-pulse` animation is only (re)triggered on the false→true transition, never continuously.
- Fade-back is a plain CSS `transition` on the base rule (`UnifiedCompass.astro:224-226`), so removing `.is-focused` animates back to the tier's own opacity rather than cutting abruptly.

### Reduced motion (spec §8)
Both the idle sweep (JS: `sweepPeriodMs` stretched by `1/0.15`, `runtime.js:242-244`) and the drift (CSS: `--uc-drift-amp: 0.15` under `@media (prefers-reduced-motion: reduce)`, `UnifiedCompass.astro:132-136`) are scaled down, never set to zero or `animation: none`. Interaction code paths (pointer, two-tap) read `reducedMotion` nowhere else, so interaction is fully unaffected. This matches §8's explicit "not a full freeze" requirement.

### Cleanup pairing (spec: single runtime controller)
Every `addEventListener`/`observe`/`setTimeout` registered in `initUnifiedCompass` has a matching removal in the returned `destroy()` (`runtime.js:289-304`) — verified pair-by-pair: `pointerModeQuery` change listener, the reduced-motion unsubscribe, both observers' `.disconnect()`, all three root pointer listeners, every element's click listener, and the idle timer. Exactly one `requestAnimationFrame` chain exists per instance, self-guarded against duplication on visibility resume (`if (rafId === null)`, `runtime.js:262-265`).

---

## 3. Confirmed Defects

### D1 — High: floating-element pills will overlap their nearest neighbors at ordinary small-mobile widths, independent of content length
- **File:** `src/scripts/unified-compass/config.js:54,64` (`anchors.radiusRatio: 0.62`, `pill.minWidthPx: 64`); `src/components/unified-compass/UnifiedCompass.astro:127-128` (size clamp floor `220px`).
- **Exact cause:** At the CSS size floor (`clamp(220px, 46vw, 460px)` bottoms out at `220px`, reached once `46vw < 220px`, i.e. viewport width below ≈478px — a completely ordinary phone width), the anchor radius is `0.62 × 110 = 68.2px`. With 12 evenly-spaced anchors (30° apart), the straight-line distance between **adjacent** anchor centers is `2 × 68.2 × sin(15°) ≈ 35.3px`. The pill's own `min-width` is `64px` (half-width `32px`), so two adjacent pills — even both at their absolute minimum width, with no long text involved at all — need `32 + 32 = 64px` of separation to avoid overlapping, against an available `35.3px`. Overlap is therefore geometrically guaranteed for any pair of adjacent anchors whose connecting chord has a significant horizontal component (most of the 12, since pill width ≫ pill height). This compounds with `pill.maxWidthPx: 190` for longer phrases: at the same container size, a max-width pill's edge can reach `68.2 + 95 = 163.2px` from center — beyond both the outermost ring (`0.92 × 110 = 101.2px`) and the component's own half-extent (`110px`), i.e. clipped by the component box itself, not just overlapping a neighbor.
- **Spec requirement violated:** §2.3 ("remains visually associated with its anchor," implicitly requires non-overlapping placement for the "organic pill" identity to read correctly) and the general responsiveness requirement in §7 ("scale consistently across breakpoints... no element visually jumps or misaligns"). Overlapping/clipped pills at a mainstream viewport width is a functional regression, not a tuning nuance.
- **Recommended correction:** Make `pill.minWidthPx`/`pill.maxWidthPx` scale with the measured container size (e.g. express as a fraction of `containerSize`, or clamp them dynamically in `layout()` against the actual chord length between adjacent anchors) rather than fixed pixel constants; alternatively/additionally, reduce anchor count or increase `anchors.radiusRatio` at small sizes so the chord length exceeds the minimum pill footprint.

### D2 — Medium: `UC_CONFIG.drift.amplitudePx` is declared but never consumed — dead configuration
- **File:** `src/scripts/unified-compass/config.js:57-60`; `src/components/unified-compass/UnifiedCompass.astro:188-204`.
- **Exact cause:** `config.js` defines `drift: { amplitudePx: 8 }` with a comment claiming this is the tunable drift amount. The actual `@keyframes uc-drift` in `UnifiedCompass.astro` hardcodes six different literal pixel values (`5px, -8px, -7px, 2px, -3px, 7px`) multiplied only by `var(--uc-drift-amp)` (the reduced-motion scalar, `1` or `0.15`) — `amplitudePx` itself is never read by any JS or interpolated into any CSS custom property. Confirmed via `grep -rn "amplitudePx"` across both directories: only the declaration matches.
- **Spec requirement violated:** Not a spec-behavior violation (the hardcoded values happen to sit in the intended range), but it directly contradicts this implementation's own stated design goal of centralizing "every one of those open values... so they can be tuned without touching runtime logic or markup" (per the file's own header comment and the original implementation report). A future editor changing `amplitudePx` in `config.js` will observe no effect and reasonably conclude the code is broken.
- **Recommended correction:** Either wire `amplitudePx` into the keyframes as a CSS custom property (e.g. `--uc-drift-base: 8px`, referenced as `calc(var(--uc-drift-amp) * var(--uc-drift-base) * <per-keyframe-ratio>)`), or remove the unused config field and document that drift shape/amount lives in the keyframes directly.

### D3 — Medium: no per-item `lang`/`dir` attribute on floating elements, despite mixed-language content — a regression versus the legacy component
- **File:** `src/scripts/unified-compass/data.js` (no `lang` field at all in the item schema); `src/components/unified-compass/UnifiedCompass.astro:86-118` (neither branch of the `<a>`/`<span>` ternary sets `lang` or `dir`).
- **Exact cause:** The seed dataset mixes Arabic (`أفضل شركة تسويق في الرياض`, `أفضل منصة تجارة إلكترونية`) and English (`ChatGPT`, `best marketing agency Dubai`, `Legal services in Muscat`) phrases, matching the spec's own description of the content mix (§2.3: "mix of AI product names, SEO keywords, and search-engine names"). The legacy `QueryPill.astro` explicitly set `lang={lang}` and `dir={lang === 'ar' ? 'rtl' : 'ltr'}` per item for exactly this reason. The new component carries no equivalent field or attribute — every pill inherits only the page's single `dir`. When the page direction is flipped (e.g. via the preview's RTL/LTR toggle, or in a real future LTR page context), Arabic phrases render inside an LTR bidi context with no compensating per-item override, which can affect punctuation/number placement and reading order for mixed content; screen readers also have no per-phrase language signal to switch pronunciation.
- **Spec requirement violated:** Not explicitly named in `unified-compass-component-spec.md`, but directly responsive to the audit prompt's goal 9 ("RTL/LTR language and direction are correctly applied per item where needed") — the answer is they are not applied per item at all, which is a real, identifiable content-correctness gap and a functional regression relative to the component it replaces.
- **Recommended correction:** Add a `lang` field to each `data.js` entry (or derive it via a simple Arabic-script character test) and render `lang={item.lang}` / `dir={item.lang === 'ar' ? 'rtl' : 'ltr'}` on both the `<a>` and `<span>` branches.

### D4 — Medium: pill font-fit is a single-pass linear estimate with no verification — can leave text silently clipped
- **File:** `src/scripts/unified-compass/runtime.js:71-86` (`fitPillText`).
- **Exact cause:** `fitPillText` computes `scale = maxTextWidth / naturalWidth` once and sets `--uc-pill-font` accordingly, with no re-measurement pass to confirm the shrunk text actually fits. Real font metrics do not scale perfectly linearly with `font-size` (hinting/rounding at fractional pixel sizes), so for phrases near the boundary this single-shot estimate can leave the text a few pixels over the target width. Because the pill surface has `overflow: hidden` and no `text-overflow` property (default `clip`, `UnifiedCompass.astro:208-220`), any residual overflow is silently hard-clipped with no ellipsis affordance. Additionally, `minFontPx: 10` is a hard floor: a phrase that would need to shrink below that ratio to fit is clamped at 10px and will overflow/clip regardless, with no truncation fallback.
- **Spec requirement violated:** Directly contradicts the audit prompt's goal 9 checklist item ("text shrinking cannot make content unreadable or clipped") and the spirit of spec §2.3's font-shrink fallback, which implies shrinking should be sufficient to avoid the wrapping/clipping problem it's meant to solve.
- **Recommended correction:** After setting the estimated font size, re-measure `label.scrollWidth` against the available width and iterate (2-3 corrective steps is enough given the near-linear relationship) before accepting the final size; set `text-overflow: ellipsis` as a last-resort safety net for the case where even `minFontPx` doesn't fit.

### D5 — Medium: desktop idle-fallback only triggers on `pointerleave`, not on a stationary-but-still-present pointer
- **File:** `src/scripts/unified-compass/runtime.js:121-133` (`onPointerEnter`/`onPointerLeave`/`onPointerMove`).
- **Exact cause:** `pointerActive` is set `true` on `pointerenter`/`pointermove` and only reset to `false` on `pointerleave`. There is no idle timer for the desktop pointer path (unlike the touch path's `UC_CONFIG.touch.idleTimeoutMs`). If a user parks the mouse over the component and stops moving without leaving the tracking area, the needle will hold that target indefinitely rather than resuming the idle sweep.
- **Spec requirement violated:** Spec §3.2: "If the pointer is inactive **for a period**, the needle should fall back to the idle sweeping behavior." This phrasing anticipates a stationary-but-present pointer as a distinct case from "pointer left the area" (§3.5's narrower wording, which the implementation does correctly handle). As written, only the §3.5 case is covered.
- **Recommended correction:** Track the timestamp of the last `pointermove` and treat the pointer as inactive (falling back to idle) if no movement has occurred for a configurable duration, in addition to the existing `pointerleave` handling. This is a genuine judgment call on how strictly to read §3.2 versus §3.5 — worth confirming intent before implementing.

### D6 — Low/Medium: component size formula has no viewport-height term at all
- **File:** `src/scripts/unified-compass/config.js:13-18`; `src/components/unified-compass/UnifiedCompass.astro:124-130`.
- **Exact cause:** `clamp(220px, 46vw, 460px)` is a pure function of viewport **width**; there is no `vh`-based ceiling anywhere. On a short/landscape viewport (e.g. a rotated phone, ~667×375px), `46vw` resolves to ~307px, which combined with the preview page's toolbar and padding can plausibly exceed the available vertical space, risking either page scroll or visual crowding against the viewport edge. This is a code-verifiable gap (no vh term exists to check), but whether it actually causes a visible problem depends on real layout context — see Section 4.
- **Spec requirement violated:** Not explicit in `unified-compass-component-spec.md` (which only discusses width-oriented "mobile/tablet/desktop" breakpoints), but the audit prompt explicitly asks for "short mobile" review, and viewport containment is implied by §7's general responsiveness requirement.
- **Recommended correction:** Consider adding a `vh`-aware term (e.g. `clamp(220px, min(46vw, 62vh), 460px)`) so the component also respects short viewports.

### D7 — Low: no re-entrancy guard against double-initializing the same root; `astro:before-swap` cleanup path is currently unreachable
- **File:** `src/components/unified-compass/UnifiedCompass.astro:282-309`; `astro.config.mjs` (no `ClientRouter`/View Transitions configured — confirmed via `grep -rn "ClientRouter\|ViewTransitions\|astro:transitions" src/` returning no matches).
- **Exact cause:** `initUnifiedCompass` has no guard (e.g. a flag on the root element) preventing it from being invoked twice on the same DOM node, relying entirely on the surrounding `boot()`/`astro:before-swap` choreography to avoid double-binding. Separately, this project is a fully static, non-hydrated site with no Astro client router installed anywhere, so `astro:before-swap` never fires today — the elaborate `destroy()` path is correctly written but not currently exercised by real navigation (a full page reload naturally tears down all JS state instead, so there is no live leak in practice).
- **Spec requirement violated:** None in the design spec; this responds to the audit prompt's goal 8 ("repeated initialization is safely prevented," "Astro page navigation does not leave duplicate RAF loops"). As shipped, the first is not defensively guarded (though not currently triggered), and the second is moot under the current routing configuration rather than actively verified.
- **Recommended correction:** Low priority given the current static-site configuration. If the project later adopts Astro's client router, re-verify `astro:before-swap` firing and consider adding a `root.dataset.ucInitialized` guard for defense in depth.

### D8 — Low: initial-paint flash — floating elements render dead-center until JS positions them
- **File:** `src/components/unified-compass/UnifiedCompass.astro:178` (`translate(calc(-50% + var(--ax, 0px)), calc(-50% + var(--ay, 0px)))`).
- **Exact cause:** The CSS fallback for `--ax`/`--ay` is `0px`, meaning before `runtime.js`'s `layout()` runs (on script execution, after DOM parse), all 12 pills render stacked exactly at the component's center rather than at their anchors. This is a brief, self-resolving flash rather than a persistent bug, but it is a real, observable state.
- **Spec requirement violated:** None explicit; a polish/perception concern under §2.3's "must feel alive" framing (a instant of "everything stacked at center" is a minor visual hitch, not a functional defect).
- **Recommended correction:** Optional — could compute initial anchor offsets inline at SSR time (base radius from the configured preferred size) to reduce/eliminate the flash, at the cost of a slight mismatch until the real measured size resolves.

### D9 — Informational: seed dataset gives every item a placeholder `href="#"`
- **File:** `src/scripts/unified-compass/data.js:17-28`.
- **Exact cause:** All 12 `RAW_ITEMS` entries use `href: '#'`, so every element in the current preview renders as a real, focusable `<a>` (none exercise the decorative/no-href `<span>` branch). This is a content placeholder, not a code defect — the component correctly supports both cases (verified in Section 2).
- **Recommended correction:** Replace with real destinations (or explicit `href: null`/omitted for genuinely decorative items) before this dataset is used anywhere beyond development preview.

---

## 4. Items That Cannot Be Confirmed Without Runtime Browser Inspection

- Whether the D1 overlap (pill/anchor spacing at small-mobile widths) is as visually severe in practice as the geometry suggests, and at exactly which viewport widths it becomes noticeable.
- Whether the D6 short/landscape viewport-height concern actually produces visible clipping or scroll in the real preview page layout (toolbar + stage padding + browser chrome all affect the true available height).
- Whether the desktop idle-sweep's ambient focus (every element pulses once per ~60s idle revolution as the needle angularly sweeps past it, since desktop focus is unconditional on angle, not gated by pointer activity — confirmed in `runtime.js:193-198`) reads as intentional "aliveness" or as unwanted noise. This is a legitimate reading of an ambiguous sentence in spec §4 ("as the needle passes over... that element transitions to full brightness," not explicitly scoped to pointer-active-only), not a code defect — but it's a product/visual judgment call worth confirming with the person who owns this decision.
- Actual rendered legibility of 10px (`pill.minFontPx`) Arabic and Latin text at the smallest component size.
- Real device-capability correctness of the `(hover: hover) and (pointer: fine)` desktop/touch split (e.g. touchscreen laptops, styluses, hybrid devices) — sound in theory, unverified on real hardware.
- Whether the brightness tiers (`.34 / .55 / .78`) and the pulse scale/duration (`1.14`, `480ms`) read as distinct-but-cohesive rather than either too subtle or too abrupt.
- Whether the RTL↔LTR mirror toggle (preview button) produces a visually correct, symmetric flip once D3 (missing per-item `lang`/`dir`) is accounted for — the angle math is verified correct in code, but rendered bidi text behavior needs eyes-on confirmation.
- Font-loading race: whether `document.fonts.ready` firing after `layout()`'s first pass produces a visible re-fit "jump" for any pill.

---

## 5. Visual-Testing Checklist for `/unified-compass-preview`

1. **Small mobile (≤360px wide):** check every adjacent pair of pills around the ring for overlap — expected to fail per D1; note which pairs actually collide.
2. **Viewport width sweep (~320px → ~1600px):** watch for any visual "jump" as the fluid clamp crosses its min/max bounds (220px / 460px thresholds).
3. **Short/landscape viewport (~667×375):** confirm whether the component and toolbar together fit without scrolling or clipping (D6).
4. **Desktop pointer:** move the mouse in a slow circle around the component; confirm the needle lags with visible inertia (not 1:1), and that each element briefly pulses/brightens as the needle angle crosses it.
5. **Desktop pointer, stationary:** hold the mouse still over one spot (not leaving the component) for 10+ seconds; confirm whether the needle keeps aiming there indefinitely (expected, per D5) versus falling back to idle.
6. **Desktop pointer leave:** move the mouse off the component; confirm the needle resumes idle sweep from wherever it was, with no angle jump.
7. **Touch/tablet, tap once on an element:** confirm needle animates to it, brightness increases, and **no navigation occurs**.
8. **Touch/tablet, tap the same element again:** confirm the link now opens.
9. **Touch/tablet, tap a different element after tap 1:** confirm immediate retarget, no navigation.
10. **Touch/tablet, tap once then wait past the idle timeout (~4s):** confirm the needle returns to idle sweep, and tapping the *same* element again is treated as a fresh first tap (does not immediately open the link).
11. **Reduced motion (devtools emulation):** confirm the needle still visibly sweeps (slower) and pills still visibly drift (smaller) — neither should be perfectly frozen.
12. **RTL ↔ LTR toggle button:** confirm the entire ring of elements mirrors left-right, and check whether Arabic-phrase pills render correctly once D3 is considered.
13. **Keyboard navigation:** Tab through the page and confirm every linked pill receives a visible focus outline and that Enter activates its link; confirm non-linked (decorative) pills, if any are added later, are skipped entirely.
14. **Long-phrase pills at the smallest and largest component sizes:** check whether font-shrink keeps text on a single line without visible clipping (D4), and whether shrunk text stays legible.
15. **Resize the window continuously (drag the corner):** confirm no duplicate needles/pills appear and no console errors are thrown (would indicate a resize-driven duplicate-instance issue).

---

*No implementation files were modified as part of this audit.*

---

## Remediation — 2026-07-27

Fixes D1, D2, D3, D4, and D5 (below) were implemented per the fix prompt's "Required Fixes" list. D6–D9 were intentionally left unaddressed — they were not in that list, and fixing them was out of scope for this pass (they remain open; see the original Section 3 above).

### Files changed

- `src/scripts/unified-compass/config.js`
- `src/scripts/unified-compass/data.js`
- `src/scripts/unified-compass/runtime.js`
- `src/components/unified-compass/UnifiedCompass.astro`

No other files in or out of scope were touched. `src/scripts/unified-compass/geometry.js` and `inertia.js` were reviewed and needed no changes. The legacy Homepage/Ecosystem/Compass files and `unified-compass-component-spec.md` remain untouched, and the component remains unintegrated (isolated preview route only).

### D1 fixed — small-mobile floating-element overlap

**Root cause recap:** pill `min`/`max-width` were fixed pixel constants, entirely decoupled from anchor spacing, which shrinks with the container. At the size floor (220px, reached below ≈478px viewport width — inside the project's supported 320px+ mobile range), the anchor-to-anchor chord (35.3px) was smaller than even the old minimum pill width (64px).

**Solution used:** pill width bounds are no longer fixed constants. `runtime.js` now derives them, every `layout()` pass, from the actual measured chord length between adjacent anchors:

```
chordPx = 2 × anchorRadiusPx × sin(π / elementCount)
maxWidthPx = clamp(chordPx × 0.94, absoluteMinWidthPx=28, absoluteMaxWidthPx=190)
minWidthPx = clamp(maxWidthPx × 0.55, absoluteMinWidthPx=28, maxWidthPx)
paddingPx  = clamp(maxWidthPx × 0.18, minPaddingPx=4, maxPaddingPx=14)
```

Because `0.94 < 1`, `maxWidthPx <= chordPx` always — so two adjacent pills, even both simultaneously at max width, can never together exceed the distance between their own anchors. This is a closed-form, conservative model (pills are treated as plain axis-aligned widths, not oriented along the connecting chord, which is stricter than the true geometry requires for non-horizontal anchor pairs but avoids needing a real per-pair collision solver). All twelve anchors are evenly spaced, so one derivation is the binding constraint for every adjacent pair — no per-pair special-casing needed.

`anchors.radiusRatio` was also raised from `0.62` to `0.70` (config.js) — still comfortably inside the outermost ring at `0.92` — which increases the chord somewhat before the width-derivation above even applies, reducing how aggressively pills must shrink at small sizes.

These values are computed once per `layout()` call (on init, resize, direction change, and font-ready) and written as CSS custom properties (`--uc-pill-min`, `--uc-pill-max`, `--uc-pill-pad`) on the root `.unified-compass` element, inherited by every pill — not per-frame work, and not a collision solver.

**Final responsive geometry values (verified by direct calculation from the shipped config):**

| Container size | Anchor radius | Chord (12 anchors) | Resolved pill max-width | Resolved pill min-width | Resolved padding |
|---|---|---|---|---|---|
| 220px (mobile floor) | 77.0px | 39.86px | 37.46px | 28.00px (floor) | 6.74px |
| 460px (desktop ceiling) | 161.0px | 83.34px | 78.34px | 43.09px | 14.00px (ceiling) |

Safety check at the floor: `37.46 <= 39.86` ✓ (2.4px margin). Safety check at the ceiling: `78.34 <= 83.34` ✓ (5.0px margin). Since `maxWidthPx = chordPx × 0.94` is not floor/ceiling-clamped anywhere in the configured size range (the derived value never drops below 28 or exceeds 190 between 220–460px), the `maxWidthPx <= chordPx` property holds continuously across the whole range, not just at the two endpoints checked above.

**Known, accepted trade-off:** this necessarily shrinks the pill's maximum width at *every* size, not only small mobile (the old fixed 190px ceiling was never actually geometry-safe at any size — it only avoided visibly overlapping at desktop because the current dataset happens not to place two long phrases on adjacent anchors, not because it was a considered, safe bound). Making the bound genuinely geometry-derived at all sizes was necessary to make the fix provable rather than "safe for this one dataset, by luck." One consequence: longer phrases (e.g. "Hugging Face", the Arabic SEO phrases) now rely on the D3-fixed font-shrink/ellipsis fallback more often, even at desktop size — see D3 below for why that's a safe, designed-for outcome rather than a regression.

### D2 fixed — dead `drift.amplitudePx` configuration

**Root cause recap:** `config.js` declared `drift.amplitudePx` as the documented drift tuning value, but the actual `@keyframes uc-drift` in `UnifiedCompass.astro` hardcoded six unrelated literal px values — changing `amplitudePx` had no visible effect.

**Solution used:** the six keyframe steps are now expressed as fixed *ratios* (`0.625`, `-1`, `-0.875`, `0.25`, `-0.375`, `0.875` — the same relative shape as before, i.e. `±5px/±8px/±7px/±2px/±3px/±7px` at the default `amplitudePx: 8`) multiplied by two CSS custom properties: `--uc-drift-amp-px` (injected from `UC_CONFIG.drift.amplitudePx` via `UnifiedCompass.astro`'s root inline style, alongside the existing `--uc-size-*` injection) and `--uc-drift-scale` (the reduced-motion multiplier, renamed from the old, confusingly-overloaded `--uc-drift-amp` to avoid clashing with the new base-amplitude variable). Editing `amplitudePx` in `config.js` now visibly changes the rendered drift distance.

### D3 fixed — per-item `lang`/`dir`

**How `lang`/`dir` are assigned:** every entry in `data.js` now carries explicit `lang` (`'ar'` | `'en'`) and `dir` (`'rtl'` | `'ltr'`) fields, set per item rather than inferred from the page's own direction — Arabic phrases (`seo-riyadh-agency`, `ecommerce-platform`) are `lang="ar" dir="rtl"`; all English phrases are `lang="en" dir="ltr"`. `UnifiedCompass.astro` renders both attributes on every floating element (both the linked `<a>` branch and the decorative `<span>` branch). `dir` is stored explicitly alongside `lang` (not derived from it at render time) so a future entry could deliberately override the pairing if ever needed (e.g. a Latin-script name inside an RTL-flowing phrase) without changing the schema.

This is independent of the component's own RTL/LTR *mirroring* logic (which still flips anchor angles via `runtime.js`'s `resolveMirroring`/`layout` and is unaffected by this fix) — the two are orthogonal: mirroring is about *where* an element sits on the ring; `lang`/`dir` is about how *its own text* renders and is announced, regardless of where it sits.

Verified in the built output (`dist/unified-compass-preview/index.html` after `npm run build`): exactly 2 elements render `lang="ar" dir="rtl"` and 10 render `lang="en" dir="ltr"`, matching `data.js`'s 2 Arabic / 10 English split.

### D4 fixed — verified pill text-fit, ellipsis fallback

**Solution used:** `fitPillText` in `runtime.js` no longer applies a single blind scale-and-hope estimate. It now:
1. Sets the base font size and measures (`el.label.scrollWidth`) against the available text width (`maxWidthPx - 2 × paddingPx`, both resolved by the D1 fix above).
2. If it doesn't fit, iterates up to 3 correction passes, each time recomputing the needed scale from the *actual just-measured* width (not the original estimate) and re-measuring after applying it — this is what makes it "verified" rather than "estimated": every accepted font size has been directly measured to fit, or the loop continues.
3. If it still doesn't fit once font size has reached the configured floor (`pill.minFontPx: 10`), the loop exits and the element is marked `.uc-truncated`.

`.uc-truncated` switches that one label's `text-overflow` from `clip` (the default, inert in the normal case where text already fits) to `ellipsis` — so any residual overflow is always visibly marked, never silently hard-clipped. `text-overflow: ellipsis` requires the label itself (not just its ancestor) to establish an overflow/clip context, so the label gained `display: inline-block; max-width: 100%; min-width: 0; overflow: hidden;` as part of this fix (previously only the parent surface had `overflow: hidden`).

All thresholds remain centralized in `config.js`: `pill.baseFontPx`, `pill.minFontPx`, and the new `pill.maxWidthChordRatio` / `pill.minWidthMaxRatio` / `pill.absoluteMinWidthPx` / `pill.absoluteMaxWidthPx` / `pill.paddingRatio` / `pill.minPaddingPx` / `pill.maxPaddingPx` from the D1 fix.

### D5 fixed — desktop idle fallback on a stationary pointer

**How it now works:** `runtime.js` tracks `lastPointerMoveTime` (via `performance.now()`, same clock as the `requestAnimationFrame` timestamp already used everywhere else in the loop), updated on every `pointerenter`/`pointermove`. Each frame now computes:

```
pointerStale   = desktop && pointerActive && (time - lastPointerMoveTime) > UC_CONFIG.pointer.idleTimeoutMs   // 2500ms, centralized in config.js
wantsTargeting = desktop ? (pointerActive && !pointerStale) : (touchTargetId !== null)
```

`wantsTargeting` is the same variable that already drove the idle↔targeting mode transition before this fix (the code that seeds the spring from the current idle angle when entering targeting, and resyncs the idle angle from the spring's settled value when leaving it, was not touched). Because a stale-but-still-hovering pointer now simply makes `wantsTargeting` false through this one added condition, it flows through that exact same, already-correct handoff — no separate code path, no new jump risk, and inertia/settling behavior is unchanged. When the same stationary pointer moves again, `lastPointerMoveTime` updates, `pointerStale` clears, and targeting resumes smoothly on the next frame. `onElementClick`/link-opening logic was not touched, so this has no effect on click behavior.

### Validation performed

- `npm run lint` — clean, no errors.
- `npm run format:check` (via `prettier --check` scoped to the changed files, then `--write` + re-check) — clean.
- `npm run build` — succeeds; `/unified-compass-preview/index.html` builds correctly.
- Mathematically re-derived the D1 chord/width safety inequality at both the configured size floor (220px) and ceiling (460px) from the actual shipped `config.js` values (table above) — confirmed `maxWidthPx <= chordPx` at both ends, and confirmed the derivation is unclamped (and therefore continuously valid) across the entire 220–460px range.
- Inspected the built HTML output for the exact `lang`/`dir` split (2 `ar`/`rtl`, 10 `en`/`ltr`) and for `--uc-drift-amp-px:8px` actually appearing in the rendered root style (confirming D2's wiring, not just its absence-of-error).
- Re-read the full `runtime.js` end-to-end post-fix to re-verify: the two-tap touch state machine, reduced-motion behavior, and the `destroy()` cleanup pairing were not altered by any of the five fixes (confirmed by diff review — only the sections described above changed) and remain exactly as previously verified compliant in Section 2.
- Did not re-run the component in an actual browser — the checks above are static/build-time; see below for what still needs eyes-on confirmation.

### Remaining runtime-only visual checks

These require a real browser and were not (and cannot be) confirmed by this pass:

- Whether the resolved pill sizes at 220px (max-width ≈37px, ≈24px of that usable for text after padding) look acceptable, or so cramped/ellipsis-heavy that a different balance of `anchors.radiusRatio` / `pill.maxWidthChordRatio` / `pill.paddingRatio` is wanted — the fix guarantees *no overlap and no silent clipping*, not any particular level of spaciousness at the minimum supported width.
- Whether the now-smaller desktop pill max-width (≈78px vs. the old 190px) reads as a reasonable, cohesive pill size, or as a visual regression worth revisiting with a different lever (e.g., a size-dependent chord ratio instead of one constant ratio) if the smaller desktop pills aren't wanted.
- Real-device confirmation that the `pointer.idleTimeoutMs: 2500` value feels right (long enough to not fight normal reading pauses, short enough that a genuinely parked pointer releases promptly) — see visual-testing checklist item 5 in Section 5 above, now also covering the moving-again case.
- Visual/bidi correctness of the Arabic pills specifically once rendered (the `lang`/`dir` attributes are structurally correct per the build output, but actual glyph shaping/kerning at the very small resolved font sizes needs eyes-on confirmation).
- Whether the ellipsis affordance (`…`) is legible and visually appropriate at the smallest resolved pill sizes, versus, say, needing a smaller ellipsis-adjacent font size floor.

D6 (no viewport-height term in sizing), D7 (re-entrancy guard / dead `astro:before-swap` path), D8 (initial-paint flash), and D9 (placeholder `href="#"` content) from the original audit remain open — they were out of scope for this fix pass.

---

## Remediation 2 — 2026-07-27 — Responsive Distribution Correction

The first remediation's D1 fix (a single global chord-derived pill-width ratio applied at every breakpoint) was rejected: it produced ~37px pills at the floor and ~78px even at the desktop ceiling, forcing near-constant ellipsis and defeating the "flowing, variable-length pill" identity the spec calls for. This pass replaces that single ratio with a genuinely per-breakpoint responsive distribution model, per a separate correction prompt.

### What changed

**New file:** `src/scripts/unified-compass/distribution.js` — `resolveMode`, `buildVisiblePositions`, `resolvePillGeometry`.
**Modified:** `src/scripts/unified-compass/config.js` (new `responsive.modes`; `focus.pulseScale`, `drift.maxMagnitudeRatio`, `pill.heightPx` added; `anchors.*` and the old chord-ratio `pill.*` fields removed), `src/scripts/unified-compass/data.js` (dropped the precomputed `angleDeg`; documented dataset order as the visibility-priority list), `src/scripts/unified-compass/runtime.js` (`layout()` rewritten around the new module; per-element `visible` flag; hidden elements get `.uc-hidden` and are excluded from focus/text-fit), `src/components/unified-compass/UnifiedCompass.astro` (`--uc-focus-scale`/`--uc-drift-amp-px` now runtime-set per mode instead of static; `.uc-hidden` rule; dropped the now-meaningless `data-angle` attribute).

**Unchanged, as required:** the unified center, the single runtime controller, fixed-anchor + bounded-drift motion model, needle behavior, the two-tap/pointer interaction logic, the legacy Homepage/Ecosystem/Compass files, and the design spec. No new dependencies were added.

### The model

Four responsive **modes** are selected from the component's own *measured* container size (never `window.innerWidth` — this is a config-profile switch, not a position input). Each mode independently controls how many of the 12 dataset items are visible (a deterministic prefix of `data.js`'s order — never a removal from the dataset) and how many concentric anchor bands they're spread across:

| Mode | Container size | Visible | Bands (ratio of half-extent) |
|---|---|---|---|
| smallMobile | ≤240px | 6 | [0.58, 0.68] |
| mobile | ≤300px | 8 | [0.51, 0.71] |
| tablet | ≤380px | 12 | [0.45, 0.77] |
| desktop | >380px | 12 | [0.46, 0.76], plus a desktop-specific `focusScale: 1.08` / `driftAmplitudePx: 5` |

The visible subset is always re-spread evenly across the full 360° for whatever count is currently showing (not left at gaps sized for the full 12), and alternates between the mode's bands by position in that subset.

Pill width is no longer a single ratio of "the chord." `distribution.js`'s `resolvePillGeometry` computes, for every adjacent pair of visible anchors, both the horizontal (`dx`) and vertical (`dy`) separation — the true axis-aligned footprint check — and applies a **height rescue**: if `dy` alone already exceeds the combined pill-height-plus-drift-plus-focus-scale threshold, that pair imposes no width constraint at all (this is genuinely common for cross-band neighbors, since band radii differ). Only pairs that aren't rescued by height bound the width, via `dx`. The tightest such pair across the whole visible set — plus separate containment (outer band vs. the component edge) and exclusion (inner band vs. the compass hub) checks — is the final safe width. This is a closed-form, single-pass calculation over the visible set, run once per `layout()` call — not a real-time collision solver.

`focus.pulseScale` and `drift.amplitudePx` are consumed by *both* the CSS (`--uc-focus-scale`, `--uc-drift-amp-px`, set per mode at each `layout()` call) and this safety calculation, so the visual pulse/drift can never be larger than what the math assumed — no repeat of the D2 dead-config-value problem.

### Resolved pill widths (verified numerically, matching the shipped config exactly)

| Container size | Mode | Visible | Max width | Min width | Padding |
|---|---|---|---|---|---|
| 220px | smallMobile | 6 | 40.0px | 22.0px | 6.4px |
| 240px | smallMobile | 6 | 50.5px | 27.8px | 8.1px |
| 260px | mobile | 8 | 48.8px | 26.9px | 7.8px |
| 300px | mobile | 8 | 57.6px | 31.7px | 9.2px |
| 320px | tablet | 12 | 45.0px | 24.7px | 7.2px |
| 380px | tablet | 12 | 55.0px | 30.2px | 8.8px |
| 400px | desktop | 12 | 77.8px | 42.8px | 12.4px |
| 460px | desktop | 12 | 91.1px | 50.1px | 14.0px |

At the desktop ceiling, every adjacent pair is height-rescued (`neighborBound = ∞`) — the binding constraint there is purely containment/exclusion, not neighbor spacing. Desktop's max width roughly **doubles** the previous remediation's global-ratio result (91px vs. 78px), tablet's roughly matches it, and mobile/smallMobile improve substantially (48–58px / 40–51px vs. the previous ~35–46px) because they now carry far fewer simultaneous items (8 and 6, not 12) at their own tuned band geometry.

One honest limitation found and left as-is: crossing the mobile→tablet boundary (300px) steps *down* from 57.6px to 45.0px, because tablet mode shows 50% more items (12 vs. 8) at a similar size — this is an inherent, explainable consequence of "more visible items need more room each," not a bug. Within each mode's own range, width increases smoothly and monotonically with size (verified by the table above and by sweeping every 10–20px between mode boundaries during tuning — see the exploration scripts' output, not committed to the repo).

### Example long-phrase fitting (approximate — see caveat below)

Using a rough 0.55em-per-character estimate (not real font metrics — Thmanyah Sans glyph widths vary per character, so this is directional, not exact):

- **"Bing"** (4 chars) — fits at full 12px base font at every mode/size, no shrink needed.
- **"Hugging Face"** (12 chars) — needs to shrink toward the 10px floor at most sizes; right at the edge of fitting even at the floor at desktop's ~63px text area. Genuinely borderline; needs real-browser confirmation.
- **"Legal services in Muscat"** (24 chars), **"أفضل شركة تسويق في الرياض"** (~25 chars), **"best marketing agency Dubai"** (28 chars) — do not fit even at the desktop ceiling's text area (~63px) at any font size down to the 10px floor; these will reliably trigger the D4 ellipsis fallback at every mode.

**Honest assessment:** fitting 12 simultaneously visible, actively drifting/pulsing pills around one shared, modestly-sized (max 460px) compass — while keeping a real, verified safety margin against overlap — has a genuine geometric ceiling. This revision roughly doubles desktop's safe width and meaningfully improves every other mode versus the previous remediation, and short-to-medium phrases (most of the current dataset: platform/search-engine names) now fit at or near full size without ellipsis at most breakpoints. But the dataset's four longest, sentence-length SEO phrases will still rely on the shrink-then-ellipsis fallback at every mode — no combination of band geometry, focus-scale, or drift tuning within reasonable bounds closes that gap while keeping all 12 items visible at desktop and a genuine (not merely asserted) non-overlap guarantee. If wider handling of those specific four phrases is a hard requirement, the remaining honest levers are: shortening them in `data.js`, excluding them from `visibleCount` at smaller modes (they already are, at smallMobile/mobile, being lower in dataset-order priority... [the current order does NOT deprioritize them — see note below]), or accepting a lower safety margin than this revision uses.

**Data-priority note:** dataset order currently is not curated by phrase length — the two Arabic long phrases and two of the English long phrases are interspersed among the shorter AI-name items rather than pushed to the end. Since `visibleCount` takes a *prefix* of dataset order, reordering `data.js` so the four longest phrases sit last would mean they're the first to drop out at reduced-density modes (smallMobile/mobile), leaving only shorter, easier-to-fit phrases visible exactly where pill width is tightest. This reordering was not made — it's a content edit, not a geometry fix, and is offered here as an available, low-effort lever rather than applied unilaterally.

### Validation performed

- `npm run lint` — clean.
- `npm run format:check` (prettier, scoped) — clean after `--write`.
- `npm run build` — succeeds; built HTML spot-checked: exactly 12 `data-uc-element` nodes, zero stray `data-angle` attributes (confirming the switch to runtime-computed angles).
- The pill-width/safety numbers above were computed by re-implementing `distribution.js`'s exact algorithm in a standalone script and evaluating it against the literal shipped `config.js` values (not by inspection/estimation) — including a dedicated check that the tablet mode's ratios don't dip below its neighboring modes at its own boundaries (an earlier candidate ratio pair did; `bandRadiusRatios` were re-tuned to `[0.45, 0.77]` to fix that before finalizing).
- Re-read the full `runtime.js`/`distribution.js` pair end-to-end to confirm: hidden elements are excluded from focus detection, text-fitting, and touch-targeting (a stale `touchTargetId` referencing a now-hidden element is cleared in `layout()`); mirroring, reduced motion, cleanup, and the two-tap state machine are otherwise unchanged from the previously-verified behavior.
- Did not re-run the component in an actual browser — see below.

### Remaining browser-only visual decisions

- Real rendered legibility/fit of "Hugging Face" and other medium-length items at each mode's actual resolved width — the approximate character-width model above is not a substitute for real font metrics.
- Whether the mobile→tablet 57.6px→45.0px step-down (more visible items, same-ish size) reads as a jarring change when resizing across that exact boundary, or is unnoticeable in practice.
- Whether the desktop-specific subtler pulse (1.08 vs. 1.14 elsewhere) and lighter drift (5px vs. 8px elsewhere) are perceptible/acceptable, or should be equalized at some cost to desktop's pill width.
- Whether showing only 6–8 of 12 items at mobile/small-mobile (per the fix brief's own suggested baseline) feels like an acceptable reduction versus a "loss of content" — the hidden items are always present in the DOM/dataset and reappear once the viewport grows, but this is a product judgment call, not something code review can settle.
- Whether the four longest SEO phrases relying on ellipsis at every mode (see above) is acceptable as-is, or whether `data.js` should be edited (shortened phrasing, or reordered so they drop out first at reduced-density modes) as a follow-up.

---

## Remediation 3 — 2026-07-27 — Responsive Size Recalibration

Widened the component's own size range and re-derived every value in the codebase that depends on it, per a separate size-recalibration prompt. This is a controlled geometry update, not a redesign — no runtime, interaction, or architectural code changed.

### Size formula

| | Before | After |
|---|---|---|
| Formula | `clamp(220px, 46vw, 460px)` | `clamp(280px, min(62vw, 72vh), 620px)` |
| Floor | 220px | 280px |
| Ceiling | 460px | 620px |
| Preferred | width-only (`46vw`) | width-**and-height**-aware (`min(62vw, 72vh)`) |

Applied identically to width and height (unchanged pattern), so the component remains a perfect square by construction.

### Files modified
- `src/scripts/unified-compass/config.js` — `size`, `drift.amplitudePx`, `pill.*`, `responsive.exclusionRatio`'s comment (value unchanged), `responsive.modes` (thresholds, ratios).
- `src/components/unified-compass/UnifiedCompass.astro` — CSS fallback defaults only (`--uc-drift-amp-px`, pill min/max/pad/height fallbacks) — no SVG markup or frontmatter logic changed.
- `src/pages/unified-compass-preview.astro` — one added `@media (max-height: 560px)` rule reducing the preview page's own padding on short viewports.
- `runtime.js` and `distribution.js` — **not touched**. Both were already fully parameterized from prior rounds, so this pass only required changing the config values they consume.

### Why ring/needle/hub required zero changes
Every ring, needle, and hub value in `config.js` is a **ratio** of the SVG's own fixed `viewBox="-100 -100 200 200"` (see `UnifiedCompass.astro`'s `R = 100`), which the browser uniformly scales onto whatever the real CSS box turns out to be. A ratio-based value (e.g. the needle shaft's `shaftWidthRatio: 0.012`) produces the exact same *proportional* appearance at 280px as at 620px — only the absolute pixel count changes, automatically, with no code or config edit needed. This is why only the **pixel-based** values (pill dimensions, drift amplitude, focus-pulse-informed safety math, mode thresholds) needed deliberate re-derivation: those live outside the auto-scaling SVG coordinate space.

### Dependent values changed

| Value | Before | After | Why |
|---|---|---|---|
| `responsive.modes[].maxContainerSizePx` | 240 / 300 / 380 / ∞ | 320 / 400 / 500 / ∞ | Old thresholds were entirely below the new 280px floor — `smallMobile` would have been unreachable |
| `responsive.modes[].bandRadiusRatios` | small `[.52,.68]` mobile `[.48,.72]` tablet `[.42,.78]` desktop `[.44,.75]` | small `[.53,.67]` mobile `[.50,.72]` tablet `[.42,.77]` desktop `[.46,.74]` | Re-swept against `distribution.js`'s exact safety model for each mode's *new* size sub-range |
| `drift.amplitudePx` | 5 | 7 | Absolute px value; a fixed 5px reads as proportionally smaller in a much bigger box |
| `pill.heightPx` | 30 | 34 | Absolute px value, reviewed for the larger scale |
| `pill.baseFontPx` / `minFontPx` | 12 / 10 | 14 / 11 | Use the larger geometry to improve readability, per the brief |
| `pill.absoluteMaxWidthPx` | 150 | 220 | The geometry-derived width now legitimately reaches the 130s at the desktop end; the old ceiling would have clipped a safety-verified value |
| `pill.minPaddingPx` / `maxPaddingPx` | 6 / 14 | 7 / 20 | Let padding breathe proportionally at the new, generally-wider pill sizes |
| `responsive.exclusionRatio` | 0.20 | **unchanged** | A ratio — already correct at any size, reviewed and confirmed |
| `focus.pulseScale` | 1.08 | **unchanged** | A ratio — reviewed and confirmed |
| `rings.radiusRatios` / `opacities`, `needle.*`, hub ratios | — | **unchanged** | Pure SVG-viewBox ratios — see above; confirmed the new largest anchor ratio (0.74 desktop / 0.77 tablet) still sits inside the outer boundary ring (0.82) and the inner ring cluster (max 0.38) still sits below the tightest inner anchor ratio (0.42) |
| Preview-page short-viewport padding | 32px stage / 16-24px toolbar always | Same, plus a `max-height: 560px` override dropping both to 8-16px | New `72vh` term can push the component's height close to the full viewport on short screens — see Vertical Safety below |

### Full validation matrix

| Viewport | Resolved size | Mode | Outer boundary radius | Anchor bands (in/out) | Pill max width | Binding constraint | H-free/side |
|---|---|---|---|---|---|---|---|
| 1440×900 | 620.0px | desktop | 254.2px | 142.6 / 229.4px | 133.7px | exclusion | 410.0px |
| 1280×800 | 576.0px | desktop | 236.2px | 132.5 / 213.1px | 123.1px | containment | 352.0px |
| 1024×768 | 553.0px | desktop | 226.7px | 127.2 / 204.6px | 117.6px | exclusion | 235.5px |
| 768×1024 | 476.2px | tablet | 195.2px | 100.0 / 183.3px | 81.4px | exclusion | 145.9px |
| 430×932 | 280.0px | smallMobile | 114.8px | 74.2 / 93.8px | 67.4px | neighbor spacing | 75.0px |
| 390×844 | 280.0px | smallMobile | 114.8px | 74.2 / 93.8px | 67.4px | neighbor spacing | 55.0px |
| 375×812 | 280.0px | smallMobile | 114.8px | 74.2 / 93.8px | 67.4px | neighbor spacing | 47.5px |
| 360×800 | 280.0px | smallMobile | 114.8px | 74.2 / 93.8px | 67.4px | neighbor spacing | 40.0px |
| 320×568 | 280.0px | smallMobile | 114.8px | 74.2 / 93.8px | 67.4px | neighbor spacing | 20.0px |

All 9 land in either `smallMobile` (all 5 phone-width viewports — every one hits the 280px floor, since `62vw` alone is already under 280px at these widths regardless of height) or `desktop`/`tablet` (the 4 wider viewports) — none lands in the `mobile` band (320–400px component size), which requires a viewport roughly 520–650px wide with adequate height; none of the 9 given viewports is in that range, but the band is real and reachable (e.g. a small tablet or large phone in landscape).

Notable: **1024×768 and 1280×800 are both height-bound** (the `72vh` term, not `62vw`, determines their size) — common laptop aspect ratios don't reach the 620px ceiling unless the viewport is both wide (≥1000px) *and* tall (≥861px) simultaneously. Only 1440×900 among the 9 hits the true ceiling.

Pill widths in the 67–134px range throughout — versus 35–91px under the previous range — a substantial, geometry-verified (not assumed) readability improvement across every mode.

### Vertical safety — explicit short-screen verification

None of the 9 *given* validation viewports is short enough to stress-test vertically (shortest is 568px tall). Per the explicit instruction to verify short screens, landscape rotations of the given phone viewports were checked instead:

| Viewport | Component height | Before fix (32px/70px chrome estimate) | After fix (8px/56px chrome estimate) |
|---|---|---|---|
| 932×430 | 309.6px | 443.6px vs. 430px — **overflow** | 381.6px vs. 430px — safe |
| 844×390 | 280.8px | 414.8px vs. 390px — **overflow** | 352.8px vs. 390px — safe |
| 812×375 | 280.0px | 414.0px vs. 375px — **overflow** | 352.0px vs. 375px — safe |
| 800×360 | 280.0px | 414.0px vs. 360px — **overflow** | 352.0px vs. 360px — safe |
| 568×320 | 280.0px | 414.0px vs. 320px — overflow | 352.0px vs. 320px — **still overflows by ~32px** |

The added `@media (max-height: 560px)` rule (reducing stage padding 32px→8px and toolbar padding 16/24px→8/16px) converts 4 of these 5 realistic landscape-phone heights from overflowing to safely fitting. The 5th (568×320 — an extremely short ~320px viewport height) still comes up short by roughly 32px even after the fix; at that extreme an aspect ratio, the 280px-floor component alone already consumes 87.5% of the available height, leaving essentially no room for any page chrome without either shrinking the component's own floor (explicitly not requested) or removing the toolbar entirely (a larger change than "minimal"). This is disclosed as a known, narrow residual limitation rather than hidden — the default `overflow: visible` still means nothing clips; the page would simply need to scroll slightly at this one extreme height.

*Toolbar-height figures above (70px / 56px) are estimates, not measured values — same caveat as the dimensions audit: exact toolbar height depends on live text-wrap behavior, which requires a browser to confirm.*

### Check results
- `npm run lint` — clean.
- `npm run format:check` (prettier, scoped) — clean.
- `npm run build` — succeeds; built HTML spot-checked for the new `--uc-size-preferred:min(62vw, 72vh)` custom property rendering intact (commas preserved, no mangling).
- Confirmed component remains square (identical `width`/`height` formula, unchanged pattern).
- Confirmed single center / single coordinate system preserved: every new value is either a ratio (auto-correct) or an absolute px value fed through the same unchanged `distribution.js` functions — no new center, no new coordinate system, no window-dimension reads introduced.
- Confirmed `runtime.js` and `distribution.js` have zero diffs this round — rotation, pointer tracking, idle sweep, inertia, touch two-tap, and reduced-motion logic are untouched.
- Confirmed no legacy file touched; preview route still builds and renders.

### Remaining browser-only visual decisions
- Whether the larger component (up to 620px) reads as "a stronger and more appropriate proportion of the viewport" in actual layout, or feels too large on typical laptop screens (which, per the height-bound finding above, will generally land around 550–580px, not the full 620px ceiling).
- Real rendered pill legibility at the new, larger 67–134px range — the character-width model remains an estimate, not measured text.
- Whether the 560px short-viewport padding threshold is the right cutoff, and whether the 568×320 residual overflow case is worth a further, more invasive preview-only change (e.g., hiding the toolbar hint text at extreme heights) or is an acceptable disclosed limit.
- Whether the height-bound behavior on common laptop viewports (component governed by `72vh` rather than growing with window width) matches the intended feel, or whether the `72vh` coefficient itself should be revisited once seen live.
- General visual balance of the needle/rings/hub at the new, much larger absolute pixel sizes — proportions are mathematically identical to before, but "looks right at 220-460px" and "looks right at 280-620px" are not guaranteed to be identical perceptual experiences (e.g. stroke anti-aliasing, hairline crispness) without a live check.
