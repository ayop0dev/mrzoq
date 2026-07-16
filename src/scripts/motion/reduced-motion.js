/**
 * Reduced Motion Support — Marzoq Motion System
 *
 * Architecture requirement:
 * "Respect prefers-reduced-motion. When enabled, disable non-essential animation
 *  — reduce movement only, never remove functionality."
 *
 * When reduced motion is active:
 * - Compass: breathing disabled, parallax disabled, signal stretching disabled
 * - Ecosystem: orbital drift disabled, parallax disabled
 * - Needle rotation: remains functional
 * - Navigation: remains functional
 * - Focus indication: preserved
 */

/**
 * Read the user's current reduced-motion preference.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Subscribe to changes in the reduced-motion preference.
 * Calls the handler immediately with the current value.
 *
 * @param {(reduced: boolean) => void} handler
 * @returns {() => void} unsubscribe function
 */
export function onReducedMotionChange(handler) {
  if (typeof window === 'undefined') return () => {};

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = (event) => handler(event.matches);

  handler(mq.matches);
  mq.addEventListener('change', listener);

  return () => mq.removeEventListener('change', listener);
}

/**
 * A motion guard that returns safe values depending on preference.
 * Use this wherever optional animations are applied.
 *
 * @template T
 * @param {T} animated  - Value to use when motion is OK
 * @param {T} static_   - Value to use when motion should be reduced
 * @returns {T}
 */
export function motionValue(animated, static_) {
  return prefersReducedMotion() ? static_ : animated;
}
