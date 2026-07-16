/**
 * Pointer tracker regression tests — Marzoq
 *
 * Covers the exact failure path that caused Ecosystem objects to collapse
 * to (0,0) on the Homepage: document.documentElement.getBoundingClientRect()
 * returning height=0 on pages with only fixed/absolute positioning.
 *
 * Run: node --test tests/pointer.test.mjs
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

// ─── Minimal browser-API stubs ────────────────────────────────────────────────
// pointer.js uses document/window inside function bodies, not at module load
// time, so setting globals here (before any test call) is sufficient.

function makeEventTarget() {
  const map = new Map();
  return {
    addEventListener(type, fn) {
      if (!map.has(type)) map.set(type, []);
      map.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      if (!map.has(type)) return;
      map.set(type, map.get(type).filter((f) => f !== fn));
    },
    _dispatch(type, evt) {
      for (const fn of map.get(type) ?? []) fn(evt);
    },
    _count(type) {
      return (map.get(type) ?? []).length;
    },
  };
}

const mockWin = makeEventTarget();
mockWin.innerWidth = 1440;
mockWin.innerHeight = 900;

const mockDocEl = {
  ...makeEventTarget(),
  // Simulates the zero-height bounding box on the Homepage.
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 0, height: 0 };
  },
};

const mockBody = {
  ...makeEventTarget(),
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 800, height: 600 };
  },
};

globalThis.window = mockWin;
globalThis.document = {
  documentElement: mockDocEl,
  body: mockBody,
};

// Import after globals are set (pure function bodies, safe in Node.js).
import { normalizePointerCoord, measureTrackingArea, createPointerTracker } from
  '../src/scripts/motion/pointer.js';

// ─── normalizePointerCoord ────────────────────────────────────────────────────

describe('normalizePointerCoord', () => {
  test('zero areaSize returns null — no division by zero', () => {
    assert.equal(normalizePointerCoord(300, 0, 0), null);
  });

  test('negative areaSize returns null', () => {
    assert.equal(normalizePointerCoord(300, 0, -100), null);
  });

  test('Infinity areaSize returns null', () => {
    assert.equal(normalizePointerCoord(300, 0, Infinity), null);
  });

  test('NaN areaSize returns null', () => {
    assert.equal(normalizePointerCoord(300, 0, NaN), null);
  });

  test('center of area produces 0', () => {
    const v = normalizePointerCoord(720, 0, 1440);
    assert.equal(v, 0);
    assert.ok(isFinite(v));
  });

  test('left edge produces −0.5', () => {
    const v = normalizePointerCoord(0, 0, 1440);
    assert.equal(v, -0.5);
    assert.ok(isFinite(v));
  });

  test('right edge produces +0.5', () => {
    const v = normalizePointerCoord(1440, 0, 1440);
    assert.equal(v, 0.5);
    assert.ok(isFinite(v));
  });

  test('out-of-bounds pointer is clamped to [−0.5, 0.5]', () => {
    const over = normalizePointerCoord(9999, 0, 1440);
    assert.equal(over, 0.5);
    const under = normalizePointerCoord(-9999, 0, 1440);
    assert.equal(under, -0.5);
  });

  test('finite Infinity clientPos returns null (not Infinity)', () => {
    const v = normalizePointerCoord(Infinity, 0, 1440);
    assert.equal(v, null);
  });
});

// ─── measureTrackingArea ─────────────────────────────────────────────────────

describe('measureTrackingArea', () => {
  test('viewport root (documentElement) uses window dimensions — not zero BoundingRect', () => {
    const area = measureTrackingArea(document.documentElement);
    assert.equal(area.left, 0);
    assert.equal(area.top, 0);
    assert.equal(area.width, 1440);   // window.innerWidth
    assert.equal(area.height, 900);   // window.innerHeight
    assert.ok(area.width > 0);
    assert.ok(area.height > 0);
  });

  test('document.body (viewport root) also uses window dimensions', () => {
    const area = measureTrackingArea(document.body);
    assert.equal(area.width, 1440);
    assert.equal(area.height, 900);
  });

  test('non-viewport element uses getBoundingClientRect()', () => {
    const el = {
      getBoundingClientRect() {
        return { left: 50, top: 20, width: 400, height: 300 };
      },
    };
    const area = measureTrackingArea(el);
    assert.equal(area.left, 50);
    assert.equal(area.top, 20);
    assert.equal(area.width, 400);
    assert.equal(area.height, 300);
  });
});

// ─── createPointerTracker — the original regression ──────────────────────────

describe('createPointerTracker (viewport root with zero getBoundingClientRect)', () => {
  let tracker;

  before(() => {
    // document.documentElement.getBoundingClientRect() returns height=0.
    // Before the fix, this caused y=Infinity on first movement.
    tracker = createPointerTracker(document.documentElement);
  });

  after(() => tracker.destroy());

  test('initial state: x and y are finite (0)', () => {
    assert.equal(tracker.x, 0);
    assert.equal(tracker.y, 0);
    assert.ok(isFinite(tracker.x));
    assert.ok(isFinite(tracker.y));
  });

  test('first mousemove to center: x=0, y=0, isActive=true, no Infinity', () => {
    mockDocEl._dispatch('mousemove', { clientX: 720, clientY: 450 });
    assert.ok(isFinite(tracker.x), `x must be finite, got ${tracker.x}`);
    assert.ok(isFinite(tracker.y), `y must be finite, got ${tracker.y}`);
    assert.equal(tracker.isActive, true);
    assert.ok(tracker.x >= -0.5 && tracker.x <= 0.5);
    assert.ok(tracker.y >= -0.5 && tracker.y <= 0.5);
  });

  test('angle is finite after mousemove', () => {
    assert.ok(isFinite(tracker.angle), `angle must be finite, got ${tracker.angle}`);
  });

  test('movement to top-left corner: both axes clamped to −0.5', () => {
    mockDocEl._dispatch('mousemove', { clientX: 0, clientY: 0 });
    assert.equal(tracker.x, -0.5);
    assert.equal(tracker.y, -0.5);
    assert.ok(isFinite(tracker.angle));
  });

  test('movement to top-right corner', () => {
    mockDocEl._dispatch('mousemove', { clientX: 1440, clientY: 0 });
    assert.equal(tracker.x, 0.5);
    assert.equal(tracker.y, -0.5);
  });

  test('movement to bottom-right corner', () => {
    mockDocEl._dispatch('mousemove', { clientX: 1440, clientY: 900 });
    assert.equal(tracker.x, 0.5);
    assert.equal(tracker.y, 0.5);
  });

  test('movement to bottom-left corner', () => {
    mockDocEl._dispatch('mousemove', { clientX: 0, clientY: 900 });
    assert.equal(tracker.x, -0.5);
    assert.equal(tracker.y, 0.5);
  });

  test('mouseleave sets isActive=false', () => {
    mockDocEl._dispatch('mouseleave', {});
    assert.equal(tracker.isActive, false);
  });

  test('touch movement: reads touches[0]', () => {
    mockDocEl._dispatch('touchmove', {
      touches: [{ clientX: 360, clientY: 225 }],
    });
    assert.ok(isFinite(tracker.x));
    assert.ok(isFinite(tracker.y));
    assert.equal(tracker.isActive, true);
  });

  test('empty touches array: no crash, no state corruption', () => {
    const xBefore = tracker.x;
    const yBefore = tracker.y;
    // touchmove with empty touches (degenerate event, never crashes)
    mockDocEl._dispatch('touchmove', { touches: [] });
    // State unchanged because the event had no coordinate data
    // (undefined clientX/Y produces null from normalizePointerCoord)
    // x/y remain at last valid value — they are still finite
    assert.ok(isFinite(tracker.x), `x corrupted: ${tracker.x}`);
    assert.ok(isFinite(tracker.y), `y corrupted: ${tracker.y}`);
  });

  test('touchend sets isActive=false', () => {
    mockDocEl._dispatch('touchend', {});
    assert.equal(tracker.isActive, false);
  });
});

describe('createPointerTracker — resize after movement', () => {
  test('resize updates area dimensions; subsequent movement remains finite', () => {
    const tracker = createPointerTracker(document.documentElement);

    // First movement
    mockDocEl._dispatch('mousemove', { clientX: 720, clientY: 450 });
    assert.ok(isFinite(tracker.x));

    // Simulate resize to mobile
    mockWin.innerWidth = 375;
    mockWin.innerHeight = 667;
    mockWin._dispatch('resize', {});

    // Movement at new dimensions
    mockDocEl._dispatch('mousemove', { clientX: 187, clientY: 333 });
    assert.ok(isFinite(tracker.x), `x after resize: ${tracker.x}`);
    assert.ok(isFinite(tracker.y), `y after resize: ${tracker.y}`);
    assert.ok(tracker.x >= -0.5 && tracker.x <= 0.5);
    assert.ok(tracker.y >= -0.5 && tracker.y <= 0.5);

    // Restore
    mockWin.innerWidth = 1440;
    mockWin.innerHeight = 900;

    tracker.destroy();
  });
});

describe('createPointerTracker — destroy() removes all listeners', () => {
  test('all 5 listeners are removed after destroy()', () => {
    const tracker = createPointerTracker(document.documentElement);

    const beforeEl = [
      mockDocEl._count('mousemove'),
      mockDocEl._count('touchmove'),
      mockDocEl._count('mouseleave'),
      mockDocEl._count('touchend'),
    ];
    const beforeWin = mockWin._count('resize');

    tracker.destroy();

    assert.equal(mockDocEl._count('mousemove'), beforeEl[0] - 1);
    assert.equal(mockDocEl._count('touchmove'), beforeEl[1] - 1);
    assert.equal(mockDocEl._count('mouseleave'), beforeEl[2] - 1);
    assert.equal(mockDocEl._count('touchend'), beforeEl[3] - 1);
    assert.equal(mockWin._count('resize'), beforeWin - 1);
  });
});

describe('createPointerTracker — invalid coordinate events do not corrupt state', () => {
  test('NaN clientX does not overwrite last valid state', () => {
    const tracker = createPointerTracker(document.documentElement);

    // Establish valid state
    mockDocEl._dispatch('mousemove', { clientX: 720, clientY: 450 });
    const lastX = tracker.x;
    const lastY = tracker.y;

    // Event with non-finite coordinate (should be ignored)
    mockDocEl._dispatch('mousemove', { clientX: NaN, clientY: 450 });

    assert.equal(tracker.x, lastX);  // unchanged
    assert.ok(isFinite(tracker.x));

    tracker.destroy();
  });
});
