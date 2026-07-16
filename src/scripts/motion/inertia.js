/**
 * Inertia — Marzoq Motion System
 *
 * Creates values with simulated physical momentum.
 * Objects gradually accelerate toward targets and gradually settle.
 * Immediate transforms are forbidden by the Compass specification.
 */

/**
 * Create an inertia tracker that smoothly follows a target.
 * Call .update() inside a requestAnimationFrame loop.
 *
 * @param {object} options
 * @param {number} options.initial     - Starting value
 * @param {number} [options.friction]  - Deceleration factor (0–1, lower = more drag)
 * @param {number} [options.speed]     - Acceleration speed multiplier
 * @returns {{ value: number, velocity: number, update: Function, setTarget: Function }}
 */
export function createInertia({ initial = 0, friction = 0.88, speed = 0.08 } = {}) {
  let value = initial;
  let target = initial;
  let velocity = 0;

  return {
    get value() {
      return value;
    },
    get velocity() {
      return velocity;
    },

    /** Update target without snapping. */
    setTarget(newTarget) {
      target = newTarget;
    },

    /**
     * Advance one frame. Call inside requestAnimationFrame.
     * @returns {boolean} true if still moving (useful for stopping rAF when settled)
     */
    update() {
      velocity += (target - value) * speed;
      velocity *= friction;
      value += velocity;

      return Math.abs(velocity) > 0.001 || Math.abs(target - value) > 0.001;
    },

    /** Snap immediately to a value (used for reduced-motion mode). */
    snap(newValue) {
      value = newValue;
      target = newValue;
      velocity = 0;
    },
    get speed() {
      return speed;
    },
    set speed(newSpeed) {
      speed = newSpeed;
    },
    get friction() {
      return friction;
    },
    set friction(newFriction) {
      friction = newFriction;
    },
  };
}

/**
 * Create an angle inertia tracker that always follows the shortest angular path.
 * Prevents spinning the long way around.
 *
 * @param {object} options
 * @param {number} options.initial    - Starting angle in radians
 * @param {number} [options.friction] - Deceleration factor
 * @param {number} [options.speed]    - Acceleration speed
 */
export function createAngleInertia({ initial = 0, friction = 0.88, speed = 0.07 } = {}) {
  let value = initial;
  let target = initial;
  let velocity = 0;

  function shortestDiff(from, to) {
    let diff = to - from;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
  }

  return {
    get value() {
      return value;
    },
    get velocity() {
      return velocity;
    },

    setTarget(newTarget) {
      target = newTarget;
    },

    update() {
      const diff = shortestDiff(value, target);
      velocity += diff * speed;
      velocity *= friction;
      value += velocity;

      return Math.abs(velocity) > 0.0001 || Math.abs(diff) > 0.0001;
    },

    snap(newValue) {
      value = newValue;
      target = newValue;
      velocity = 0;
    },
    get speed() {
      return speed;
    },
    set speed(newSpeed) {
      speed = newSpeed;
    },
    get friction() {
      return friction;
    },
    set friction(newFriction) {
      friction = newFriction;
    },
  };
}
