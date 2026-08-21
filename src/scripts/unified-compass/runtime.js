/**
 * Unified Compass — the one runtime controller.
 *
 * Single center, single coordinate system, single animation loop. There is no
 * separate "Ecosystem runtime" and "Compass runtime" exchanging state here —
 * one controller owns the root's dimensions, the shared center, the needle,
 * every floating element's position/focus, and its own cleanup.
 *
 * Generic, dependency-free helpers (clamp, reduced-motion) are imported from
 * the project's neutral motion utilities, per the project's reuse rules; all
 * position/orbit/inertia/pointer logic below is written fresh for this
 * component and has no dependency on the legacy Ecosystem/Compass runtime.
 */
import { clamp } from '../motion/lerp.js';
import { prefersReducedMotion, onReducedMotionChange } from '../motion/reduced-motion.js';
import { UC_CONFIG } from './config.js';
import { offsetToClockAngle, angularDelta, normalizeAngle } from './geometry.js';
import { createAngleSpring } from './inertia.js';
import { resolveMode, buildVisiblePositions, resolvePillGeometry } from './distribution.js';

/**
 * Per-item expanded-safe width ceiling — additive to distribution.js, not a
 * change to it. resolvePillGeometry's shared --uc-pill-max assumes every
 * visible pill could be at that width SIMULTANEOUSLY (the correct, necessary
 * assumption for the normal at-rest layout). But the expand/collapse
 * interaction model guarantees only ONE item is ever expanded at a time
 * (desktop hover is a single pointer position; touch's touchTargetId is a
 * single value) — so while ONE item is expanding, every other visible item
 * is provably still at its own actual collapsed width (a logo item's fixed
 * circle diameter, or a non-logo item's collapsed pillMin width), not the
 * shared worst-case max. This computes a tighter — but still exactly the
 * same axis-aligned-footprint, non-overlap math resolvePillGeometry uses —
 * bound per item, given its real neighbors' real collapsed widths instead of
 * the shared assumption. It reduces to resolvePillGeometry's own formula
 * exactly when both neighbor widths are equal (verified algebraically), so
 * this is a generalization of the existing safety model, not a new one.
 *
 * Only ever used to size the EXPANDED state of an already-positioned item —
 * it does not, and cannot, influence any anchor position, band, or the
 * responsive mode selection, all of which remain entirely
 * distribution.js's.
 */
function computeExpandMaxWidths(positions, steadyWidthsPx, halfExtentPx, options) {
  const { focusScale, driftBufferPx, exclusionFloorPx, pillHeightPx, absoluteMaxWidthPx } = options;
  const heightThreshold = pillHeightPx * focusScale + driftBufferPx;
  const n = positions.length;
  const result = new Array(n);

  for (let i = 0; i < n; i++) {
    const a = positions[i];
    let neighborBoundPx = Infinity;
    const neighborIndices = new Set([(i - 1 + n) % n, (i + 1) % n]);

    for (const j of neighborIndices) {
      if (j === i) continue; // degenerate n<=2 self-pairing guard
      const b = positions[j];
      const dx = Math.abs(b.x - a.x);
      const dy = Math.abs(b.y - a.y);
      if (dy >= heightThreshold) continue; // already safe on the vertical axis
      const bound = (2 * (dx - driftBufferPx)) / focusScale - steadyWidthsPx[j];
      if (bound < neighborBoundPx) neighborBoundPx = bound;
    }

    // Containment/exclusion use THIS item's own radius (not the global
    // max/min radius across all visible items, as resolvePillGeometry does)
    // — again, because only this one item is being sized right now.
    const containmentBoundPx = (2 * (halfExtentPx - a.radiusPx - driftBufferPx)) / focusScale;
    const exclusionBoundPx = (2 * (a.radiusPx - exclusionFloorPx - driftBufferPx)) / focusScale;

    const rawMaxWidthPx = Math.min(neighborBoundPx, containmentBoundPx, exclusionBoundPx, absoluteMaxWidthPx);
    result[i] = Math.max(0, rawMaxWidthPx);
  }

  return result;
}

