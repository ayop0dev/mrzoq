# Marzoq.com — Design/Architecture Compliance Audit

Date: 2026-07-05
Scope: All live pages (`src/pages/**`) and core components (`Compass`, `Ecosystem`, `Header`, `Footer`, `Navigation`, `Card`, `ContentBlock`, `GlassPanel`, `Logo`) compared against the canonical documents in `/architecture`:

- `marzoq.architecture.md`
- `marzoq.design-system.md`
- `marzoq.visual.identity.md`
- `compass.component.canon.md`
- `ecosystem.specification.md`
- `homepage.specification.md`

Method: full read of all six canonical specs, then line-level comparison against the actual Astro/CSS/JS implementation. `PROJECT_STATE.md`'s remediation claims (2026-06-28) were independently re-verified rather than trusted.

---

## Verdict

`PROJECT_STATE.md` currently marks the project "Remediation Complete (Round 2)" with all 14 audit issues resolved. **That is no longer accurate.** Several of the claimed fixes do not hold for the full page set — two Experience Pages can scroll (a hard architectural violation), one accessibility remediation regressed, and the Ecosystem component's layer system doesn't match its own spec. None of these are cosmetic; they contradict rules the architecture explicitly calls "non-canonical if violated."

---

## P0 — Architecture-breaking

### 1. `about.astro` is an Experience Page with no viewport lock
**Rule violated:** *Single Viewport* (`marzoq.architecture.md` §Product Principles, `marzoq.design-system.md` §5) — Experience Pages must fit 100dvh with no vertical scroll, at any viewport size.

`about.astro` uses a plain `.page-wrapper { min-height: 100vh }` with no `overflow: hidden`, no `height: 100dvh` lock, and none of the `page-experience` / `is-locked` machinery the other Experience Pages use. Its `@media (max-width: 1024px)` layout collapses a two-column grid (hero + 3-value grid + sidebar cards) into a single stacked column that is taller than one viewport on common tablet/phone heights. This page **will scroll**, despite being classified as an Experience Page.

### 2. `services.astro` / `contact.astro` only lock the viewport ≥768px
**Rule violated:** same as above.

Both pages wrap content in `.page-content.is-locked`, but the lock only applies inside `@media (min-width: 768px)`. Below that — i.e., the entire phone range — there is no `overflow: hidden` and no height constraint; only a `@media (max-height: 600px)` density-reduction rule exists, which doesn't fire on typical phone viewports like 390×844. The MRZ-004 remediation (PROJECT_STATE.md) fixed a short-viewport overflow bug but never addressed the missing mobile-width lock, so "no scrolling on Experience Pages at any viewport size" is not actually met on phones for either page.

### 3. Ecosystem's Middle layer is unused; layer assignment is inverted vs. spec
**Rule violated:** `ecosystem.specification.md` §Orbital Layers — Far/Middle/Near must each own distinct visual weight; Middle hosts most Platform Tokens, Near hosts most Query Pills.

`Ecosystem.astro` assigns **all** Platform Tokens to `layer: 'near'` and **all** Query Pills to `layer: 'far'`. The Middle layer is never populated — it's structurally dead. The actual mapping is also the inverse of the canonical one (spec: Platforms→Middle, Queries→Near; actual: Platforms→Near, Queries→Far). `--mid` CSS variants exist in `PlatformToken.astro`/`QueryPill.astro` but are unreachable dead code. This is a structural deviation from a document marked "Canonical... any implementation that contradicts this specification is considered non-canonical."

---

## P1 — Significant, but contained

### 4. Compass auto-rotates continuously at idle — an explicitly forbidden behavior
**Rule violated:** `compass.component.canon.md` §Forbidden Behaviours — "must never: spin continuously, auto-rotate."

`compass.js` has a mobile "Continuous Sweeping Mode (6°/sec)" that rotates the needle indefinitely while idle, and on desktop the idle needle target is drawn from the Ecosystem's ever-advancing ambient orbital angle — so it drifts continuously there too, rather than settling into the specified "certain, calm" idle state.

### 5. Ecosystem disables focus indication under reduced motion
**Rule violated:** `ecosystem.specification.md` §State 04 Reduced Motion — must disable drift/parallax/breathing but **preserve** focus indication.

`ecosystem.js`'s reduced-motion branch returns early, before the focus-detection block ever runs — so users with `prefers-reduced-motion` lose Focus feedback entirely, contradicting the explicit "preserve: ... focus indication" requirement. This is an accessibility regression hiding inside a resolved-looking motion feature.

### 6. PROJECT_STATE.md's "all opacity-based text replaced" claim (MRZ-005) is false site-wide
**Rule violated:** MRZ-005 remediation claim; WCAG contrast intent behind it.

Still present, all rendered on every page:
- `Footer.astro`: `.footer__link`, `.footer__dot`, `.footer__copyright`, `.footer__social-link` all use `opacity: .5`
- `Navigation.astro`: `.navigation__link { opacity: .5 }` (desktop, default state of every nav link)
- `Logo.astro`: `.logo__text-en { opacity: .5 }`
- `ContentBlock.astro`: `.content-block__subtext { opacity: .75 }` — the homepage's primary subtext
- `contact.astro` / `services.astro`: `.contact__info-label`, `.service-card__number` also opacity-based

