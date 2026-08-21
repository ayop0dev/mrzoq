/**
 * Unified Compass — responsive distribution.
 *
 * Resolves, from the component's own measured size, which of the configured
 * floating elements are visible, what angle/anchor-band each one gets, and
 * what pill width is actually safe given that geometry. Nothing here reads
 * window.innerWidth/innerHeight — the "mode" is selected from the measured
 * container size, which is itself a pure function of the CSS size formula
 * (see config.js `size`). This is a mode-SELECTOR, not a position input: no
 * element position is ever computed from viewport dimensions, only from the
 * measured root box, exactly as everywhere else in this component.
 *
 * Replaces the previous single global anchor ring + single chord-derived
 * pill-width ratio (which forced one number to work for every breakpoint at
 * once, and produced pills far narrower than the phrases they hold). Each
 * responsive mode now has its own visible-item count and anchor bands, and
 * the safe pill width is derived from that mode's own geometry — so desktop
 * is no longer constrained by mobile's tighter numbers.
 */
import { clockPositionToOffset } from './geometry.js';

/**
 * Pick the active responsive mode for a measured container size. `modes`
 * must be ordered smallest `maxContainerSizePx` first; the first mode whose
 * threshold the size does not exceed wins (the last mode should carry
 * `Infinity` as a catch-all).
 */
export function resolveMode(containerSizePx, modes) {
  for (const mode of modes) {
    if (containerSizePx <= mode.maxContainerSizePx) return mode;
  }
  return modes[modes.length - 1];
}

/**
 * Build anchor positions for the currently visible subset.
 *
 * - Visibility is a deterministic PREFIX of `totalCount` items in their
 *   authored dataset order (dataset order doubles as an editable visibility
 *   priority list — see data.js). No items are removed from the dataset;
 *   only a subset is positioned/shown per mode.
 * - The visible subset is always re-spread evenly across 360° (not left at
 *   whatever angle it would have held in the full 12-item arrangement), so
 *   reducing density never leaves lopsided gaps.
 * - Items alternate between the mode's anchor bands (by their position
 *   within the visible subset, not their original dataset index), forming
 *   concentric rings when `bandRadiusRatios.length > 1`.
 */
export function buildVisiblePositions(mode, totalCount, halfExtentPx) {
  const visibleCount = Math.min(mode.visibleCount ?? totalCount, totalCount);
  const bandRadiiPx = mode.bandRadiusRatios.map((ratio) => ratio * halfExtentPx);

  const positions = [];
  for (let i = 0; i < visibleCount; i++) {
    const angleDeg = (i / visibleCount) * 360;
    const radiusPx = bandRadiiPx[i % bandRadiiPx.length];
    const { x, y } = clockPositionToOffset(angleDeg, radiusPx);
    positions.push({ visibleIndex: i, angleDeg, radiusPx, x, y });
  }
  return positions;
}

/**
 * Derive the largest pill width that cannot overlap a neighbor, accounting
 * for pill height, the focus-pulse scale, and bounded drift — not just the
 * 1D center-to-center distance between anchors (audit follow-up: a plain
 * chord/width comparison ignores height and motion entirely).
 *
 * Model: two axis-aligned pill footprints (each pill's own width/height,
 * expanded by the focus-pulse scale and one pill's worth of drift as a
 * safety buffer) do not overlap if EITHER their horizontal separation OR
 * their vertical separation exceeds the corresponding combined half-extent.
 * For every adjacent pair of visible anchors, if the vertical separation
 * already clears on its own (common for cross-band neighbors, since band
 * radii differ), that pair imposes no width constraint at all; otherwise it
 * bounds the width from its horizontal separation. The tightest pair across
 * the whole visible set is the binding constraint.
 *
 * This is a closed-form, single-pass calculation over the visible set (not
 * an iterative/real-time collision solver), evaluated once per layout() call.
 */
export function resolvePillGeometry(positions, halfExtentPx, options) {
  const { pillHeightPx, focusScale, driftBufferPx, exclusionFloorPx, pill } = options;
  const heightThreshold = pillHeightPx * focusScale + driftBufferPx;

  let neighborBoundPx = Infinity;
  const n = positions.length;
  for (let i = 0; i < n; i++) {
    const a = positions[i];
    const b = positions[(i + 1) % n];
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    if (dy >= heightThreshold) continue; // this pair is already safe on the vertical axis
    const widthBound = (dx - driftBufferPx) / focusScale;
    if (widthBound < neighborBoundPx) neighborBoundPx = widthBound;
  }

  const radii = positions.map((p) => p.radiusPx);
  const maxRadiusPx = Math.max(...radii);
  const minRadiusPx = Math.min(...radii);
  // Containment: the outermost band's pills must not extend past the
  // component's own edge. Exclusion: the innermost band's pills must not
  // creep into the compass's own keep-clear zone around the hub/rings.
  const containmentBoundPx = (2 * (halfExtentPx - maxRadiusPx - driftBufferPx)) / focusScale;
  const exclusionBoundPx = (2 * (minRadiusPx - exclusionFloorPx - driftBufferPx)) / focusScale;

  const rawMaxWidthPx = Math.min(neighborBoundPx, containmentBoundPx, exclusionBoundPx);
  // Only a ceiling is enforced here — clamping DOWN is always safe. There is
  // deliberately no floor: forcing width upward when the geometry-derived
  // bound is smaller would silently reintroduce the exact overlap this
  // function exists to prevent. Each mode's config (config.js
  // `responsive.modes`) is tuned so the derived value stays comfortably
  // above a usable minimum — verified per-mode in the implementation report,
  // not enforced here as a runtime override.
  const maxWidthPx = Math.max(0, Math.min(rawMaxWidthPx, pill.absoluteMaxWidthPx));
  const minWidthPx = Math.min(maxWidthPx * pill.minWidthMaxRatio, maxWidthPx);
  const paddingPx = Math.min(
    Math.max(maxWidthPx * pill.paddingRatio, pill.minPaddingPx),
    pill.maxPaddingPx
  );

  return { maxWidthPx, minWidthPx, paddingPx };
}
