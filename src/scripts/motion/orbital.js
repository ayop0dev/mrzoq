/**
 * Orbital Motion — Marzoq Motion System
 *
 * Deterministic orbital drift for Ecosystem objects.
 * Every object follows its own invisible orbital path.
 * Given the same starting state, the motion is always the same.
 *
 * Architecture requirement:
 * "The Ecosystem is not a particle system. It is a structured orbital system."
 */

/**
 * Create an orbital position calculator for one Ecosystem object.
 *
 * @param {object} options
 * @param {number} options.radius      - Orbital radius in pixels
 * @param {number} options.phase       - Starting phase offset in radians (0–2π)
 * @param {number} options.speed       - Orbital speed multiplier (1 = base speed)
 * @param {number} [options.depth]     - Depth layer (0–1, affects parallax response)
 * @returns {{ x: Function, y: Function, angle: Function }}
 */
export function createOrbital({ radius, phase, speed, depth = 0.5 }) {
  const BASE_PERIOD = 80000; // ms — one full orbit at speed=1 takes ~80 seconds

  return {
    /**
     * Calculate x position at given time.
     * @param {number} time - Current time in ms (e.g. performance.now())
     * @returns {number} x offset from center
     */
    x(time) {
      const angle = phase + (time / BASE_PERIOD) * speed * 2 * Math.PI;
      return Math.cos(angle) * radius;
    },

    /**
     * Calculate y position at given time.
     * @param {number} time
     * @returns {number} y offset from center
     */
    y(time) {
      const angle = phase + (time / BASE_PERIOD) * speed * 2 * Math.PI;
      return Math.sin(angle) * radius;
    },

    /**
     * Current angular position (used for focus detection by the Ecosystem).
     * @param {number} time
     * @returns {number} angle in radians
     */
    angle(time) {
      return phase + (time / BASE_PERIOD) * speed * 2 * Math.PI;
    },

    /** Depth value for parallax calculation. */
    depth,
  };
}

/**
 * Apply parallax offset to an object's position based on pointer position.
 *
 * @param {object} orbital       - An orbital instance or any {x, y} provider
 * @param {number} pointerX      - Pointer x in normalized coords (-0.5 to 0.5)
 * @param {number} pointerY      - Pointer y in normalized coords (-0.5 to 0.5)
 * @param {number} depth         - Object depth (0 = far, 1 = near)
 * @param {number} [strength]    - Maximum parallax displacement in pixels
 * @returns {{ dx: number, dy: number }}
 */
export function parallaxOffset(pointerX, pointerY, depth, strength = 24) {
  const factor = depth * strength;
  return {
    dx: pointerX * factor,
    dy: pointerY * factor,
  };
}

/**
 * Determine whether a Compass needle angle is pointing at an object's angle.
 *
 * @param {number} needleAngle  - Current needle angle in radians
 * @param {number} objectAngle  - Object's angular position in radians
 * @param {number} [threshold]  - Focus threshold in radians (default ~15°)
 * @returns {boolean}
 */
export function isAligned(needleAngle, objectAngle, threshold = 0.26) {
  let diff = Math.abs(needleAngle - objectAngle);
  // Normalize to [0, π]
  while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
  return diff < threshold;
}
