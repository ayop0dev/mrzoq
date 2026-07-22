/**
 * Compass Interaction — Marzoq
 *
 * Manages all Compass motion: needle rotation (pointer tracking), parallax tilt,
 * signal stretch, and Ecosystem alignment detection.
 *
 * This module is imported and initialized in the homepage and anywhere
 * the Compass appears.
 *
 * Specification: compass.component.canon.md
 */

import {
  createAngleInertia,
  createInertia,
  createAnimationLoop,
  prefersReducedMotion,
  onReducedMotionChange,
  clamp,
  mapRange,
} from './motion/index.js';

/**
 * Initialize the Compass interaction system.
 *
 * @param {object} options
 * @param {HTMLElement} options.compassEl      - The .compass root element
 * @param {SVGElement}  options.svgEl          - The .compass__svg element
 * @param {SVGGElement} options.needleEl       - The .compass__needle group
 * @param {SVGLineElement} options.signalLine  - The .compass__signal-line element
 * @param {SVGCircleElement} options.signalTip - The .compass__signal-tip element
 * @param {SVGCircleElement} options.signalRing - The .compass__signal-ring element
 * @param {Function}    options.getPointer     - Returns current pointer state {isActive, angle, x, y}
 * @param {Function}    [options.onDirection]  - Called with current angle (radians) each frame
 * @returns {{ destroy: Function, angle: number }}
 */
export function initCompass({
  svgEl,
  needleEl,
  signalLine,
  signalTip,
  signalRing,
  getPointer,
  getAmbientAngle,
  onDirection,
}) {
  let reduced = prefersReducedMotion();

  const FAST_SPEED = 0.25;
  const AMBIENT_SPEED = 0.01;

  // ── Angle inertia for smooth needle rotation ──
  const needleAngle = createAngleInertia({
    initial: (-90 * Math.PI) / 180, // Start pointing up (North)
    friction: 0.82,
    speed: FAST_SPEED,
  });

  // ── Parallax tilt (X, Y, rotateX, rotateY) ──
  const tiltX = createInertia({ initial: 0, friction: 0.85, speed: 0.15 });
  const tiltY = createInertia({ initial: 0, friction: 0.85, speed: 0.15 });

  // ── Signal stretch ──
  const signalStretch = createInertia({ initial: 0, friction: 0.82, speed: 0.2 });

  // ── Signal geometry constants ──
  const SIGNAL_BASE_Y = -88; // top of needle tip
  const SIGNAL_REST_EXTEND = 22; // px beyond tip at rest
  const SIGNAL_MAX_EXTEND = 35; // maximum stretch

  // ── Animation loop ──
  const loop = createAnimationLoop(() => {
    const p = getPointer ? getPointer() : { isActive: false, angle: 0, x: 0, y: 0 };
    const isMobile = window.innerWidth < 768;

    if (reduced) {
      // Reduced-motion: snap needle to pointer direction instantly, no inertia/tilt/signal
      if (p.isActive) {
        needleAngle.snap(p.angle);
      }
      drawNeedleOnly();
      return;
    }

    if (p.isActive) {
      needleAngle.speed = FAST_SPEED;
      needleAngle.friction = 0.82;
      needleAngle.setTarget(p.angle);

      // Parallax tilt active
      tiltX.setTarget(p.x * 12);
      tiltY.setTarget(p.y * 8);

      // Signal stretch active
      const pointerDist = Math.hypot(p.x, p.y);
      const stretchTarget = mapRange(pointerDist, 0, 0.5, 0, SIGNAL_MAX_EXTEND - SIGNAL_REST_EXTEND);
      signalStretch.setTarget(clamp(stretchTarget, 0, SIGNAL_MAX_EXTEND - SIGNAL_REST_EXTEND));
    } else {
      if (isMobile) {
        // Mobile guidance mode: ease toward a real Platform Token, then hold there.
        const ambient = getAmbientAngle ? getAmbientAngle() : null;
        if (ambient !== null) {
          needleAngle.speed = 0.018;
          needleAngle.friction = 0.86;
          needleAngle.setTarget(ambient);
        }
      } else {
        // Desktop Smooth Mode
        const ambient = getAmbientAngle ? getAmbientAngle() : null;
        if (ambient !== null) {
          needleAngle.speed = AMBIENT_SPEED;
          needleAngle.friction = 0.82;
          needleAngle.setTarget(ambient);
        }
      }

      // Reset tilt and stretch
      tiltX.setTarget(0);
      tiltY.setTarget(0);
      signalStretch.setTarget(0);
    }

    needleAngle.update();
    tiltX.update();
    tiltY.update();
    signalStretch.update();

    drawFull();

    if (onDirection) {
      onDirection(needleAngle.value);
    }
  });

  function drawNeedleOnly() {
    // SVG needle authors pointing UP at rotate(0). Pointer uses atan2 (right=0, up=-π/2).
    // Display offset: +90° maps pointer.right(0°) → needle rotates 90° (points right). ✓
    const deg = (needleAngle.value * 180) / Math.PI;
    needleEl.setAttribute('transform', `rotate(${deg + 90})`);
  }

  function drawFull() {
    const deg = (needleAngle.value * 180) / Math.PI;

    // Rotate needle with +90° coordinate system offset
    needleEl.setAttribute('transform', `rotate(${deg + 90})`);

    // Parallax tilt on the SVG element
    svgEl.style.transform = `perspective(600px) rotateX(${-tiltY.value}deg) rotateY(${tiltX.value}deg)`;

    // Signal stretch
    const extend = SIGNAL_REST_EXTEND + signalStretch.value;
    const tipY = SIGNAL_BASE_Y - extend;

    signalLine.setAttribute('y2', String(tipY));
    signalTip.setAttribute('cy', String(tipY));
    signalRing.setAttribute('cy', String(tipY));
  }

  // ── Reduced motion listener ──
  const unsubscribeMotion = onReducedMotionChange((isReduced) => {
    reduced = isReduced;
    if (isReduced) {
      // Snap everything to neutral
      needleAngle.snap((-90 * Math.PI) / 180);
      tiltX.snap(0);
      tiltY.snap(0);
      signalStretch.snap(0);
      svgEl.style.transform = '';
    }
  });

  loop.start();

  return {
    destroy() {
      loop.stop();
      unsubscribeMotion();
    },

    /** Expose current needle angle for Ecosystem alignment. */
    get angle() {
      return needleAngle.value;
    },
  };
}
