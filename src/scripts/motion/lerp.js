/**
 * Lerp utilities — Marzoq Motion System
 *
 * Linear interpolation and angle interpolation with shortest-path routing.
 * These are the fundamental building blocks of all smooth motion.
 */

/**
 * Linear interpolation between two values.
 * @param {number} from  - Current value
 * @param {number} to    - Target value
 * @param {number} alpha - Interpolation factor (0–1, lower = slower)
 * @returns {number}
 */
export function lerp(from, to, alpha) {
  return from + (to - from) * alpha;
}

/**
 * Interpolate between two angles following the shortest angular path.
 * Prevents the needle from spinning the long way around (e.g. 10° → 350° = 20°, not 340°).
 *
 * @param {number} from  - Current angle in radians
 * @param {number} to    - Target angle in radians
 * @param {number} alpha - Interpolation factor
 * @returns {number}     - Interpolated angle in radians
 */
export function lerpAngle(from, to, alpha) {
  let diff = to - from;

  // Normalize to [-π, π] for shortest path
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;

  return from + diff * alpha;
}

/**
 * Degrees to radians.
 * @param {number} deg
 * @returns {number}
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Radians to degrees.
 * @param {number} rad
 * @returns {number}
 */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Map a value from one range to another.
 * @param {number} value
 * @param {number} fromMin
 * @param {number} fromMax
 * @param {number} toMin
 * @param {number} toMax
 * @returns {number}
 */
export function mapRange(value, fromMin, fromMax, toMin, toMax) {
  const ratio = (value - fromMin) / (fromMax - fromMin);
  return toMin + ratio * (toMax - toMin);
}
