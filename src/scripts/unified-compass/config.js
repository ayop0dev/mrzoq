/**
 * Unified Compass — centralized configuration.
 *
 * unified-compass-component-spec.md intentionally leaves several implementation
 * details open (exact ring count/opacities, pill width bounds, inertia values,
 * idle timeout, etc.). Every one of those open values lives here, in one place,
 * so they can be tuned without touching runtime logic or markup.
 *
 * This file has no dependency on the legacy Ecosystem/Compass implementation.
 */
export const UC_CONFIG = {
  /**
   * Root component footprint. One continuous fluid formula — no per-breakpoint
   * jumps.
   *
   * Size recalibration pass: widened from `clamp(220px, 46vw, 460px)` to
   * `clamp(280px, min(62vw, 72vh), 620px)` — a larger floor/ceiling, and the
   * preferred value now also considers viewport HEIGHT (`72vh`), not just
   * width, so the component doesn't grow past what a short viewport can
   * actually hold. This still only ever depends on viewport dimensions to
   * pick a SIZE — every position/geometry value inside the component is
   * still derived solely from its own measured box (see distribution.js),
   * never from window.innerWidth/innerHeight directly.
   */
  size: {
    // width/height: clamp(min, preferred, max)
    min: '280px',
    preferred: 'min(62vw, 72vh)',
    max: '620px',
  },

  /**
   * Concentric radar rings, sharing the component's single center (spec 2.2).
   *
   * Visual tuning pass 1: the four inner rings are drawn closer together with
   * softer, lower opacity (a tight, quiet cluster near the hub rather than
   * evenly fanning out) so they support the composition instead of competing
   * with the needle.
   *
   * Visual tuning pass 2: the 5th (outermost) ring's opacity is now 0 —
   * fully invisible — rather than merely faint. It is NOT removed: the ring
   * still exists in the SVG at the same radius (0.82, still comfortably
   * outside the largest anchor band ratio, 0.78 — see `responsive.modes`)
   * and shares the same center as everything else, so it continues to act as
   * the geometric outer boundary the floating elements sit just inside of —
   * it simply no longer paints anything. Ring count is unchanged (still 5).
   */
  rings: {
    count: 5,
    // Inner four sit comfortably below the tightest inner anchor band across
    // all responsive modes (tablet's 0.42 — see `responsive.modes`), so the
    // ring cluster reads as a distinct, quiet core rather than crossing
    // through where pills sit. The 5th value (0.82) is the invisible outer
    // boundary described above.
    radiusRatios: [0.16, 0.24, 0.32, 0.38, 0.82],
    opacities: [0.16, 0.12, 0.08, 0.05, 0],
  },

  /**
   * Needle geometry and motion. All ratios are fractions of the SVG
   * half-extent (100 units).
   *
   * Visual tuning pass 2: rebuilt as a fine, lightweight instrument rather
   * than a bold arrow — a thin line-like shaft, a small tip, and a subtle
   * rear tail, echoing the legacy needle's slender character.
   *
   * Visual tuning pass 3: total reach shortened ~12.5% (0.48 -> 0.42) so the
   * needle no longer visually reaches the same radius as the floating
   * elements, leaving a clear gap to the nearest pill. The front endpoint
   * marker (filled dot + surrounding ring) introduced in pass 2 is removed
   * entirely — the needle now terminates at its triangular tip with no
   * circular decoration. Only the rendered geometry changed — rotation,
   * targeting, and inertia are untouched (see runtime.js/inertia.js).
   */
  needle: {
    lengthRatio: 0.37, // shaft-only reach, before the tip
    tipLengthRatio: 0.05, // tip length beyond the shaft — short, small triangle
    shaftWidthRatio: 0.012, // total shaft width — thin line, not a thick polygon
    overhangRatio: 0.12, // tail length beyond the hub's outer edge — slim
    // Hub — slightly reduced from the previous pass so it doesn't outweigh
    // the now much lighter needle. Ratios remain legacy-proportioned (14/8/3
    // over a 200-unit half-extent), just modestly scaled down.
    hubOuterRatio: 0.06,
    hubInnerRatio: 0.035,
    hubCoreRatio: 0.014,
    // Full 360° idle sweep duration — calm, continuous, "diver's watch" pace (spec 3.1).
    idleSweepPeriodMs: 60000,
    // Desktop pointer tracking: continuous target, needs a light, responsive spring.
    pointerSpring: { speed: 0.16, friction: 0.78 },
    // Touch two-tap targeting: a single discrete target, slightly heavier/calmer settle.
    touchSpring: { speed: 0.11, friction: 0.82 },
  },

  /**
   * Angular proximity that counts as "the needle is pointing at this
   * element", and the focus-pulse scale (spec 4, 6.1). `pulseScale` is the
   * default; a responsive mode may override it (see `responsive.modes`
   * below) — it is consumed both by the CSS `uc-pulse` keyframe (via
   * `--uc-focus-scale`) and by the pill-width safety calculation in
   * `distribution.js`, so the two can never drift out of sync with each
   * other (a smaller configured pulse is only valid if the safety math also
   * assumes that same smaller pulse).
   */
  focus: {
    thresholdDeg: 14,
    fadeMs: 700,
    pulseScale: 1.08,
  },

  /**
   * Bounded drift/breathing motion around each anchor (spec 2.3). Pure CSS,
   * no per-frame JS. `amplitudePx` is the default base magnitude — actually
   * consumed by the `uc-drift` keyframes via `--uc-drift-amp-px` — and may be
   * overridden per responsive mode below, exactly like `focus.pulseScale`.
   * `maxMagnitudeRatio` describes the keyframes' own shape (the largest
   * single-step vector length relative to the base amplitude) and is used
   * only by the pill-width safety calculation, not rendered directly.
   */
  drift: {
    // Size recalibration pass: 5 -> 7px. The component's own footprint grew
    // substantially (max 460px -> 620px); a fixed 5px wobble would have read
    // as proportionally less alive in the larger box. The reduced-motion
    // scale factor below is a RATIO (0.15), so it did not need any change —
    // it automatically applies to whatever the base amplitude is.
    amplitudePx: 7,
    maxMagnitudeRatio: 1.2,
  },

  /**
   * Pill sizing (spec 2.3: expands with content, clamped, single-line, font
   * shrinks before wrapping).
   *
   * Width bounds are NOT fixed pixel constants. They are derived at runtime
   * (see distribution.js `resolvePillGeometry`) from the actual anchor
   * positions of the currently visible set for the active responsive mode —
   * accounting for pill width AND height, the focus-pulse scale, and bounded
   * drift, not just a 1D center-to-center distance.
   *
   * Size recalibration pass: `heightPx`, `baseFontPx`, `minFontPx`,
   * `absoluteMaxWidthPx`, `minPaddingPx`, and `maxPaddingPx` were all raised
   * to match the larger component range (280-620px, was 220-460px) — every
   * one of these is an absolute pixel value, not a ratio, so none of them
   * would have scaled up on their own. `minWidthMaxRatio` and `paddingRatio`
   * are ratios and were left unchanged.
   */
  pill: {
    // Fixed pill height. Shared between the CSS (`--uc-pill-height`, set
    // statically at build time) and the pill-width safety calculation in
    // distribution.js, so the two can never disagree about how tall a pill
    // actually is.
    heightPx: 34,
    // A pill's resolved min width is this fraction of its own resolved max
    // width (always re-clamped so min <= max — see resolvePillGeometry).
    minWidthMaxRatio: 0.55,
    // Absolute ceiling only (a floor is deliberately not enforced here — see
    // distribution.js for why forcing width upward would be unsafe). Raised
    // from 150 to 220 — with the larger component range, the geometry-derived
    // value now reaches into the 130s at the desktop end (see the
    // implementation report), and the old 150 ceiling would have started
    // clipping legitimate, safety-verified width.
    absoluteMaxWidthPx: 220,
    // Horizontal padding, as a fraction of the pill's resolved max width, so
    // padding shrinks together with the pill instead of eating almost all of
    // a narrow pill's width at small sizes.
    paddingRatio: 0.16,
    minPaddingPx: 7,
    maxPaddingPx: 20,
    baseFontPx: 14,
    minFontPx: 11,
    // AI-logo mark size + gap before the label (spec: "approximately 16-20px
    // depending on pill height" — 18px sits in that range for the fixed
    // 34px pill height above). Both are read by runtime.js's pill text-fit
    // pass so the reserved icon space is never double-counted or ignored.
    logoSizePx: 18,
    logoGapPx: 6,
  },

  /** Tablet/mobile two-tap model (spec 3.3). */
  touch: {
    idleTimeoutMs: 4000,
  },

  /** Desktop pointer-tracking layer (spec 3.2, 3.5). */
  pointer: {
    // If the pointer stops moving (without leaving the component) for this
    // long, treat it as inactive and fall back to the idle sweep — the
    // desktop equivalent of the touch idle timeout above (audit D5).
    idleTimeoutMs: 2500,
  },

  /**
   * Responsive floating-element distribution.
   *
   * The active mode is selected from the component's own MEASURED container
   * size (never window.innerWidth) — see distribution.js `resolveMode`. This
   * is a config-profile selector only: it never itself produces a position,
   * so it does not reintroduce viewport-based positioning.
   *
   * Each mode controls, independently of every other mode:
   * - `visibleCount`: how many of the configured floating elements are shown
   *   (a deterministic PREFIX of the dataset in its authored order — see
   *   data.js. Items are never removed from the dataset, only hidden).
   * - `bandRadiusRatios`: one ratio per concentric anchor band (fraction of
   *   the container's half-extent). Two bands means visible items alternate
   *   between an inner and outer ring; a single-entry array means one ring.
   * - optional `focusScale`/`driftAmplitudePx` overrides (falling back to
   *   `focus.pulseScale`/`drift.amplitudePx` above when omitted) — none of
   *   the current modes need one; the global defaults above were themselves
   *   lowered (visual tuning pass) precisely so every mode benefits equally.
   *
   * `modes` must be ordered by ascending `maxContainerSizePx`; the last entry
   * should use `Infinity` as a catch-all.
   *
   * Size recalibration pass: thresholds and band ratios were fully
   * re-derived for the new 280-620px component range (the old 240/300/380
   * thresholds were tuned for a 220-460px range and would have left
   * `smallMobile` almost entirely unreachable — the new floor, 280px, is
   * already above the old smallMobile ceiling). `visibleCount` per mode was
   * reviewed and kept unchanged: the dataset only has 12 items, tablet/
   * desktop already show all of them, and the larger geometry is better
   * spent on wider pills than on showing more items. Every band-ratio pair
   * below was re-verified (not assumed) against distribution.js's exact
   * safety model at both ends of its mode's size range — see the
   * implementation report for the full resolved-width table.
   *
   * AI-logo pass: data.js's dataset grew from 12 to 18 items (6 new AI
   * product pills auto-generated from assets/ai-logos/, appended at the end
   * of the priority order). Only `tablet` and `desktop` visibleCount were
   * raised, from 12 to 18, to keep their existing "show the whole dataset"
   * intent (see comment above) now that the dataset is bigger — re-verified
   * against distribution.js's safety model across each mode's full size
   * range; the derived pill width stays in the 56-84px range, comparable to
   * `mobile`'s existing 8-item widths (59-86px), so nothing overlaps and
   * nothing needs re-tuned bandRadiusRatios. `smallMobile`/`mobile` are left
   * untouched: their visibleCount is a deliberate reduced-density choice
   * (same comment above), not a "must show everything" mode, so a larger
   * total dataset does not obligate them to show more.
   */
  responsive: {
    // Minimum anchor radius ratio — keeps the innermost band's pills clear
    // of the compass hub/inner rings at rest. A ratio, so it did not need to
    // change for the larger size range.
    exclusionRatio: 0.2,
    modes: [
      {
        id: 'smallMobile',
        maxContainerSizePx: 320,
        visibleCount: 6,
        bandRadiusRatios: [0.53, 0.67],
      },
      { id: 'mobile', maxContainerSizePx: 400, visibleCount: 8, bandRadiusRatios: [0.5, 0.72] },
      { id: 'tablet', maxContainerSizePx: 500, visibleCount: 18, bandRadiusRatios: [0.42, 0.77] },
      {
        id: 'desktop',
        maxContainerSizePx: Infinity,
        visibleCount: 18,
        bandRadiusRatios: [0.46, 0.74],
      },
    ],
  },

  /** Reduced motion: slowed, not stopped (spec 8). */
  reducedMotion: {
    sweepSpeedScale: 0.15, // idle sweep runs at 15% of normal angular speed
  },

  /**
   * Device-class detection. Capability-based rather than viewport-width-based so a
   * touch laptop or a mouse-equipped tablet still gets the interaction model that
   * matches its actual input, matching the spec's Desktop/Tablet-Mobile split.
   */
  pointerModeQuery: '(hover: hover) and (pointer: fine)',
};
