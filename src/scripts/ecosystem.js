/**
 * Ecosystem Interaction — Marzoq
 *
 * Drives orbital drift, environmental parallax, and focus detection for
 * all Ecosystem objects. Receives Compass direction to determine focus.
 *
 * Specification: ecosystem.specification.md
 */

import {
  createOrbital,
  parallaxOffset,
  isAligned,
  createAnimationLoop,
  prefersReducedMotion,
  onReducedMotionChange,
} from './motion/index.js';

/**
 * Initialize the Ecosystem animation system.
 *
 * @param {object} options
 * @param {HTMLElement} options.containerEl  - The .ecosystem__objects element
 * @param {Function}    [options.getAngle]   - Returns current Compass needle angle (radians)
 * @param {{ x: number, y: number }} [options.getPointer] - Returns normalized pointer coords
 * @returns {{ destroy: Function }}
 */
export function initEcosystem({ containerEl, getAngle, getPointer }) {
  let reduced = prefersReducedMotion();

  const getScaleFactor = (w) => {
    if (w < 768) return 0.55;
    if (w < 1200) return 0.8;
    return Math.min(1, Math.max(0.35, w / 1600));
  };

  let centerX = window.innerWidth / 2;
  let centerY = window.innerHeight / 2;
  let scaleFactor = getScaleFactor(window.innerWidth);

  // ── Build orbital descriptors from DOM data attributes ──
  const objectEls = Array.from(containerEl.querySelectorAll('[data-orbit-radius]'));

  const orbitals = objectEls.map((el) => {
    const radius = parseFloat(el.dataset.orbitRadius);
    const phase = parseFloat(el.dataset.orbitPhase);
    const speed = parseFloat(el.dataset.orbitSpeed);
    const depth = parseFloat(el.dataset.orbitDepth);

    return {
      el,
      orbital: createOrbital({ radius, phase, speed, depth }),
      depth,
      isFocused: false,
    };
  });

  let ambientIndex = 0;
  let lastAmbientSwitch = 0;
  let currentAmbientAngle = -Math.PI / 2;

  // ── Animation loop ──
  const loop = createAnimationLoop((time) => {
    const pointer = getPointer ? getPointer() : { x: 0, y: 0 };
    const needleAngle = getAngle ? getAngle() : null;

    if (orbitals.length > 0) {
      if (time - lastAmbientSwitch > 4000) {
        ambientIndex = (ambientIndex + 1) % orbitals.length;
        lastAmbientSwitch = time;
      }
      currentAmbientAngle = orbitals[ambientIndex].orbital.angle(time);
    }

    orbitals.forEach(({ el, orbital, depth }) => {
      if (reduced) {
        // Static position via CSS custom properties — no drift, no parallax
        el.style.setProperty('--orbit-x', `${centerX + orbital.x(0)}px`);
        el.style.setProperty('--orbit-y', `${centerY + orbital.y(0)}px`);
        return;
      }

      // Orbital position (scaled responsively)
      const ox = orbital.x(time) * scaleFactor;
      const oy = orbital.y(time) * scaleFactor;

      // Parallax offset
      const { dx, dy } = parallaxOffset(pointer.x, pointer.y, depth, 20);

      // Use CSS custom properties → transform: translate() path (no layout, compositor-friendly)
      el.style.setProperty('--orbit-x', `${centerX + ox + dx}px`);
      el.style.setProperty('--orbit-y', `${centerY + oy + dy}px`);

      // Focus detection via Compass alignment
      if (needleAngle !== null) {
        const objectAngle = orbital.angle(time);
        const focused = isAligned(needleAngle, objectAngle, 0.22);

        if (focused && !el.classList.contains('is-focused')) {
          el.classList.add('is-focused');
        } else if (!focused && el.classList.contains('is-focused')) {
          el.classList.remove('is-focused');
        }
      }
    });
  });

  function onResize() {
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
    scaleFactor = getScaleFactor(window.innerWidth);
  }
  window.addEventListener('resize', onResize, { passive: true });

  // ── Reduced motion ──
  const unsubMotion = onReducedMotionChange((isReduced) => {
    reduced = isReduced;
    if (isReduced) {
      orbitals.forEach(({ el, orbital }) => {
        el.classList.remove('is-focused');
        el.style.setProperty('--orbit-x', `${centerX + orbital.x(0)}px`);
        el.style.setProperty('--orbit-y', `${centerY + orbital.y(0)}px`);
      });
    }
  });

  loop.start();

  return {
    destroy() {
      loop.stop();
      unsubMotion();
      window.removeEventListener('resize', onResize);
    },
    get ambientAngle() {
      return currentAmbientAngle;
    }
  };
}
