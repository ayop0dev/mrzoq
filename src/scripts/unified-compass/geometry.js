/**
 * Unified Compass — geometry helpers.
 *
 * Fresh, local, single-purpose math. Every floating element, ring, and the
 * needle itself resolve their position through these same functions and the
 * same center — there is no second coordinate system anywhere in this component.
 *
 * Convention: 0deg = 12 o'clock (top), increasing clockwise. This matches the
 * spec's own "clock position" and "diver's watch" language (spec 2.3, 3.1).
 */

export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/** Normalize any angle in degrees to the [0, 360) range. */
export function normalizeAngle(deg) {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

/** Clock-position angle + radius -> pixel offset from the shared center. */
export function clockPositionToOffset(angleDeg, radiusPx) {
  const rad = degToRad(angleDeg);
  return {
    x: Math.sin(rad) * radiusPx,
    y: -Math.cos(rad) * radiusPx,
  };
}

/** Inverse of clockPositionToOffset: a screen-space offset from center -> clock angle. */
export function offsetToClockAngle(dx, dy) {
  return normalizeAngle(radToDeg(Math.atan2(dx, -dy)));
}

/** Shortest signed angular distance from a to b, in degrees, range (-180, 180]. */
export function angularDelta(a, b) {
  let diff = (b - a) % 360;
  if (diff > 180) diff -= 360;
  if (diff <= -180) diff += 360;
  return diff;
}
