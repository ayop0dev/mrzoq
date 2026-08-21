/**
 * Unified Compass — angle spring.
 *
 * A small, self-contained spring for angular values, used only by this
 * component's needle. Written fresh rather than imported from the legacy
 * motion system, so this component has no runtime coupling to it.
 */
export function createAngleSpring({ value = 0, speed = 0.12, friction = 0.82 } = {}) {
  let current = value;
  let target = value;
  let velocity = 0;

  return {
    get value() {
      return current;
    },
    setTarget(next) {
      target = next;
    },
    /** Jump immediately to a value with no residual velocity (used on mode handoff). */
    snap(next) {
      current = next;
      target = next;
      velocity = 0;
    },
    set speed(next) {
      speed = next;
    },
    get speed() {
      return speed;
    },
    set friction(next) {
      friction = next;
    },
    get friction() {
      return friction;
    },
    /** Advance one frame using the shortest angular path; returns the new value. */
    step() {
      let diff = (target - current) % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      velocity += diff * speed;
      velocity *= friction;
      current += velocity;
      return current;
    },
  };
}