export function initUnifiedCompass(root) {
  const needleGroup = root.querySelector('[data-uc-needle]');
  // DOM order matches FLOATING_ELEMENTS' authored dataset order (Astro
  // renders them via .map() in that order) — this doubles as the visibility
  // priority list (see data.js), so no separate ordering attribute is needed.
  const elementNodes = Array.from(root.querySelectorAll('[data-uc-element]'));

  const elements = elementNodes.map((node) => ({
    id: node.dataset.id,
    node,
    label: node.querySelector('[data-uc-label]'),
    logo: node.querySelector('[data-uc-logo]'),
    effectiveAngleDeg: 0,
    visible: false,
    focused: false,
  }));
  const elementsById = new Map(elements.map((el) => [el.id, el]));

  // ─── Single center / single coordinate system ───────────────────────────
  // Every position below (rings via CSS, needle rotation, floating anchors)
  // is derived from this one measured root box. Nothing here reads
  // window.innerWidth/innerHeight. The responsive "mode" (see distribution.js)
  // is selected from that same measured size — a config-profile switch, not
  // a position input.
  //


  function layout() {
    const rect = root.getBoundingClientRect();
    const containerSize = Math.min(rect.width, rect.height);
    const halfExtentPx = containerSize / 2;

    const activeMode = resolveMode(containerSize, UC_CONFIG.responsive.modes);
    const focusScale = activeMode.focusScale ?? UC_CONFIG.focus.pulseScale;
    const driftAmplitudePx = activeMode.driftAmplitudePx ?? UC_CONFIG.drift.amplitudePx;
    const driftBufferPx = driftAmplitudePx * UC_CONFIG.drift.maxMagnitudeRatio;
    const exclusionFloorPx = UC_CONFIG.responsive.exclusionRatio * halfExtentPx;

    const positions = buildVisiblePositions(activeMode, elements.length, halfExtentPx);
    const pillGeometry = resolvePillGeometry(positions, halfExtentPx, {
      pillHeightPx: UC_CONFIG.pill.heightPx,
      focusScale,
      driftBufferPx,
      exclusionFloorPx,
      pill: UC_CONFIG.pill,
    });

    root.style.setProperty('--uc-pill-min', `${pillGeometry.minWidthPx}px`);
    root.style.setProperty('--uc-pill-max', `${pillGeometry.maxWidthPx}px`);
    root.style.setProperty('--uc-pill-pad', `${pillGeometry.paddingPx}px`);
    root.style.setProperty('--uc-drift-amp-px', `${driftAmplitudePx}px`);
    root.style.setProperty('--uc-focus-scale', `${focusScale}`);

    // Every visible item's actual collapsed (steady-state) width: a logo
    // item's fixed circle diameter, or a non-logo item's collapsed pillMin
    // width — the real footprint each neighbor has whenever it ISN'T the one
    // currently expanded (see computeExpandMaxWidths above).
    const steadyWidthsPx = positions.map(
      (_, i) => (elements[i]?.logo ? UC_CONFIG.pill.heightPx : pillGeometry.minWidthPx)
    );
    const expandMaxWidthsPx = computeExpandMaxWidths(positions, steadyWidthsPx, halfExtentPx, {
      focusScale,
      driftBufferPx,
      exclusionFloorPx,
      pillHeightPx: UC_CONFIG.pill.heightPx,
      absoluteMaxWidthPx: UC_CONFIG.pill.absoluteMaxWidthPx,
    });

    elements.forEach((el, index) => {
      const position = positions[index];
      el.visible = Boolean(position);
      el.node.classList.toggle('uc-hidden', !el.visible);

      if (!position) {
        // Not part of the currently visible subset (audit follow-up:
        // responsive density control) — no position, no focus, no stale
        // touch target referencing it.
        if (el.focused) {
          el.focused = false;
          el.node.classList.remove('is-focused');
        }
        if (touchTargetId === el.id) clearTouchTarget();
        return;
      }

      el.effectiveAngleDeg = position.angleDeg;
      el.node.style.setProperty('--ax', `${position.x}px`);
      el.node.style.setProperty('--ay', `${position.y}px`);
      el.expandMaxWidthPx = expandMaxWidthsPx[index];
    });

    fitAllPillText(pillGeometry);
  }

  // ─── Pill text fit: expand to content, clamp, shrink font, then verify ───
  //
  // A single blind "scale by naturalWidth ratio" estimate cannot be trusted:
  // real font metrics don't scale perfectly linearly with font-size. This
  // re-measures after each attempt and only declares defeat (falling back to
  // a visible ellipsis, never silent clipping) once the configured minimum
  // readable font size has actually been tried and confirmed not to fit.

  const FIT_ATTEMPTS = 3;

  // Logo-item expand/collapse (label reveal) needs a concrete pixel target
  // to transition the label's own width to/from 0 — animating to/from `auto`
  // is not reliably smooth across browsers. This reuses the exact same
  // scrollWidth measurement fitPillText already takes for the font-fit pass,
  // so it never re-measures or duplicates logic; it's a no-op for non-logo
  // elements (nothing in the CSS reads --uc-label-w for them — their label
  // stays naturally sized and is instead revealed/cropped by the SURFACE's
  // own width + overflow:hidden, see UnifiedCompass.astro).
  function setLabelWidthVar(el, widthPx) {
    if (!el.logo) return;
    el.label.style.setProperty('--uc-label-w', `${Math.max(0, widthPx)}px`);
  }

  // The surface is `box-sizing: border-box` with a 1px solid border on each
  // side (UnifiedCompass.astro) — that border eats into the declared
  // width/min-width/max-width, same as padding does. The shared
  // --uc-pill-min/--uc-pill-max ceilings (distribution.js) have always had
  // this same ~2px gap between "declared width" and "actual content room,"
  // it just went unnoticed: a generous shared ceiling had slack to absorb
  // it. Sizing exactly to content (--uc-expand-w below) has none, so it must
  // be accounted for explicitly or the label clips by ~2px right at the
  // edge — invisible in the numbers, very visible on screen.
  const SURFACE_BORDER_WIDTH_PX = 2; // matches `border: 1px solid` * 2 sides

  // The exact width (padding + border + logo + gap + the label at whatever
  // size it was just fitted to) the EXPANDED state renders at — content-fit,
  // not a shared ceiling, per item, matching "expand until the entire label
  // is visible, based on the measured rendered width." Applies to every item
  // (logo or not); already bounded by construction, since `labelWidthPx` was
  // itself fitted against the same per-item expand ceiling below.
  function setExpandWidthVar(el, pillGeometry, logoReservedPx, labelWidthPx) {
    const requiredWidthPx =
      pillGeometry.paddingPx * 2 + SURFACE_BORDER_WIDTH_PX + logoReservedPx + labelWidthPx;
    el.node.style.setProperty('--uc-expand-w', `${requiredWidthPx}px`);
  }

  function fitPillText(el, pillGeometry, expandMaxWidthPx) {
    if (!el.label || !el.visible) return;
    const { pill } = UC_CONFIG;
    // Reserve the logo's own rendered width (not a duplicated constant —
    // read straight from the box the CSS actually sized via
    // --uc-pill-logo-size, config.js `pill.logoSizePx`) plus its gap to the
    // label, so a logo pill's text isn't shrunk/ellipsized any more
    // aggressively than the icon actually requires.
    const logoReservedPx = el.logo ? el.logo.getBoundingClientRect().width + pill.logoGapPx : 0;
    // Fit against THIS item's own expand ceiling (computeExpandMaxWidths),
    // not the shared --uc-pill-max — the expanded state is sized per item,
    // to its own measured content, up to its own (less conservative, still
    // provably safe) bound.
    const budgetPx = expandMaxWidthPx ?? pillGeometry.maxWidthPx;
    const maxTextWidth =
      budgetPx - pillGeometry.paddingPx * 2 - SURFACE_BORDER_WIDTH_PX - logoReservedPx;

    el.node.classList.remove('uc-truncated');

    if (maxTextWidth <= 0) {
      el.node.classList.add('uc-truncated');
      setLabelWidthVar(el, 0);
      setExpandWidthVar(el, pillGeometry, logoReservedPx, 0);
      return;
    }

    let fontSizePx = pill.baseFontPx;
    el.label.style.setProperty('--uc-pill-font', `${fontSizePx}px`);
    let naturalWidth = el.label.scrollWidth;

    if (naturalWidth <= maxTextWidth || naturalWidth === 0) {
      const shownWidthPx = Math.min(naturalWidth, maxTextWidth);
      setLabelWidthVar(el, shownWidthPx);
      setExpandWidthVar(el, pillGeometry, logoReservedPx, shownWidthPx);
      return;
    }

    for (let attempt = 0; attempt < FIT_ATTEMPTS; attempt += 1) {
      const scale = maxTextWidth / naturalWidth;
      const nextSize = clamp(fontSizePx * scale, pill.minFontPx, pill.baseFontPx);
      if (nextSize === fontSizePx) break; // no further correction possible
      fontSizePx = nextSize;
      el.label.style.setProperty('--uc-pill-font', `${fontSizePx}px`);
      naturalWidth = el.label.scrollWidth;

      if (naturalWidth <= maxTextWidth) {
        setLabelWidthVar(el, naturalWidth);
        setExpandWidthVar(el, pillGeometry, logoReservedPx, naturalWidth);
        return;
      }
    }

    // Verified: even at the configured minimum readable font size, the
    // complete phrase does not fit within this item's own expand ceiling.
    // Deterministic fallback — visible ellipsis, never silent clipping
    // (audit D4) — the same pre-existing safety net this component has
    // always used for the rare case geometry genuinely cannot fit content.
    el.node.classList.add('uc-truncated');
    setLabelWidthVar(el, maxTextWidth);
    setExpandWidthVar(el, pillGeometry, logoReservedPx, maxTextWidth);
  }

  function fitAllPillText(pillGeometry) {
    elements.forEach((el) => fitPillText(el, pillGeometry, el.expandMaxWidthPx));
  }

  // ─── Device / motion mode ────────────────────────────────────────────────

  const pointerModeQuery = window.matchMedia(UC_CONFIG.pointerModeQuery);
  let deviceClass = pointerModeQuery.matches ? 'desktop' : 'touch';

  // Reflected to the DOM (not just kept as a JS closure variable) so the
  // touch-only logo-expand CSS rule (UnifiedCompass.astro) can be scoped to
  // it — the desktop hover rule is instead gated by its own
  // `(hover: hover) and (pointer: fine)` media query, so the two triggers
  // never fire from the wrong input.
  function reflectDeviceClass() {
    root.dataset.deviceClass = deviceClass;
  }
  reflectDeviceClass();

  function handlePointerModeChange(event) {
    deviceClass = event.matches ? 'desktop' : 'touch';
    pointerActive = false;
    clearTouchTarget();
    reflectDeviceClass();
    // Immediate correctness on device-class switch: the next animation frame
    // would recompute this anyway via updateFocus(), but resetting here
    // avoids a one-frame stale aria-expanded="true" for whatever was
    // touch-expanded at the moment the input mode changed.
    elements.forEach((el) => el.node.setAttribute('aria-expanded', 'false'));
  }
  pointerModeQuery.addEventListener('change', handlePointerModeChange);

  let reducedMotion = prefersReducedMotion();
  const unsubscribeReducedMotion = onReducedMotionChange((value) => {
    reducedMotion = value;
  });

  // ─── Desktop pointer tracking ────────────────────────────────────────────
  //
  // `pointerActive` tracks whether the pointer is physically within the
  // component. `lastPointerMoveTime` tracks when it last actually moved.
  // Both feed the idle-fallback decision in frame() below (audit D5): the
  // needle falls back to idle sweep both when the pointer leaves AND when it
  // stops moving without leaving, for as long as UC_CONFIG.pointer.idleTimeoutMs.

  let pointerActive = false;
  let pointerAngleDeg = 0;
  let lastPointerMoveTime = 0;
  let cachedRect = root.getBoundingClientRect();

  function updatePointerAngle(clientX, clientY) {
    const cx = cachedRect.left + cachedRect.width / 2;
    const cy = cachedRect.top + cachedRect.height / 2;
    pointerAngleDeg = offsetToClockAngle(clientX - cx, clientY - cy);
  }

  function onPointerEnter() {
    if (deviceClass !== 'desktop') return;
    cachedRect = root.getBoundingClientRect();
    pointerActive = true;
    lastPointerMoveTime = performance.now();
  }
  function onPointerLeave() {
    pointerActive = false;
  }
  function onPointerMove(event) {
    if (deviceClass !== 'desktop') return;
    updatePointerAngle(event.clientX, event.clientY);
    pointerActive = true;
    lastPointerMoveTime = performance.now();
  }

  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('pointermove', onPointerMove);

  // ─── Tablet / mobile two-tap targeting (spec 3.3) ───────────────────────

  let touchTargetId = null;
  let idleTimer = null;

  function clearIdleTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function clearTouchTarget() {
    clearIdleTimer();
    touchTargetId = null;
  }

  function scheduleIdleReset() {
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      touchTargetId = null;
    }, UC_CONFIG.touch.idleTimeoutMs);
  }

  function onElementClick(event) {
    if (deviceClass === 'desktop') return; // native link click behavior is correct as-is

    const id = event.currentTarget.dataset.id;

    if (touchTargetId === id) {
      // Second tap on the already-targeted element: let the link open.
      clearTouchTarget();
      return;
    }

    // First tap, or a tap on a different element: interact only, never navigate.
    // "Last tap wins" falls out naturally — there is no queueing here.
    event.preventDefault();
    touchTargetId = id;
    scheduleIdleReset();
  }

  elements.forEach((el) => el.node.addEventListener('click', onElementClick));

  // ─── Item expand/collapse: aria-expanded sync + tap-outside-collapse ─────
  //
  // Every item (logo or not) now has a genuine collapsed/expanded visual
  // state (UnifiedCompass.astro): a logo item collapses to its circle, a
  // non-logo item collapses to its narrow preview pill. The visual itself is
  // driven entirely by CSS (:hover/:focus-visible for desktop/keyboard,
  // .is-focused for touch) — nothing here decides WHETHER an item is
  // visually expanded. This section only keeps `aria-expanded` in sync with
  // those same native states, and adds the one genuinely new touch behavior
  // (tap outside collapses) — applied uniformly now that every item has an
  // expand/collapse state to collapse. The underlying tap1/tap2
  // navigation logic in onElementClick above is completely untouched.

  const hoverListeners = elements.map((el) => {
    // Gated to desktop: mobile browsers can synthesize mouseenter/mouseleave
    // shortly after a tap, which would otherwise desync aria-expanded from
    // the CSS (touch's hover media query never matches, so the pill never
    // actually visually expands from this).
    const onMouseEnter = () => {
      if (deviceClass === 'desktop') el.node.setAttribute('aria-expanded', 'true');
    };
    const onMouseLeave = () => {
      if (deviceClass === 'desktop') el.node.setAttribute('aria-expanded', 'false');
    };
    // Keyboard focus/blur is not gated by device class — a keyboard can be
    // used regardless of pointer capability, matching the :focus-visible
    // CSS rule, which is likewise not gated by the hover media query.
    const onFocus = () => el.node.setAttribute('aria-expanded', 'true');
    const onBlur = () => el.node.setAttribute('aria-expanded', 'false');

    el.node.addEventListener('mouseenter', onMouseEnter);
    el.node.addEventListener('mouseleave', onMouseLeave);
    el.node.addEventListener('focus', onFocus);
    el.node.addEventListener('blur', onBlur);

    return { el, onMouseEnter, onMouseLeave, onFocus, onBlur };
  });

  // Tap outside the active item collapses it — every item now has an
  // expand/collapse state to collapse, so this applies uniformly (previously
  // scoped to logo items only, before non-logo items had a collapsed state
  // of their own).
  function onDocumentPointerDown(event) {
    if (deviceClass !== 'touch' || touchTargetId === null) return;
    const currentEl = elementsById.get(touchTargetId);
    if (!currentEl) return;
    if (!currentEl.node.contains(event.target)) {
      clearTouchTarget();
    }
  }
  document.addEventListener('pointerdown', onDocumentPointerDown);

  // ─── Needle: continuous idle sweep, with a pointer/touch targeting layer ─

  let mode = 'idle';
  let idleAngleDeg = 0;
  const spring = createAngleSpring({
    value: 0,
    speed: UC_CONFIG.needle.pointerSpring.speed,
    friction: UC_CONFIG.needle.pointerSpring.friction,
  });

  function updateFocus(needleAngleDeg, desktop) {
    elements.forEach((el) => {
      if (!el.visible) return;
      const shouldFocus = desktop
        ? Math.abs(angularDelta(needleAngleDeg, el.effectiveAngleDeg)) <=
          UC_CONFIG.focus.thresholdDeg
        : touchTargetId === el.id;

      if (shouldFocus !== el.focused) {
        el.focused = shouldFocus;
        el.node.classList.toggle('is-focused', shouldFocus);
        // Touch only: on desktop, .is-focused is needle-angle proximity, not
        // the literal hover/focus that drives expand there (handled by the
        // mouseenter/focus listeners above instead), so it must not touch
        // aria-expanded on desktop.
        if (!desktop) {
          el.node.setAttribute('aria-expanded', String(shouldFocus));
        }
      }
    });
  }

  let rafId = null;
  let lastTime = 0;

  function frame(time) {
    const delta = lastTime ? time - lastTime : 0;
    lastTime = time;

    const desktop = deviceClass === 'desktop';
    // Desktop: fall back to idle both when the pointer has left (pointerActive
    // false) and when it's present but has stopped moving for the configured
    // idle period (audit D5) — either condition ends "active" targeting.
    const pointerStale =
      desktop && pointerActive && time - lastPointerMoveTime > UC_CONFIG.pointer.idleTimeoutMs;
    const wantsTargeting = desktop ? pointerActive && !pointerStale : touchTargetId !== null;

    if (wantsTargeting && mode === 'idle') {
      // Idle -> targeting: seed the spring from the current idle angle so the
      // needle picks up motion from exactly where it already is. No jump.
      spring.snap(idleAngleDeg);
      mode = 'targeting';
    } else if (!wantsTargeting && mode === 'targeting') {
      // Targeting -> idle: resume the sweep from wherever the needle settled.
      idleAngleDeg = normalizeAngle(spring.value);
      mode = 'idle';
    }

    let needleAngleDeg;

    if (mode === 'targeting') {
      const springConfig = desktop ? UC_CONFIG.needle.pointerSpring : UC_CONFIG.needle.touchSpring;
      spring.speed = springConfig.speed;
      spring.friction = springConfig.friction;

      const targetAngle = desktop
        ? pointerAngleDeg
        : (elementsById.get(touchTargetId)?.effectiveAngleDeg ?? idleAngleDeg);

      spring.setTarget(targetAngle);
      needleAngleDeg = spring.step();
    } else {
      const sweepPeriodMs = reducedMotion
        ? UC_CONFIG.needle.idleSweepPeriodMs / UC_CONFIG.reducedMotion.sweepSpeedScale
        : UC_CONFIG.needle.idleSweepPeriodMs;
      const degPerMs = 360 / sweepPeriodMs;
      idleAngleDeg = normalizeAngle(idleAngleDeg + degPerMs * delta);
      needleAngleDeg = idleAngleDeg;
    }

    needleGroup.setAttribute('transform', `rotate(${needleAngleDeg})`);
    updateFocus(needleAngleDeg, desktop);

    rafId = requestAnimationFrame(frame);
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (rafId === null) {
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  // ─── Resize feeds the one layout() pass ─────────────────────────────────
  // never depends on `dir` — see the note above layout().)

  const resizeObserver = new ResizeObserver(() => {
    cachedRect = root.getBoundingClientRect();
    layout();
  });
  resizeObserver.observe(root);

  if (document.fonts && document.fonts.ready) {
    // Re-run the full layout pass (not just the text-fit step) once the real
    // webfont has swapped in — font metrics affect the measurements that
    // resolvePillGeometry's fit-and-verify loop relies on.
    document.fonts.ready.then(() => layout());
  }

  // ─── Boot ────────────────────────────────────────────────────────────────

  layout();
  rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      pointerModeQuery.removeEventListener('change', handlePointerModeChange);
      unsubscribeReducedMotion();
      resizeObserver.disconnect();
      root.removeEventListener('pointerenter', onPointerEnter);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('pointermove', onPointerMove);
      elements.forEach((el) => el.node.removeEventListener('click', onElementClick));
      hoverListeners.forEach(({ el, onMouseEnter, onMouseLeave, onFocus, onBlur }) => {
        el.node.removeEventListener('mouseenter', onMouseEnter);
        el.node.removeEventListener('mouseleave', onMouseLeave);
        el.node.removeEventListener('focus', onFocus);
        el.node.removeEventListener('blur', onBlur);
      });
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      clearIdleTimer();
    },
  };
}