Against the low-chroma `#EADED2` background, these can drop effective contrast below WCAG AA — the exact failure mode MRZ-005 was supposed to close, just missed in components outside the original sweep.

### 7. Footer link touch target regresses to 32px on mobile
**Rule violated:** MRZ-013 remediation claim (≥44px touch targets).

`Footer.astro` sets `min-block-size: 44px` at desktop but overrides it to `32px` inside `@media (max-width: 767px)` — a regression specifically on the dominant mobile viewport.

### 8. Compass Signal stretch animates raw SVG geometry, not transform/opacity
**Rule violated:** `compass.component.canon.md` §Performance Requirements — "Only transform and opacity may animate."

`compass.js` mutates `y2`/`cy` SVG attributes directly every frame for signal stretching instead of a transform-based scale, forcing layout/geometry recalculation rather than compositor-only work.

---

## P2 — Minor / polish

9. **Compass breathing couples opacity+scale to the whole SVG continuously**, including during needle rotation — the canon says rotation should change "only orientation... never scale/opacity" during that motion. The breathing amplitude is tiny (scale 1→1.008, opacity 1→0.96) so visually negligible, but it is a literal rule overlap.
10. **Missing `@font-face` for Thmanyah weight 600** — `--weight-semibold: 600` is used throughout (`Card.astro`, `about.astro`) but only weights 300/400/500/700/800 are declared, so the browser faux-bolds instead of rendering the real weight. Weight 300 also falls outside the canonical 400–800 range.
11. Compass accessibility label reads `"وجهات التنقل — Navigation Destinations"` rather than the canon's literal `"Primary Navigation"`/`"Guidance Navigation"` wording — functionally fine, technically non-literal.
12. `blog/[slug].astro` blockquote uses a 3px `border-inline-start` accent — a legitimate long-form quote marker on a Content Page (not a card/callout stripe), but worth trimming to 1px to match the strict letter of the "no thick accent borders" rule.
13. `--color-bg-gradient` uses pure `#ffffff` as a gradient stop — stylistic only, not a hard violation.

---

## Confirmed Compliant

- **Color tokens**: `--color-primary: #065830`, `--color-background: #eaded2` — exact match to canon (`tokens.css`).
- **Homepage six-layer composition**: Background → Ecosystem → Compass → Content → Header → Footer implemented as layered `position:absolute` siblings with canonical z-index order, not sequential/stacked sections. Header is not sticky, doesn't collapse.
- **Homepage viewport lock**: `.page-experience` correctly uses `position:fixed; inset:0; height:100dvh; overflow:hidden` at all breakpoints.
- **Global horizontal scroll prevention**: `body { overflow-x: hidden }` sitewide.
- **Compass singleton**: rendered only once, only on the homepage; takes zero props (no CMS/business content can enter it).
- **Compass SVG structure**: correct DOM order (Deep → Mid → Core → Hub → Needle → Signal), each independently addressable; Hub position itself never translates.
- **Needle rotation mechanics**: shortest-angle interpolation, single rotate() transform, inertia-based (no instant snapping outside the reduced-motion branch).
- **Ecosystem focus logic**: driven only by Compass-needle alignment, never `:hover`; deterministic orbital drift (pure time-based formula, no `Math.random`); no particle-system behaviors, no spawn/destroy, no rapid orbiting.
- **No gradient text, no thick colored accent-stripe borders** on Card/ContentBlock/GlassPanel.
- **Landmarks**: every page uses a real `<main>`, no `role="main"` divs.
- **Copyright year**: dynamic (`new Date().getFullYear()`) everywhere, not hardcoded.

---

## Recommended Fix Order

1. Lock `about.astro` to the same `page-experience`/`is-locked` viewport pattern as the other Experience Pages (P0-1).
2. Extend `services.astro`/`contact.astro`'s `is-locked` rule below the 768px breakpoint so mobile is covered (P0-2).
3. Rewire `Ecosystem.astro`'s layer assignment: Platform Tokens → Middle, Query Pills → Near/Middle mix, and actually populate the Middle layer (P0-3).
4. Remove the continuous idle auto-rotate/drift from `compass.js`; idle state should settle rather than sweep (P1-4).
5. Move the `return` in `ecosystem.js`'s reduced-motion branch so focus detection still runs (P1-5).
6. Sweep `Footer.astro`, `Navigation.astro`, `Logo.astro`, `ContentBlock.astro` to replace `opacity`-based dim text with `--color-text-secondary` (P1-6).
7. Revert the mobile footer-link touch-target override back to ≥44px (P1-7).
8. Switch Compass signal-stretch rendering from raw attribute mutation to a transform-based approach (P1-8).

Items 9–13 (P2) are safe to batch into a later polish pass; none block a "production-ready" claim on their own, but `PROJECT_STATE.md` should not describe the project as fully remediated until at minimum the P0 items are closed — those directly contradict two documents marked Canonical.
