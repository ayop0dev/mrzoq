/**
 * Motion System — Marzoq
 *
 * Barrel export for all motion utilities.
 * Import from this module in all components that use motion.
 *
 * Usage:
 *   import { lerp, createAngleInertia, createOrbital } from '@scripts/motion';
 */

export { lerp, lerpAngle, degToRad, radToDeg, clamp, mapRange } from './lerp.js';
export { createInertia, createAngleInertia } from './inertia.js';
export { createOrbital, parallaxOffset, isAligned } from './orbital.js';
export { createPointerTracker, createAnimationLoop } from './pointer.js';
export { prefersReducedMotion, onReducedMotionChange, motionValue } from './reduced-motion.js';
