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
  let platformOrbitScale = window.innerWidth < 768 ? 0.8 : 1;
  const getPlatformOrbitOffsetY = () =>
    window.innerWidth < 768 && window.innerHeight <= 700 ? 64 : 0;
  let platformOrbitOffsetY = getPlatformOrbitOffsetY();

  // ── Build orbital descriptors from DOM data attributes ──
  const objectEls = Array.from(containerEl.querySelectorAll('[data-orbit-radius]'));

  const orbitals = objectEls.map((el) => {
    const radius = parseFloat(el.dataset.orbitRadius);
    const phase = parseFloat(el.dataset.orbitPhase);
    const speed = parseFloat(el.dataset.orbitSpeed);
    const depth = parseFloat(el.dataset.orbitDepth);
    const mobileRadius = parseFloat(el.dataset.mobileOrbitRadius);
    const mobilePhase = parseFloat(el.dataset.mobileOrbitPhase);

    return {
      el,
      orbital: createOrbital({ radius, phase, speed, depth }),
      mobileOrbital: createOrbital({
        radius: Number.isFinite(mobileRadius) ? mobileRadius : radius,
        phase: Number.isFinite(mobilePhase) ? mobilePhase : phase,
        speed,
        depth,
      }),
      depth,
      isPlatform: el.dataset.orbitKind === 'platform',
      isFocused: false,
    };
  });
  const platformOrbitals = orbitals.filter(({ isPlatform }) => isPlatform);

  let ambientIndex = 0;
  let lastAmbientSwitch = 0;
  let currentAmbientAngle = -Math.PI / 2;
  const mobileGuidanceOrder = [0, 7, 3, 10, 5, 1, 8, 4, 11, 6, 2, 9];
  let mobileGuidanceIndex = 0;

  // ── Animation loop ──
  const loop = createAnimationLoop((time) => {
    const pointer = getPointer ? getPointer() : { x: 0, y: 0 };
    const needleAngle = getAngle ? getAngle() : null;

    const isMobile = window.innerWidth < 768;
    if (isMobile && platformOrbitals.length > 0) {
      if (time - lastAmbientSwitch > 6000) {
        mobileGuidanceIndex = (mobileGuidanceIndex + 1) % mobileGuidanceOrder.length;
        lastAmbientSwitch = time;
      }

      const targetIndex = mobileGuidanceOrder[mobileGuidanceIndex] % platformOrbitals.length;
      const target = platformOrbitals[targetIndex].mobileOrbital;
      const targetX = target.x(time) * scaleFactor * platformOrbitScale;
      const targetY = target.y(time) * scaleFactor * platformOrbitScale + platformOrbitOffsetY;
      currentAmbientAngle = Math.atan2(targetY, targetX);
    } else if (orbitals.length > 0) {
      if (time - lastAmbientSwitch > 4000) {
        ambientIndex = (ambientIndex + 1) % orbitals.length;
        lastAmbientSwitch = time;
      }
      currentAmbientAngle = orbitals[ambientIndex].orbital.angle(time);
    }

    orbitals.forEach(({ el, orbital, mobileOrbital, depth, isPlatform }) => {
      const activeOrbital = isMobile && isPlatform ? mobileOrbital : orbital;
      const platformScale = isPlatform ? platformOrbitScale : 1;
      const platformOffsetY = isPlatform ? platformOrbitOffsetY : 0;

      if (reduced) {
        // Static position via CSS custom properties — no drift, no parallax
        const responsiveScale = isMobile && isPlatform ? scaleFactor : 1;
        el.style.setProperty(
          '--orbit-x',
          `${centerX + activeOrbital.x(0) * platformScale * responsiveScale}px`,
        );
        el.style.setProperty(
          '--orbit-y',
          `${centerY + activeOrbital.y(0) * platformScale * responsiveScale + platformOffsetY}px`,
        );
        return;
      }

      // Orbital position (scaled responsively)
      const ox = activeOrbital.x(time) * scaleFactor * platformScale;
      const oy = activeOrbital.y(time) * scaleFactor * platformScale;

      // Parallax offset
      const { dx, dy } = parallaxOffset(pointer.x, pointer.y, depth, 20);

      // Use CSS custom properties → transform: translate() path (no layout, compositor-friendly)
      el.style.setProperty('--orbit-x', `${centerX + ox + dx}px`);
      el.style.setProperty('--orbit-y', `${centerY + oy + dy + platformOffsetY}px`);

      // Focus detection via Compass alignment
      if (needleAngle !== null) {
        const objectAngle =
          isMobile && isPlatform
            ? Math.atan2(oy + platformOrbitOffsetY, ox)
            : activeOrbital.angle(time);
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
    platformOrbitScale = window.innerWidth < 768 ? 0.8 : 1;
    platformOrbitOffsetY = getPlatformOrbitOffsetY();
  }
  window.addEventListener('resize', onResize, { passive: true });

  // ── Reduced motion ──
  const unsubMotion = onReducedMotionChange((isReduced) => {
    reduced = isReduced;
    if (isReduced) {
      orbitals.forEach(({ el, orbital, mobileOrbital, isPlatform }) => {
        const isMobile = window.innerWidth < 768;
        const activeOrbital = isMobile && isPlatform ? mobileOrbital : orbital;
        const platformScale = isPlatform ? platformOrbitScale : 1;
        const platformOffsetY = isPlatform ? platformOrbitOffsetY : 0;
        const responsiveScale = isMobile && isPlatform ? scaleFactor : 1;
        el.classList.remove('is-focused');
        el.style.setProperty(
          '--orbit-x',
          `${centerX + activeOrbital.x(0) * platformScale * responsiveScale}px`,
        );
        el.style.setProperty(
          '--orbit-y',
          `${centerY + activeOrbital.y(0) * platformScale * responsiveScale + platformOffsetY}px`,
        );
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
