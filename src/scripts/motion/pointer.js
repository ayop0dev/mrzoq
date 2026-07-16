/**
 * Pointer Interaction — Marzoq Motion System
 *
 * Translates pointer (mouse/touch) events into normalized coordinates
 * and angular directions for the Compass.
 *
 * Architecture requirement:
 * "The Compass interprets attention. Not position."
 * "The pointer never drags the Compass. The Compass decides how to respond."
 */

/**
 * Measure the effective tracking area for an element.
 *
 * The Homepage uses only fixed/absolute layers, so document.documentElement
 * reports a getBoundingClientRect() height of zero — dividing by it produces
 * Infinity. When the tracked element is the viewport root, use window
 * dimensions (which are always correct) instead of the content bounding-box.
 *
 * @param {Element} element
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function measureTrackingArea(element) {
  const isViewport = element === document.documentElement || element === document.body;

  if (isViewport) {
    return {
      left: 0,
      top: 0,
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight,
    };
  }

  const r = element.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * Normalize a single pointer-axis coordinate to the −0.5 → 0.5 range.
 *
 * Returns null when the area dimension is zero or non-finite so the caller
 * can discard the event safely instead of storing Infinity or NaN.
 *
 * @param {number} clientPos  - Raw clientX or clientY from the event
 * @param {number} areaStart  - left or top of the tracking area
 * @param {number} areaSize   - width or height of the tracking area
 * @returns {number | null}
 */
export function normalizePointerCoord(clientPos, areaStart, areaSize) {
  if (!(areaSize > 0) || !isFinite(areaSize)) return null;
  const n = (clientPos - areaStart) / areaSize - 0.5;
  if (!isFinite(n)) return null;
  return Math.max(-0.5, Math.min(0.5, n));
}

/**
 * Create a pointer tracker that provides normalized coordinates.
 * Attach it to the viewport element.
 *
 * @param {HTMLElement} element - The element to track pointer over
 * @returns {{ x: number, y: number, angle: number, isActive: boolean, destroy: Function }}
 */
export function createPointerTracker(element) {
  let x = 0;
  let y = 0;
  let isActive = false;

  // Use measureTrackingArea so the viewport branch uses window.inner* instead
  // of the zero-height document-element bounding-box.
  let area = measureTrackingArea(element);

  function onMove(event) {
    // Never read touches[0] when the list is empty (e.g. stale touchmove after lift).
    const touch = event.touches && event.touches.length > 0 ? event.touches[0] : null;
    const clientX = touch ? touch.clientX : event.clientX;
    const clientY = touch ? touch.clientY : event.clientY;

    // Re-measure if the cached area looks degenerate (first event after resize race).
    if (!(area.width > 0) || !(area.height > 0)) {
      area = measureTrackingArea(element);
    }

    const nx = normalizePointerCoord(clientX, area.left, area.width);
    const ny = normalizePointerCoord(clientY, area.top, area.height);

    // Reject non-finite values — never let NaN or Infinity enter shared state.
    if (nx === null || ny === null) return;

    x = nx;
    y = ny;
    isActive = true;
  }

  function onLeave() {
    isActive = false;
  }

  function onResize() {
    // measureTrackingArea returns window dimensions for viewport root — always valid.
    area = measureTrackingArea(element);
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseleave', onLeave, { passive: true });
  window.addEventListener('touchend', onLeave, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  return {
    /** Normalized x position (−0.5 to 0.5 from element center). */
    get x() {
      return x;
    },
    /** Normalized y position (−0.5 to 0.5 from element center). */
    get y() {
      return y;
    },
    /** Angle from center to pointer in radians. */
    get angle() {
      return Math.atan2(y, x);
    },
    /** Whether the pointer is currently over the element. */
    get isActive() {
      return isActive;
    },

    destroy() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('touchend', onLeave);
      window.removeEventListener('resize', onResize);
    },
  };
}

/**
 * Create a RAF-based animation loop.
 * Returns a controller with start/stop methods.
 *
 * @param {(time: number, delta: number) => void} callback
 * @returns {{ start: Function, stop: Function, isRunning: boolean }}
 */
export function createAnimationLoop(callback) {
  let rafId = null;
  let lastTime = 0;

  function tick(time) {
    const delta = lastTime > 0 ? time - lastTime : 0;
    lastTime = time;
    callback(time, delta);
    rafId = requestAnimationFrame(tick);
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        lastTime = 0;
      }
    } else {
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  return {
    get isRunning() {
      return rafId !== null;
    },

    start() {
      if (rafId !== null) return;
      lastTime = 0;
      rafId = requestAnimationFrame(tick);
      document.addEventListener('visibilitychange', onVisibilityChange);
    },

    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
