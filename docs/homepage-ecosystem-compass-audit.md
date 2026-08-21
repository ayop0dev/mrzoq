# Homepage Ecosystem and Compass Reverse-Engineering Audit

## Scope and measurement conventions

This document describes the current implementation of `.layer-ecosystem` and `.layer-compass` only. Parent homepage rules are included only where they directly establish dimensions, offsets, clipping, stacking, or interaction coordinates.

- **Desktop:** viewport width `VW >= 1200px`.
- **Tablet:** `768px <= VW <= 1199px`.
- **Mobile:** `VW <= 767px`.
- **Short mobile:** mobile plus `VH <= 700px`.
- `VW` and `VH` mean `window.innerWidth` and `window.innerHeight` unless noted.
- `PW = min(VW, 1280px)` is the `.page-experience` width.
- `PX = (VW - PW) / 2` is the centered page canvas's left edge.
- `S(VW) = 0.55` on mobile, `0.8` on tablet, and `min(1, max(0.35, VW / 1600))` on desktop.
- Source-derived coordinates in the tables use `t = 0`, zero pointer parallax, normal motion, and element-center coordinates before half-width/half-height centering.
- Widths that depend on the loaded font and text are marked **Needs runtime measurement**. No browser-computed values are invented.

## 1. File and source map

| File | Lines | Purpose and relevant definitions | Content type |
|---|---:|---|---|
| `src/pages/index.astro` | 10-16, 27-84, 118-178, 186-233 | Imports/renders `Ecosystem` and `Compass`; defines `.layer-ecosystem` and `.layer-compass`; applies shared desktop/mobile transforms; initializes pointer, Compass, and Ecosystem systems. | Markup, scoped styles, behavior bootstrap |
| `src/components/Ecosystem.astro` | 12-82, 85-148 | Platform/query data arrays; distribution parameters; `.ecosystem`, `.ecosystem__rings`, `.ecosystem__objects`; renders `PlatformToken` and `QueryPill`. | Data, markup, scoped styles |
| `src/components/PlatformToken.astro` | 8-52, 54-140 | Platform token props/data attributes, token/icon/label DOM, all token styles and mobile scale. | Markup, scoped styles |
| `src/components/QueryPill.astro` | 11-48, 50-127 | Query pill props/data attributes, text DOM, all pill styles and mobile translation/opacity. | Markup, scoped styles |
| `src/components/icons/PlatformIcon.astro` | 1-103 | Inline SVG icon selected by platform `name`; every icon uses `viewBox="0 0 24 24"`. | SVG markup |
| `src/components/Compass.astro` | 17-154, 156-262 | Complete Compass SVG geometry, hidden navigation targets, component sizing, layer opacity, breathing, focus-visible UI. | SVG/HTML markup, scoped styles |
| `src/scripts/ecosystem.js` | 10-193 | Reads orbit data attributes, computes responsive orbit centers/positions, mobile target order, parallax, focus alignment, reduced-motion positions. | Behavior |
| `src/scripts/compass.js` | 13-185 | Needle inertia, pointer/ambient targeting, SVG tilt, signal stretch, reduced-motion behavior. | Behavior |
| `src/scripts/motion/index.js` | 11-15 | Barrel exports all motion helpers used by the two systems. | Imports/exports |
| `src/scripts/motion/orbital.js` | 22-90 | `createOrbital`, `parallaxOffset`, and `isAligned`; the authoritative orbit equations and focus threshold logic. | Behavior/math |
| `src/scripts/motion/inertia.js` | 19-130 | Scalar and shortest-path angular inertia used by Compass tilt, signal, and needle. | Behavior/math |
| `src/scripts/motion/pointer.js` | 23-190 | Tracking-area measurement, normalized pointer state, pointer angle, RAF loop, visibility pause/resume. | Behavior |
| `src/scripts/motion/reduced-motion.js` | 20-55 | `prefersReducedMotion` and live media-query subscription. | Behavior |
| `src/scripts/motion/lerp.js` | 63-79 | `clamp` and `mapRange` used by signal stretch; other exports are not called by these components. | Math helper |
| `src/styles/layout.css` | 11-87, 139-170 | `.page-experience`, all homepage layer containing blocks, z-indexes, clipping, layer top offset. | Global styles |
| `src/styles/tokens.css` | 7-116 | Colors, typography sizes/weights, motion durations/easing, z-index variables, `--compass-size`, responsive Compass size. | CSS variables, responsive styles |
| `src/styles/animations.css` | 8-18, 72-81 | `breathe` keyframes and global reduced-motion animation/transition suppression. `orbital-drift` exists at lines 42-50 but is not applied to these components. | Global animation styles |
| `src/styles/global.css` | 7-20, 46-59, 89-121 | Imports all shared CSS; universal `border-box` reset; body horizontal clipping; global SVG display/max-width/overflow. | Global styles |
| `src/styles/typography.css` | 8-46 | `Thmanyah Sans` faces. Tokens use Medium (500); query pills use Regular (400). Font metrics determine auto widths. | Font declarations |
| `src/layouts/BaseLayout.astro` | 6, 28-29, 64-68, 121-145 | Imports global CSS; defaults page to Arabic/RTL; viewport meta; preloads regular/medium Sans. | Page shell |
| `public/fonts/thmanyahsans/thmanyahsans-Regular.woff2` | Binary | Query pill font asset. | Font asset |
| `public/fonts/thmanyahsans/thmanyahsans-Medium.woff2` | Binary | Platform token label font asset. | Font asset |

There are no external JSON data files, SCSS files, canvas assets, image assets, or external platform SVG files involved. Platform icons and both component geometries are inline SVG. `src/scripts/motion/animation-loop.js` does not exist; `createAnimationLoop` is defined in `pointer.js`.

## 2. Exact rendered DOM structure

```text
html[lang="ar"][dir="rtl"]
└─ body (position: relative; overflow-x: hidden)
   └─ div#homepage.homepage.page-experience (position: fixed; inset: 0)
      ├─ div.layer-ecosystem (position: absolute; inset: 0; top: 20px)
      │  └─ div.ecosystem (position: absolute; inset: 0)
      │     ├─ svg.ecosystem__rings[viewBox="-1000 -1000 2000 2000"]
      │     │  └─ g.ecosystem__rings-group[opacity="0.08"]
      │     │     └─ circle × 6 (r = 160, 220, 280, 340, 400, 460)
      │     └─ div.ecosystem__objects (position: absolute; inset: 0)
      │        ├─ div.platform-token.platform-token--near × 12
      │        │  [role="img"][aria-label]
      │        │  [data-orbit-kind="platform"]
      │        │  [data-orbit-radius][data-orbit-phase]
      │        │  [data-mobile-orbit-radius][data-mobile-orbit-phase]
      │        │  [data-orbit-speed="0.5"][data-orbit-depth="0.75"]
      │        │  ├─ span.platform-token__icon[aria-hidden="true"]
      │        │  │  └─ svg.platform-token__svg[viewBox="0 0 24 24"]
      │        │  └─ span.platform-token__label
      │        └─ div.query-pill.query-pill--far × 12
      │           [role="img"][aria-label][lang][dir]
      │           [data-orbit-radius][data-orbit-phase]
      │           [data-orbit-speed="-0.3"][data-orbit-depth="0.25"]
      │           └─ span.query-pill__text
      └─ div.layer-compass (position: absolute; inset: 0; top: 20px; flex)
         └─ div.compass (position: relative)
            ├─ div.compass__stage
            │  └─ svg.compass__svg[viewBox="-200 -200 400 400"]
            │     ├─ g.compass__layer.compass__layer--deep
            │     │  ├─ circle × 3
            │     │  └─ line × 8 (axes/cardinal/intercardinal marks)
            │     ├─ g.compass__layer.compass__layer--mid
            │     │  ├─ circle × 3
            │     │  └─ g.compass__graduation-marks
            │     │     └─ line × 8
            │     └─ g.compass__layer.compass__layer--core
            │        ├─ g.compass__hub
            │        │  └─ circle × 3
            │        └─ g.compass__needle[transform="rotate(0)"]
            │           ├─ rect (counterweight)
            │           ├─ rect (shaft)
            │           ├─ polygon (tip)
            │           └─ g.compass__signal
            │              ├─ line.compass__signal-line
            │              ├─ circle.compass__signal-tip
            │              └─ circle.compass__signal-ring
            └─ nav.compass__nav-destinations
               └─ a.compass__dest.focus-visible[data-angle] × 4
```

There is no separate orbit wrapper per object. `.ecosystem__objects` is the only orbit container; each token/pill is absolutely positioned at `(left: 0, top: 0)` and translated to its JS-calculated center.

## 3. Complete selector inventory

### Parent and shared selectors

| Selector | File | Breakpoint | Declarations relevant here | Effect/override |
|---|---|---|---|---|
| `*, *::before, *::after` | `src/styles/global.css:14-20` | All | `box-sizing:border-box; margin:0; padding:0` | Dimensions; includes borders/padding in boxes. |
| `body` | `src/styles/global.css:46-59` | All | `position:relative; overflow-x:hidden`; inherits `font-family`, color | Clips horizontal paint outside body viewport. |
| `svg` | `src/styles/global.css:89-94,118-121` | All | `display:block; max-width:100%; overflow:visible` | SVG sizing/overflow. Explicit component widths still apply. |
| `.page-experience` | `src/styles/layout.css:11-19` | All | `position:fixed; inset:0; width:100%; max-width:1280px; margin:0 auto; height:100dvh; overflow:hidden` | Main containing block and clipping boundary. |
| `.layer-background, .layer-ecosystem, .layer-compass, .layer-content, .layer-header, .layer-footer` | `src/styles/layout.css:32-41` | All | `position:absolute; inset:0; pointer-events:none` | Shared full-canvas absolute layers. |
| `.layer-ecosystem` | `src/styles/layout.css:49-54` | All | `z-index:10; contain:layout style; top:20px` | Ecosystem containing block, stacking, vertical inset. |
| `.layer-compass` | `src/styles/layout.css:56-64` | All | `z-index:20; pointer-events:auto; display:flex; align-items:center; justify-content:center; contain:layout style; top:20px` | Centers Compass in layer; establishes higher layer. |
| `html[dir='rtl'] .layer-compass, html[dir='rtl'] .layer-ecosystem` | `src/pages/index.astro:119-124` | `VW>=1200` | `transform:translateX(-15vw)` | Shared RTL desktop shift; creates transformed stacking contexts. |
| `html[dir='ltr'] .layer-compass, html[dir='ltr'] .layer-ecosystem` | `src/pages/index.astro:125-128` | `VW>=1200` | `transform:translateX(15vw)` | Shared LTR desktop shift. |
| Direction-independent four-selector group for both layers | `src/pages/index.astro:139-149` | `VW<=767` | `transform:translateY(calc(-11vh - 70px))` | Shared mobile vertical shift. Replaces desktop transform because ranges do not overlap. |
| Same four-selector group | `src/pages/index.astro:167-173` | `VW<=767` and `VH<=700` | `transform:translateY(calc(-11vh - 120px))` | Overrides standard mobile shift by an additional `-50px`. |
| `@media (prefers-reduced-motion:reduce) *, *::before, *::after` | `src/styles/animations.css:73-81` | Reduced motion | duration `0.01ms!important`, iteration `1!important`, transition `0.01ms!important` | Global safety net; component rules additionally disable key motion. |

### Ecosystem selectors

| Selector | File | Breakpoint | Current declarations | Effect |
|---|---|---|---|---|
| `.ecosystem` | `Ecosystem.astro:129-134` | All | `position:absolute; inset:0; color:var(--color-primary); pointer-events:none` | Fills `.layer-ecosystem`; color inheritance; no direct interaction. |
| `.ecosystem__rings` | `Ecosystem.astro:136-142` | All | `position:absolute; inset:0; width:100%; height:100%; pointer-events:none` | Full Ecosystem ring SVG. |
| `.ecosystem__objects` | `Ecosystem.astro:144-148` | All | `position:absolute; inset:0` | Absolute containing block for all objects. |
| `.ecosystem__rings-group` | SVG attribute, `Ecosystem.astro:88` | All | `opacity="0.08"` | Ring group opacity; no CSS declaration. |
| `.platform-token` | `PlatformToken.astro:55-81` | All | absolute `left:0; top:0`; flex; gap `6px`; padding `6px 12px`; 1px border; full radius; `will-change:transform,opacity`; opacity/scale transitions; `scale:var(--platform-token-scale,1)`; translation from `--orbit-x/y`; opacity `0.42` | Token box, placement, base motion. |
| `.platform-token--far` | `PlatformToken.astro:83-85` | All | `opacity:0.25` | Unused by current data. |
| `.platform-token--mid` | `PlatformToken.astro:87-89` | All | `opacity:0.42` | Unused by current data. |
| `.platform-token--near` | `PlatformToken.astro:91-93` | All | `opacity:0.55` | Applies to all current platform tokens; overrides base opacity. |
| `.platform-token.is-focused` | `PlatformToken.astro:96-102` | All | `opacity:1; scale:calc(var(--platform-token-scale,1)*1.06)`; 350ms opacity/scale transitions | JS alignment focus state. |
| `.platform-token__icon` | `PlatformToken.astro:104-112` | All | `20px × 20px`; flex center; no shrink; primary color | Icon bounds. |
| `.platform-token__svg` | `PlatformToken.astro:114-117` | All | `width:100%; height:100%` | Fills 20px icon box. |
| `.platform-token__label` | `PlatformToken.astro:119-126` | All | Sans; `12px`; weight 500; nowrap; `letter-spacing:.01em` | Auto-width text. |
| `.platform-token` | `PlatformToken.astro:136-140` | `VW<=767` | `--platform-token-scale:0.8` | Mobile visual scale; layout box remains unscaled. |
| `.platform-token, .platform-token.is-focused` | `PlatformToken.astro:128-134` | Reduced motion | `transition:none; scale:var(--platform-token-scale,1)` | Removes focus enlargement and transitions. |
| `.query-pill` | `QueryPill.astro:51-75` | All | absolute `left:0; top:0`; inline-flex; padding `5px 14px`; 1px border; full radius; `will-change:transform,opacity`; transitions; translation from `--orbit-x/y`; opacity `0.45` | Pill box and placement. |
| `.query-pill--far` | `QueryPill.astro:77-79` | All | `opacity:0.22` | Applies to every current query; overrides base. |
| `.query-pill--mid` | `QueryPill.astro:81-83` | All | `opacity:0.38` | Unused by current data. |
| `.query-pill--near` | `QueryPill.astro:85-87` | All | `opacity:0.5` | Unused by current data. |
| `.query-pill.is-focused` | `QueryPill.astro:90-96` | All | `opacity:1; scale:1.04`; 350ms transitions | JS alignment focus. |
| `.query-pill__text` | `QueryPill.astro:98-105` | All | Sans; `12px`; weight 400; nowrap; line-height `1` | Auto-width text, exact 12px line box. |
| `.query-pill, .query-pill--far, .query-pill--mid, .query-pill--near` | `QueryPill.astro:107-114` | `VW<=767` | `opacity:0.12; translate:0 -180px` | All mobile pills remain rendered, move upward 180px, and become faint. |
| `.query-pill.is-focused` | `QueryPill.astro:116-118` | `VW<=767` | `opacity:0.2` | Overrides desktop focus opacity only. |
| `.query-pill, .query-pill.is-focused` | `QueryPill.astro:121-127` | Reduced motion | `transition:none; scale:1` | Removes focus enlargement/transitions; mobile translate remains. |

No component-specific pseudo-elements or hover selectors exist.

### Compass selectors

| Selector | File | Breakpoint | Current declarations | Effect |
|---|---|---|---|---|
| `:root --compass-size` | `tokens.css:97-99` | Desktop default | `min(40vw,420px)` | Compass width/height source. |
| `:root --compass-size` | `tokens.css:106-111` | `VW<=1199` | `min(55vw,380px)` | Tablet and provisional mobile override. |
| `:root --compass-size` | `tokens.css:113-116` | `VW<=767` | `min(55vw,240px)` | Final mobile override. |
| `.compass` | `Compass.astro:157-162` | All | `position:relative; width/height:var(--compass-size); flex-shrink:0` | Square component wrapper. |
| `.compass__stage` | `Compass.astro:164-167` | All | `width:100%; height:100%` | Square SVG stage. |
| `.compass__svg` | `Compass.astro:169-174` | All | `width/height:100%; color:primary; will-change:transform` | Geometry viewport and JS tilt target. |
| `.compass__layer--deep` | `Compass.astro:177-179` | All | `opacity:0.18` | Deep SVG layer. |
| `.compass__layer--mid` | `Compass.astro:181-183` | All | `opacity:0.45` | Middle SVG layer. |
| `.compass__layer--core` | `Compass.astro:185-187` | All | `opacity:1` | Hub/needle/signal layer. |
| `.compass__hub` | `Compass.astro:189-192` | All | No declarations | Stable SVG group. |
| `.compass__needle` | `Compass.astro:195-198` | All | `transform-origin:0 0; will-change:transform` | Rotates about SVG origin/Compass center. |
| `.compass__nav-destinations` | `Compass.astro:204-214` | All | absolute center, zero size, visible overflow, no pointer events, `z-index:50` | Hidden navigation anchor origin. |
| `.compass__dest` | `Compass.astro:216-229` | All | absolute 1px clipped box, no pointer events, 14px/500 Sans | Visually hidden navigation links. |
| `.compass__dest:focus-visible` | `Compass.astro:231-250` | All | auto size, unclipped, `top:20px; left:50%; translateX(-50%)`; padding/border/outline; pointer events auto | Focus UI below hub. |
| `.compass__svg` | `Compass.astro:252-255` | All | `animation:breathe 6s var(--ease-smooth) infinite` | CSS idle breathing. |
| `.compass__svg` | `Compass.astro:257-261` | Reduced motion | `animation:none` | Disables breathing. |

## 4. Component dimensions

### Canvas and wrappers

| Element | Width | Height | Min/max/aspect | Transform origin |
|---|---|---|---|---|
| `.page-experience` | `100%`, capped at `1280px` | `100dvh` | `max-width:1280px`; no min; viewport-fixed | Default center |
| `.layer-ecosystem` | `PW` | `VH - 20px` | Absolute `left/right/bottom:0; top:20px` | Default center |
| `.ecosystem` | 100% of layer | 100% of layer | Absolute inset 0 | Default center |
| `.ecosystem__rings` | 100% | 100% | SVG source aspect ratio 1:1; default `preserveAspectRatio="xMidYMid meet"` | SVG center `(0,0)` |
| `.ecosystem__objects` | 100% | 100% | Absolute inset 0 | N/A |
| `.layer-compass` | `PW` | `VH - 20px` | Flex containing block | Default center |
| `.compass`, `.compass__stage`, `.compass__svg` | See breakpoint table | Same as width | Square; no min-width/max-height declarations | SVG/element center except needle |

Compass size resolves as follows:

- Desktop: `min(40vw,420px)`. At every desktop width (`>=1200`), `40vw >= 480px`, so current resolved source value is always `420px`.
- Tablet: `min(55vw,380px)`. At `768px`, `55vw = 422.4px`; therefore the entire tablet range resolves to `380px`.
- Mobile: `min(55vw,240px)`. It is `0.55 × VW` below `436.36px`, and `240px` from `436.36px` through `767px`.

No Compass wrapper uses CSS `scale`. The SVG breathing animation changes visual scale from `1` to `1.008`; JS tilt uses perspective rotations only.

### Object boxes

| Element | Layout width | Layout height | Visual scale |
|---|---|---:|---|
| Platform token | `52px + rendered label width` (`20 icon + 6 gap + 24 horizontal padding + 2 border`) | `34px` (`20 icon + 12 vertical padding + 2 border`) | Desktop/tablet `1`; mobile `0.8`; focused `1.06` times base, except reduced motion |
| Platform icon | `20px` | `20px` | Inherits token scale |
| Query pill | `30px + rendered text width` (`28 horizontal padding + 2 border`) | `24px` (`12 line box + 10 vertical padding + 2 border`) | `1`; focused `1.04`, except reduced motion |

Exact token/pill widths are **Needs runtime measurement** because the boxes are `auto` width and depend on Thmanyah Sans glyph metrics, language shaping, and font-load state. There are no `min-width`, `max-width`, `min-height`, `max-height`, or explicit aspect-ratio declarations for tokens or pills.

### Ecosystem ring geometry

The ring SVG has a `2000 × 2000` viewBox centered at `(0,0)`. Six radii are `160, 220, 280, 340, 400, 460` units; spacing is exactly `60` SVG units. Stroke widths are `0.40, 0.36, 0.32, 0.28, 0.24, 0.20` SVG units. With default `meet` scaling, one SVG unit equals `min(PW, VH - 20) / 2000` CSS pixels; the largest ring diameter is `920` units, or `46%` of that smaller dimension.

## 5. Positioning and coordinate system

### Parent and layer coordinates

The fixed `.page-experience` is centered horizontally and clips all descendants with `overflow:hidden`. Both target layers are absolute with `left:0; right:0; bottom:0; top:20px`. Their untransformed local origin is `(PX, 20px)` in screen coordinates.

Layer transform:

```text
Desktop RTL:  Lx = -0.15 × VW; Ly = 0
Desktop LTR:  Lx = +0.15 × VW; Ly = 0
Tablet:       Lx = 0; Ly = 0
Mobile:       Lx = 0; Ly = -0.11 × VH - 70px
Short mobile: Lx = 0; Ly = -0.11 × VH - 120px
```

The Compass flex center in screen coordinates is:

```text
CompassCenterX = PX + PW/2 + Lx
CompassCenterY = 20 + (VH - 20)/2 + Ly = VH/2 + 10 + Ly
```

The orbital JS center is initialized and resized from the full window, not from `.ecosystem__objects`:

```text
JS centerX = VW/2
JS centerY = VH/2
OrbitCenter screen X = PX + VW/2 + Lx
OrbitCenter screen Y = 20 + VH/2 + Ly
```

Therefore the JS orbital center minus Compass center is:

```text
ΔX = (VW - PW)/2
ΔY = +10px
```

`ΔX` is zero through `1280px`; above `1280px` it grows by half of the excess viewport width. Shared layer transforms do not change this difference.

### Per-object normal-motion calculation

`createOrbital` defines:

```text
angle(t) = phase + (t / 80000) × speed × 2π
rawX(t)  = cos(angle(t)) × radius
rawY(t)  = sin(angle(t)) × radius
```

Normal-motion frame calculation is:

```text
platformScale = 0.8 on mobile platforms, otherwise 1
ox = rawX × S(VW) × platformScale
oy = rawY × S(VW) × platformScale
dx = pointer.x × depth × 20
dy = pointer.y × depth × 20
--orbit-x = VW/2 + ox + dx
--orbit-y = VH/2 + oy + dy + platformOffsetY
```

`pointer.x/y` are clamped to `[-0.5, 0.5]`. Thus per-axis parallax is at most `±7.5px` for platforms (`depth .75`) and `±2.5px` for queries (`depth .25`). `platformOffsetY` is `64px` only on mobile with `VH <= 700px`; otherwise it is zero.

The element CSS then applies:

```css
transform: translate(
  calc(var(--orbit-x) - 50%),
  calc(var(--orbit-y) - 50%)
);
```

Because `left/top` are zero, the percentage terms center the object's own layout box on the computed point. Platform `scale` and query `translate` use modern individual transform properties in addition to `transform`; mobile query pills receive a further `translate: 0 -180px`.

### Reduced-motion calculation

At reduced motion, orbital time and parallax are omitted. A current implementation difference is important:

- Mobile platforms use custom mobile orbit, `0.8`, `S=.55`, and optional `+64px` Y.
- Mobile queries use their regular orbit with scale `1`, not `S=.55`, then still receive CSS `translateY(-180px)`.
- Tablet/desktop objects also use scale `1` in reduced motion, not `S(VW)`.
- The reduced branch returns before focus detection.

## 6. Platform Token map

All platform tokens originate in `src/components/Ecosystem.astro:18-30`, render as `div.platform-token.platform-token--near`, use inline icons from `PlatformIcon.astro`, have opacity `.55`, depth `.75`, speed `+0.5`, no explicit z-index, and orbit clockwise in screen coordinates. One revolution takes `80000 / 0.5 = 160000ms` (160s). There is no animation delay; all use the same RAF timestamp.

`Base X/Y` below are unscaled `t=0` offsets for desktop/tablet. Desktop display offsets are `Base × S(VW)`; tablet offsets are `Base × .8`. Mobile X/Y already include `.55 × .8 = .44`, but not parallax or short-mobile `+64px` Y.

| Token | DOM/data identifier and icon | Desktop/tablet phase; radius | Base X / Y (px) | Mobile phase; radius | Mobile X / Y (px) | Width / height | Z / animation |
|---|---|---:|---:|---:|---:|---|---|
| ChatGPT | `data-orbit-kind=platform`; `chatgpt` SVG | `0°`; 230 | `230.0 / 0.0` | `-88°`; 380 | `5.8 / -167.1` | `52px + label`; 34px (visual mobile 27.2px high) | auto; 160s clockwise + parallax/focus |
| Claude | `claude` SVG | `30°`; 210 | `181.9 / 105.0` | `-50°`; 320 | `90.5 / -107.9` | same formula | same |
| Gemini | `gemini` SVG | `60°`; 230 | `115.0 / 199.2` | `-15°`; 380 | `161.5 / -43.3` | same formula | same |
| Copilot | `copilot` SVG | `90°`; 210 | `0.0 / 210.0` | `8°`; 300 | `130.7 / 18.4` | same formula | same |
| Perplexity | `perplexity` SVG | `120°`; 230 | `-115.0 / 199.2` | `35°`; 340 | `122.5 / 85.8` | same formula | same |
| Midjourney | `midjourney` SVG | `150°`; 210 | `-181.9 / 105.0` | `67°`; 320 | `55.0 / 129.6` | same formula | same |
| Notion AI | `notion` SVG | `180°`; 230 | `-230.0 / 0.0` | `89°`; 380 | `2.9 / 167.2` | same formula | same |
| Jasper | `jasper` SVG | `210°`; 210 | `-181.9 / -105.0` | `111°`; 300 | `-47.3 / 123.2` | same formula | same |
| Hugging Face | `huggingface` SVG | `240°`; 230 | `-115.0 / -199.2` | `142°`; 340 | `-117.9 / 92.1` | same formula | same |
| Runway | `runway` SVG | `270°`; 210 | `0.0 / -210.0` | `184°`; 300 | `-131.7 / -9.2` | same formula | same |
| xAI | `xai` SVG | `300°`; 230 | `115.0 / -199.2` | `213°`; 360 | `-132.8 / -86.3` | same formula | same |
| Synthesia | `synthesia` SVG | `330°`; 210 | `181.9 / -105.0` | `240°`; 340 | `-74.8 / -129.6` | same formula | same |

Desktop/tablet source phases are generated from array index and are not stored in the platform data objects. Mobile phases/radii are explicit per token. The `iconLabel` values are passed into `PlatformToken` but are neither destructured nor rendered; icon output is determined solely by `id`.

## 7. Query Pill map

All queries originate in `src/components/Ecosystem.astro:33-46`, render as `div.query-pill.query-pill--far`, have opacity `.22` on desktop/tablet and `.12` on mobile, depth `.25`, speed `-0.3`, no explicit z-index, and travel counterclockwise. One revolution takes `80000 / 0.3 = 266666.67ms`. No delay is used.

The table gives unscaled base offsets, tablet offsets (`×.8`), and normal-motion mobile offsets (`×.55`) including the CSS `-180px` Y translation. Desktop offsets equal base offsets times `S(VW)`.

| # / query | Lang | Layer; radius; phase | Base X/Y | Tablet X/Y | Mobile X/Y | Behavior and overlap risk |
|---:|---|---:|---:|---:|---:|---|
| 1. أفضل مطعم في الرياض | ar/rtl | far; 395; `15°` | `381.5 / 102.2` | `305.2 / 81.8` | `209.8 / -123.8` | 266.67s CCW; can enter all hero/header/footer angular zones |
| 2. أفضل شركة تشطيب في الرياض | ar/rtl | far; 365; `45°` | `258.1 / 258.1` | `206.5 / 206.5` | `142.0 / -38.0` | same |
| 3. Best ERP company in Saudi Arabia | en/ltr | far; 395; `75°` | `102.2 / 381.5` | `81.8 / 305.2` | `56.2 / 29.8` | same; long auto width increases collision envelope |
| 4. أفضل مستشفى أطفال في جدة | ar/rtl | far; 365; `105°` | `-94.5 / 352.6` | `-75.6 / 282.1` | `-52.0 / 13.9` | same |
| 5. best marketing agency Dubai | en/ltr | far; 395; `135°` | `-279.3 / 279.3` | `-223.4 / 223.4` | `-153.6 / -26.4` | same; long auto width |
| 6. شركة برمجيات موثوقة في الكويت | ar/rtl | far; 365; `165°` | `-352.6 / 94.5` | `-282.1 / 75.6` | `-193.9 / -128.0` | same; long auto width |
| 7. Top real estate broker in Qatar | en/ltr | far; 395; `195°` | `-381.5 / -102.2` | `-305.2 / -81.8` | `-209.8 / -236.2` | same; long auto width |
| 8. عيادة تجميل وليزر في البحرين | ar/rtl | far; 365; `225°` | `-258.1 / -258.1` | `-206.5 / -206.5` | `-142.0 / -322.0` | same |
| 9. Top logistics company in MENA | en/ltr | far; 395; `255°` | `-102.2 / -381.5` | `-81.8 / -305.2` | `-56.2 / -389.8` | same; strongest initial top/header clipping risk on mobile |
| 10. أفضل منصة تجارة إلكترونية | ar/rtl | far; 365; `285°` | `94.5 / -352.6` | `75.6 / -282.1` | `52.0 / -373.9` | same; strong initial top/header clipping risk on mobile |
| 11. AI automation for startups | en/ltr | far; 395; `315°` | `279.3 / -279.3` | `223.4 / -223.4` | `153.6 / -333.6` | same |
| 12. Legal services in Muscat | en/ltr | far; 365; `345°` | `352.6 / -94.5` | `282.1 / -75.6` | `193.9 / -232.0` | same |

All twelve pills can overlap the title, description, CTA, header, or footer over a complete orbit because each traverses every angle and there is no collision or safe-zone logic. Exact overlap moments depend on viewport dimensions, RTL content bounds, text widths, shared layer transforms, and `performance.now()`; these require runtime measurement. On mobile, the fixed `-180px` visual translation biases the complete query system upward, making header/top clipping more likely and footer overlap less likely at the same orbital phase. The `.page-experience` clips all pills outside its bounds.

## 8. Compass internal geometry

### Coordinate system and rings

The Compass SVG uses `viewBox="-200 -200 400 400"`; center/pivot is `(0,0)`. One SVG unit equals `CompassSize / 400` CSS pixels.

| Structure | Geometry |
|---|---|
| Total SVG | 400 × 400 source units; CSS size equals `--compass-size` |
| Deep rings | radii `192`, `176`, `160`; stroke widths `.5`, `.3`, `.3` |
| Middle rings | radii `140`, `116`, `100`; stroke widths `.5`, `.4`, `.6` |
| Hub | ring radii `14` and `8`; filled core radius `3` |
| Ring count | 8 visible circle radii total when hub is included: 192, 176, 160, 140, 116, 100, 14, 8, plus the filled core point |
| Outer visible diameter | `384` units = `96%` of Compass CSS size |
| Deep ring gaps | 16, 16 units |
| Mid/transition gaps | 20 (160→140), 24 (140→116), 16 (116→100) units |
| Axes | horizontal and vertical `-192` to `192`; stroke `.25` |
| Cardinal outer ticks | 9 units long, radius 183→192; stroke `1` |
| Intercardinal outer ticks | approximately 9.9 units diagonally, `(128,128)`→`(135,135)` variants; stroke `.5` |
| Graduation major ticks | 10 units, radius 100→110; stroke `1.2` |
| Graduation diagonal ticks | approximately 10.0 units, `70.7`→`77.8`; stroke `.8` |

### Needle and signal

| Part | Geometry |
|---|---|
| Pivot/transform origin | `(0,0)` via `.compass__needle { transform-origin:0 0 }` |
| Main shaft | rect `x=-1.5`, `y=-72`, width `3`, height `88`, ending at `y=16`; radius `1.5` |
| Guidance tip | polygon `(0,-88), (-4,-72), (4,-72)`; tip length 16, max width 8 |
| Counterweight | rect `x=-2`, `y=16`, width `4`, height `28`, ending `y=44`, opacity `.45` |
| Needle tip reach | 88 units from pivot; full physical span from `y=-88` to `y=44` = 132 units |
| Signal rest line | `(0,-88)` to `(0,-110)`; 22-unit extension |
| Signal maximum | endpoint `y=-123`; 35-unit extension beyond tip |
| Signal tip | radius `3`, center at dynamic endpoint |
| Signal ring | radius `8`, center at dynamic endpoint, opacity `.5` |

At size `C`, convert all geometry to CSS pixels by multiplying by `C/400`. For example, the outer ring radius is `.48C`, needle tip reach is `.22C`, and rest signal endpoint reach is `.275C`.

### Needle direction and targeting

1. `createPointerTracker` measures `.layer-compass.getBoundingClientRect()` and normalizes pointer X/Y independently to `[-.5,.5]`.
2. Pointer target angle is `atan2(normalizedY, normalizedX)`.
3. `createAngleInertia` follows the shortest angular path. Active pointer settings are speed `.25`, friction `.82`.
4. The authored needle points up at SVG rotation `0`. Rendering applies `rotate(degrees(angle) + 90)` so mathematical angle `0` points the needle right.
5. Pointer-active tilt targets are `tiltX = p.x × 12°` and `tiltY = p.y × 8°`; SVG transform is `perspective(600px) rotateX(-tiltY) rotateY(tiltX)`. Scalar inertia uses speed `.15`, friction `.85`.
6. Pointer distance stretches the signal: `hypot(p.x,p.y)` maps `0..0.5` to `0..13`, then clamps `0..13`. Signal inertia uses speed `.2`, friction `.82`.

When the pointer is inactive:

- Desktop/tablet: Ecosystem selects the next object in DOM order every `4000ms`; order is 12 platforms then 12 queries. `currentAmbientAngle` uses the selected object's unscaled `orbital.angle(time)`. Needle speed `.01`, friction `.82`.
- Mobile: only platforms are targets, switching every `6000ms` in array-index order `[0,7,3,10,5,1,8,4,11,6,2,9]`, i.e. ChatGPT, Jasper, Copilot, xAI, Midjourney, Claude, Hugging Face, Perplexity, Synthesia, Notion AI, Gemini, Runway. Target angle is `atan2(targetY,targetX)` after `.55 × .8` orbit scaling and optional short-mobile `+64px` Y. Needle speed `.018`, friction `.86`.
- There is no fixed CSS duration, delay, or pause animation for needle rotation. It is an indefinitely running RAF/inertia system; target switching creates apparent hold periods.
- The Ecosystem receives the current inertial needle angle every frame and applies `.is-focused` when angular difference is under `.22rad` (about `12.61°`).

The four hidden navigation links have `data-angle` values 270, 0, 90, and 180 degrees, but the current JS does not read these attributes; they do not target the needle.

## 9. Ecosystem–Compass relationship

The systems are separate sibling layers. They receive the same CSS layer transform at desktop and mobile, but their internal centers are calculated differently.

| Measurement | Desktop | Tablet | Mobile |
|---|---|---|---|
| Compass center | `(PX + PW/2 + Lx, VH/2 + 10)` | `(VW/2, VH/2 + 10)` | `(VW/2, VH/2 + 10 + Ly)` |
| Ring SVG center | Same as Compass center | Same | Same |
| JS orbit center | `(PX + VW/2 + Lx, VH/2 + 20)` | `(VW/2, VH/2 + 20)` | `(VW/2, VH/2 + 20 + Ly)` |
| JS orbit minus Compass | `((VW-1280)/2, +10)` when `VW>1280`; otherwise `(0,+10)` | `(0,+10)` | `(0,+10)` |
| Platform orbit center | JS orbit center | JS orbit center | JS orbit center; add `(0,+64)` only when `VH<=700` |
| Query visual orbit center | JS orbit center | JS orbit center | JS orbit center plus `(0,-180)` in normal motion |

At `t=0`, desktop and tablet platform center-point means are mathematically `(0,0)` relative to their orbit center because phases are evenly spaced and alternating radii cancel. Query center-point means also cancel. This does not account for unequal auto widths, text direction, clipping, opacity, or animation phase; the **optical** centroid is **Needs runtime measurement**.

For mobile normal motion, the source-derived arithmetic mean of the 12 platform center offsets is `(5.38px, 6.09px)` relative to the platform orbit center before parallax and before short-mobile `+64px`. Therefore it is `(5.38px, 16.09px)` relative to the Compass center on normal-height mobile, and `(5.38px, 80.09px)` on short mobile. This is a mathematical center-point mean, not a token-area/opacity-weighted optical centroid.

## 10. Responsive breakpoint matrix

| Property | Desktop `>=1200` | Tablet `768-1199` | Mobile `<=767` | Source |
|---|---|---|---|---|
| Ecosystem layer width | `PW=min(VW,1280)` | `VW` | `VW` | `.page-experience`, `layout.css` |
| Ecosystem layer height | `VH-20px` | same | same | `.layer-ecosystem`, `layout.css` |
| Layer offset X | RTL `-15vw`; LTR `+15vw` | `0` | `0` | `index.astro:119-128` |
| Layer offset Y | `0` transform; structural `top:20px` | same | `-11vh-70px`; `-11vh-120px` if `VH<=700`, plus structural top | `layout.css:53/63`; `index.astro:139-173` |
| Ecosystem wrapper scale | None | None | None | `.ecosystem` |
| JS orbit scale | `S=min(1,max(.35,VW/1600))` | `.8` | `.55`; platforms also `.8` | `ecosystem.js:31-40,122-124` |
| Platform base radii | alternating 230/210 | same | custom 300-380, then effective `.44` | `Ecosystem.astro`, `ecosystem.js` |
| Query base radii | alternating 395/365 | same | same, effective `.55` normal motion | same |
| Platform token scale | `1` | `1` | `.8` | `PlatformToken.astro:136-140` |
| Query visibility | Rendered | Rendered | Rendered, never hidden | `QueryPill.astro` |
| Query opacity | `.22`, focused `1` | same | `.12`, focused `.2` | `QueryPill.astro` |
| Query visual translation | none | none | `0 -180px` | `QueryPill.astro:107-114` |
| Compass width/height | `420px` resolved | `380px` resolved | `min(55vw,240px)` | `tokens.css:97-116` |
| Compass scale | breathe `1↔1.008`; no layout scale | same | same | `Compass.astro`, `animations.css` |
| Compass offset | shared layer X; center Y `VH/2+10` | center `(VW/2,VH/2+10)` | shared layer Y | `layout.css`, `index.astro` |
| Needle ambient target | All 24 objects, next each 4s; speed `.01` | same | Platforms only, custom order each 6s; speed `.018` | `ecosystem.js`, `compass.js` |
| Parallax | Object parallax + Compass tilt | same | Same code; touch/mouse events can activate | scripts |
| Overflow | `.page-experience:hidden`; body X hidden | same | same | `layout.css`, `global.css` |
| Layer z-index | ecosystem 10; compass 20 | same | same | `tokens.css`, `layout.css` |
| Reduced-motion position scale | scale `1` (not desktop S) | scale `1` (not `.8`) | platforms `.44`; queries `1` plus -180 CSS | `ecosystem.js:108-119` |

## 11. Animation inventory

| Animation/system | Source/target | Timing | Changed properties/attributes | Breakpoint/reduced motion |
|---|---|---|---|---|
| `breathe` | `animations.css:8-18`; `.compass__svg` | 6s, `cubic-bezier(.4,0,.2,1)`, infinite, no delay | CSS `transform:scale(1→1.008→1)` and opacity `1→.96→1` | All breakpoints; removed by component reduced-motion rule |
| Platform orbit | `orbital.js`; token `--orbit-x/y` | 160s/revolution, RAF, infinite, shared timestamp, no delay | CSS custom properties feeding token `transform:translate` | All; static at `t=0` reduced motion |
| Query orbit | same | 266.667s/revolution, counterclockwise, RAF, infinite | same | All; static at `t=0` reduced motion |
| Object parallax | `ecosystem.js:126-131` | RAF; immediate pointer-derived offset | `--orbit-x/y`, max ±7.5px platform / ±2.5px query per axis | All; disabled reduced motion |
| Object focus | `isAligned`; token/pill `.is-focused` | Check every RAF; opacity 600ms ambient transition, 350ms focused transition; scale 350ms | Individual CSS `scale`, opacity/class | All; reduced branch returns before focus and CSS removes scaling/transitions |
| Needle rotation | `compass.js`, `.compass__needle` | RAF inertia; no fixed duration/delay; shortest path | SVG `transform="rotate(...)"` attribute | Pointer all breakpoints; distinct ambient speed/target cadence; reduced motion snaps only on active pointer |
| Compass tilt | `compass.js:148-149`, `.compass__svg` | RAF inertia speed `.15`, friction `.85` | CSS transform `perspective(600px) rotateX() rotateY()` | All; reset/disabled reduced motion |
| Signal stretch | `compass.js:151-157` | RAF inertia speed `.2`, friction `.82` | SVG geometry attributes: line `y2`, tip/ring `cy`, rest `-110`, max `-123` | All; reduced motion draws needle only and leaves/reset geometry behavior as implemented |
| Target cycling | `ecosystem.js:72-101` | 4s desktop/tablet; 6s mobile | `currentAmbientAngle` only | Continues in RAF; reduced state still computes ambient before object loop, though needle reduced branch does not use ambient |
| Visibility pause | `pointer.js:145-188` | `visibilitychange` | Cancels/restarts RAF | All |
| `orbital-drift` keyframes | `animations.css:42-50` | Defined only | None in current DOM; no selector applies it | Not active |
| Hover | None | N/A | No hover styles or handlers | N/A |

## 12. Stacking and overlap map

| Item | Position/z-index | Parent stacking context | Opacity/blend | Pointer events |
|---|---|---|---|---|
| Ecosystem rings | absolute; auto z within layer 10 | `.layer-ecosystem` | group `.08`; no blend mode | none |
| Platform Tokens | absolute; auto z | `.layer-ecosystem` | `.55`, focused 1; no blend mode | inherited `none` from `.ecosystem` |
| Query Pills | absolute; auto z; rendered after all tokens | `.layer-ecosystem` | `.22` desktop/tablet, `.12` mobile; no blend | inherited none |
| Compass | layer z `20` | `.layer-compass` | deep `.18`, mid `.45`, core 1; breathing affects SVG opacity | layer auto; Compass receives pointer events |
| Hero Content | layer z `30` | `.layer-content` | component-dependent, no relevant blend | auto on layer |
| Footer | layer z `40` | `.layer-footer` | component-dependent | auto on layer |
| Header | layer z `45` | `.layer-header` | component-dependent | auto on layer |
| Focus navigation pill | z `50` inside `.compass` | `.layer-compass` (which remains z 20) | opaque/tinted glass | only focused anchor opts in |

Within the Ecosystem, positioned elements have `z-index:auto`. DOM order paints all queries after all platforms, so queries can paint above platform tokens when they overlap. The entire Compass layer paints above the Ecosystem; Hero Content, Footer, and Header paint above both regardless of the Compass navigation's internal z-index.

Mobile possible overlap zones:

- Shared ecosystem/Compass upward translation can bring upper tokens, rings, and the Compass toward the header; page clipping hides overflow.
- Query pills add another `-180px`, so their path is strongly biased toward the header/top boundary.
- Lower platform tokens can enter the Hero Content region; content z 30 visually covers ecosystem z 10 and Compass z 20.
- On short mobile, platform orbits add `+64px` internally while both layers receive an extra `-50px` upward transform; net platform-center change versus normal mobile is `+14px`, while Compass remains `-50px` higher.
- Exact collision rectangles with title, description, CTA, header, and footer are **Needs runtime measurement** because their boxes and viewport dimensions are not fixed in these two components.

## 13. Re-engineering control points

| Stable control name | Current value | Source | Breakpoint/dependencies | Change risk |
|---|---|---|---|---|
| `Homepage.CanvasWidth` | `min(100%,1280px)` | `.page-experience`, `layout.css:11-19` | All; affects clipping and wide-desktop center mismatch | High |
| `Ecosystem.CenterX` | `window.innerWidth/2` local to centered canvas | `ecosystem.js:37,151` | All | High: differs from Compass over 1280px |
| `Ecosystem.CenterY` | `window.innerHeight/2` local to a layer already `top:20px` | `ecosystem.js:38,152` | All | High: produces +10px center mismatch |
| `Ecosystem.Scale` | `.55` mobile, `.8` tablet, desktop `clamp(VW/1600,.35,1)` | `getScaleFactor`, `ecosystem.js:31-35` | Used by normal-motion objects and mobile targeting | High |
| `Ecosystem.LayerOffset` | desktop ±15vw; mobile `-11vh-70/-120px` | `index.astro:119-173` | Shared with Compass | Medium; safe only if coordinated intent is preserved |
| `PlatformOrbit.Scale` | `.8` mobile only | `ecosystem.js:40,154` | Multiplies `.55`; also target angle input | High |
| `PlatformOrbit.ShortMobileOffsetY` | `64px` | `ecosystem.js:41-43` | `VW<768 && VH<=700` | High; changes needle target/focus geometry |
| `PlatformOrbit.Radius` | desktop/tablet alternating `230/210` | `Ecosystem.astro:57-59` | All non-mobile platforms | Medium |
| `PlatformToken.<Name>.Angle` | desktop generated `index×30°`; mobile explicit table values | `Ecosystem.astro:18-30,57-60` | Motion phase and target order | Medium |
| `PlatformToken.<Name>.Radius` | mobile explicit `300-380`; desktop generated | same | Motion/needle target | Medium |
| `PlatformToken.<Name>.OffsetX/Y` | No independent source property; derived from angle/radius/scale/parallax | `orbital.js`, `ecosystem.js` | All | Do not invent without adding new behavior |
| `PlatformToken.Scale` | `1`; mobile `.8` | `PlatformToken.astro:74,136-139` | Individual CSS scale separate from orbit scale | Low/medium |
| `QueryOrbit.Radius` | alternating `395/365` | `Ecosystem.astro:70-72` | All queries | Medium |
| `QueryOrbit.Angle` | `index×30°+15°` | same | All; moves continuously | Medium |
| `QueryPill.MobileSafeZone` | No collision system; only `translateY(-180px)` and opacity `.12` | `QueryPill.astro:107-118` | Mobile | High: currently a visual offset, not a safe-zone model |
| `Compass.CenterX/Y` | layer flex center formula above | `.layer-compass`, `layout.css` | Shared layer transforms | High |
| `Compass.Size` | 420 desktop; 380 tablet; `min(55vw,240px)` mobile | `tokens.css:97-116` | Changes unit-to-pixel mapping of all SVG geometry | Medium |
| `Compass.Needle.TransformOrigin` | SVG `(0,0)` | `Compass.astro:195-198` | All | Critical |
| `Compass.Needle.PointerLogic` | normalized layer point → `atan2(y,x)` → `+90°` display offset | `pointer.js`, `compass.js` | All | Critical |
| `Compass.Needle.TargetLogic` | 4s all-object cycle desktop/tablet; 6s platform-order cycle mobile | `ecosystem.js:72-101`, `compass.js:98-115` | Depends on DOM/data order and orbit geometry | Critical |
| `Compass.FocusThreshold` | `.22rad` | `ecosystem.js:139` | All object focus | High |
| `Compass.SignalEndpoint` | rest `-110`, max `-123` | `compass.js:67-69,151-157` | Pointer active, non-reduced | High |

## 14. Safe and unsafe modifications

### Safe to modify independently within the current architecture

- Individual `mobilePhase` values: changes only the specified platform's mobile starting/ongoing angular placement, though needle target follows it.
- Individual `mobileRadius` values: changes one platform's mobile orbital distance, with corresponding mobile target geometry.
- Generated platform/query base radii and phases when the intended impact is understood; data attributes and orbit math update automatically.
- Shared layer transforms in `index.astro` when moving Ecosystem and Compass together at an existing breakpoint.
- `--compass-size` breakpoint expressions when proportional internal geometry is desired.
- Token/pill visual `scale` and breakpoint opacity as styling controls; these do not change orbital center calculations.

“Safe” means locally controlled, not visually risk-free; overlap must still be validated.

### Unsafe without coordinated changes

- `centerX/centerY` in `ecosystem.js`: these are local coordinates based on global window dimensions. Changing them affects every object and needle ambient direction.
- `.page-experience` max-width or centering: it changes the relationship between viewport-based orbital coordinates and layer-local Compass centering.
- Layer `top:20px`: the current orbit/Compass `+10px` mismatch derives from it; changing one layer alone breaks shared alignment.
- `.compass__needle` transform origin, SVG viewBox, or the `+90°` display offset: these are a coupled coordinate convention.
- Platform DOM/data order: desktop target cycling uses full DOM order; mobile targeting uses hard-coded platform indexes.
- Adding/removing objects without updating target assumptions: mobile uses modulo against platform count, but the semantic order changes; desktop timing/order also changes.
- `platformOrbitScale`, short-mobile offset, or custom mobile phases without checking `currentAmbientAngle`: mobile needle direction is derived from the same values.
- Query mobile `translate:-180px`: focus detection uses the un-translated orbital angle, so visual pill direction and focus direction are already separate on mobile; changing it increases/decreases that mismatch.
- Reduced-motion branches: they use different scaling and return before normal focus detection; layout changes must be checked in both modes.
- `overflow:hidden` on `.page-experience` or body clipping: it defines the visible orbital envelope and prevents off-canvas objects from causing scrolling.
- Layer z-indexes/transforms/containment: they define component painting order and stacking contexts relative to content/header/footer.
- Inertia state, RAF lifetime, and visibility handlers: they coordinate smooth movement and cleanup; isolated edits can create jumps or duplicate loops.

## 15. Final reconstruction summary

### Current Architecture

The homepage is a fixed, clipped, maximum-1280px canvas containing sibling absolute layers. The Ecosystem renders one full-layer ring SVG and one full-layer object container. Astro generates 12 platform tokens and 12 query pills; JavaScript reads their data attributes and writes per-frame CSS position variables. The Compass is a separately centered, proportional SVG with JS-driven needle/tilt/signal behavior. The two systems exchange only angles: Ecosystem exposes the current ambient target to Compass, and Compass exposes its current needle angle back to Ecosystem for focus classes.

### Current Desktop Composition

The Compass is a fixed 420px square. Both layers shift `15vw` away from the content according to document direction. Orbits scale from `.75` at 1200px to `1` at 1600px and above. Platform radii alternate 230/210; query radii alternate 395/365. At widths above 1280px, viewport-derived orbital X is displaced right of the capped canvas/Compass center by `(VW-1280)/2` before the shared direction transform.

### Current Tablet Composition

The Compass is a fixed 380px square, with no layer transform. Orbits use scale `.8`; desktop phases/radii remain active. Ecosystem ring center and Compass center coincide, while JS object orbit center sits 10px lower because it uses `VH/2` inside a layer beginning at 20px.

### Current Mobile Composition

The Compass is `min(55vw,240px)`. Both layers move upward by `11vh+70px`, or `11vh+120px` on short mobile. Platforms use explicit hand-tuned phases/radii, orbit scale `.55×.8=.44`, and visual token scale `.8`. Short mobile adds 64px to platform orbit Y and target calculations. Queries retain generated phases/radii, use orbit scale `.55` in normal motion, then visually translate upward another 180px and render at opacity `.12`. The mobile needle cycles through a fixed platform-index order every six seconds.

### Minimum Inputs Required for a Full Rebuild

- Viewport/canvas width rule, cap, clipping, and direction (`rtl`/`ltr`).
- Exact layer containing blocks, top inset, shared desktop/mobile transforms, and z-indexes.
- Compass CSS size expression at each breakpoint and the 400-unit SVG viewBox.
- All Compass circle, line, tick, hub, needle, counterweight, signal, stroke, and opacity values.
- All 12 platform IDs/names/icons, generated desktop phases/radii, explicit mobile phases/radii, speed, depth, layer, opacity, and scale.
- All 12 query strings/languages, generated phases/radii, speed, depth, layer, opacity, and mobile translation.
- Window-based orbit center equations, responsive scale function, platform mobile multiplier, short-mobile Y offset, and parallax strength.
- Pointer normalization area, angle convention, display rotation offset, inertia parameters, target switch order/cadence, and focus threshold.
- Font files/weights/sizes plus runtime-measured token and pill widths for collision work.
- Target desktop/tablet/mobile viewport dimensions for final runtime bounding-box and safe-zone verification.

### Recommended Rebuild Order

1. Shared coordinate system
2. Compass center and dimensions
3. Platform Orbit radii
4. Platform Token placement
5. Query Pill placement
6. Responsive overrides
7. Needle target integration
8. Overlap and safe-zone validation
9. Animation verification

## 16. Runtime Measurement Report

### Measurement status and reference conditions

The source code values below are documented facts. Browser-computed rectangles are not viewport-independent: they change with viewport width/height, animation timestamp, pointer state, focus state, reduced-motion preference, font-load completion, document direction, and mobile browser chrome. No canonical runtime viewport or capture timestamp is defined by the current implementation.

The in-app browser was unavailable during this documentation pass. Consequently, no `getBoundingClientRect()` result is presented as measured. Every unavailable browser value is explicitly marked **Needs Runtime Browser Measurement** rather than inferred from source formulas.

For a reproducible capture, the runtime record must include:

- `window.innerWidth`, `window.innerHeight`, `window.devicePixelRatio`, `document.dir`, and `document.fonts.status`.
- `prefers-reduced-motion`, pointer active/inactive state, and the `performance.now()` timestamp used by the orbital loop.
- Whether any object has `.is-focused` and the computed styles for `transform`, `translate`, and `scale`.
- One synchronized DOM evaluation so all object rectangles belong to the same animation frame.

### Source Code Values

| Runtime target | Source-defined value |
|---|---|
| Platform layout height | `34px`; mobile visual scale `.8`; focused multiplier `1.06` outside reduced motion |
| Platform layout width | `52px + rendered Thmanyah Sans Medium label width` |
| Query layout height | `24px`; focused scale `1.04` outside reduced motion |
| Query layout width | `30px + rendered Thmanyah Sans Regular text width` |
| Object transform | `translate(calc(var(--orbit-x) - 50%), calc(var(--orbit-y) - 50%))` |
| Mobile platform scale | individual `scale: .8`; focused `.848`; reduced motion `.8` |
| Query scale | `1`; focused `1.04`; reduced motion `1` |
| Mobile query translation | individual `translate: 0 -180px` |
| Compass layout box | Desktop `420×420px`; tablet `380×380px`; mobile `min(55vw,240px)` square |
| Ecosystem layout box | Same border box as `.layer-ecosystem`: width `PW`, height `VH - 20px` |

### Browser Computed Values — Platform Tokens

Each row refers to `document.querySelector('.platform-token[aria-label="…"]')`. `final transform` means `getComputedStyle(element).transform` together with the individual transform properties `translate` and `scale`, because the implementation uses both the legacy `transform` property and individual `scale`.

| Platform Token | Width | Height | Center X | Center Y | Left | Top | Right | Bottom | Final transform | Final computed scale |
|---|---|---|---|---|---|---|---|---|---|---|
| ChatGPT | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Claude | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Gemini | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Copilot | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Perplexity | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Midjourney | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Notion AI | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Jasper | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Hugging Face | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Runway | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| xAI | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Synthesia | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |

### Browser Computed Values — Query Pills

Each row refers to the matching `.query-pill[aria-label="…"]`. Because all pills orbit continuously, measurements from different frames are not interchangeable.

| Query Pill | Width | Height | Center X | Center Y | Left | Top | Right | Bottom | Final transform | Final computed scale |
|---|---|---|---|---|---|---|---|---|---|---|
| أفضل مطعم في الرياض | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| أفضل شركة تشطيب في الرياض | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Best ERP company in Saudi Arabia | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| أفضل مستشفى أطفال في جدة | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| best marketing agency Dubai | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| شركة برمجيات موثوقة في الكويت | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Top real estate broker in Qatar | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| عيادة تجميل وليزر في البحرين | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Top logistics company in MENA | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| أفضل منصة تجارة إلكترونية | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| AI automation for startups | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |
| Legal services in Muscat | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** |

### Browser Computed Values — Component Bounds

| Component | Source Code Values | Rendered width/height | Rendered center X/Y | Rendered left/top/right/bottom | Final transform/scale |
|---|---|---|---|---|---|
| `.compass` | Square `--compass-size`; flex-centered in `.layer-compass` | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | `.compass` itself has no transform/scale; its ancestor and SVG do. Browser values **Need Runtime Browser Measurement** |
| `.ecosystem` | Absolute `inset:0` inside `.layer-ecosystem` | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Ancestor layer transform **Needs Runtime Browser Measurement** |

## 17. Visual Bounding Map

Visual width/height and bounding boxes must come from a synchronized runtime frame. Distance from Compass center is the Euclidean distance between the measured object center and measured `.compass` center. Distance from nearest peer is the minimum edge-to-edge rectangle distance, not merely center-to-center distance. `Safe Radius` means the minimum center separation required to avoid rectangle intersection at that captured state; it depends on the two objects' widths, heights, relative bearing, and scales.

### Platform Token visual footprints

| Platform Token | Visual Width | Visual Height | Bounding Box | Distance from Compass Center | Distance from nearest Platform Token | Collision Risk | Safe Radius | Current Orbit Radius | Recommended Runtime Bounding Reference |
|---|---|---|---|---|---|---|---|---:|---|
| ChatGPT | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | Desktop/tablet 230; mobile 380 | `.platform-token[aria-label="ChatGPT"]` rect + computed transform/scale |
| Claude | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 210; mobile 320 | `.platform-token[aria-label="Claude"]` rect + computed transform/scale |
| Gemini | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 230; mobile 380 | `.platform-token[aria-label="Gemini"]` rect + computed transform/scale |
| Copilot | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 210; mobile 300 | `.platform-token[aria-label="Copilot"]` rect + computed transform/scale |
| Perplexity | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 230; mobile 340 | `.platform-token[aria-label="Perplexity"]` rect + computed transform/scale |
| Midjourney | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 210; mobile 320 | `.platform-token[aria-label="Midjourney"]` rect + computed transform/scale |
| Notion AI | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 230; mobile 380 | `.platform-token[aria-label="Notion AI"]` rect + computed transform/scale |
| Jasper | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 210; mobile 300 | `.platform-token[aria-label="Jasper"]` rect + computed transform/scale |
| Hugging Face | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 230; mobile 340 | `.platform-token[aria-label="Hugging Face"]` rect + computed transform/scale |
| Runway | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 210; mobile 300 | `.platform-token[aria-label="Runway"]` rect + computed transform/scale |
| xAI | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 230; mobile 360 | `.platform-token[aria-label="xAI"]` rect + computed transform/scale |
| Synthesia | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; requires synchronized peer rectangles | **Needs Runtime Browser Measurement** | 210; mobile 340 | `.platform-token[aria-label="Synthesia"]` rect + computed transform/scale |

### Query Pill visual footprints

| Query Pill | Visual Width | Visual Height | Bounding Box | Distance from Compass Center | Distance from nearest Query Pill | Collision Risk | Safe Radius | Current Orbit Radius | Recommended Runtime Bounding Reference |
|---|---|---|---|---|---|---|---|---:|---|
| أفضل مطعم في الرياض | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic across full orbit and hero safe zones | **Needs Runtime Browser Measurement** | 395 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| أفضل شركة تشطيب في الرياض | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic across full orbit and hero safe zones | **Needs Runtime Browser Measurement** | 365 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| Best ERP company in Saudi Arabia | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; long text enlarges horizontal footprint | **Needs Runtime Browser Measurement** | 395 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| أفضل مستشفى أطفال في جدة | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic across full orbit and hero safe zones | **Needs Runtime Browser Measurement** | 365 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| best marketing agency Dubai | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; long text enlarges horizontal footprint | **Needs Runtime Browser Measurement** | 395 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| شركة برمجيات موثوقة في الكويت | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; long text enlarges horizontal footprint | **Needs Runtime Browser Measurement** | 365 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| Top real estate broker in Qatar | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; long text enlarges horizontal footprint | **Needs Runtime Browser Measurement** | 395 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| عيادة تجميل وليزر في البحرين | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic across full orbit and hero safe zones | **Needs Runtime Browser Measurement** | 365 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| Top logistics company in MENA | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; long text enlarges horizontal footprint | **Needs Runtime Browser Measurement** | 395 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| أفضل منصة تجارة إلكترونية | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic across full orbit and hero safe zones | **Needs Runtime Browser Measurement** | 365 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| AI automation for startups | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic; long text enlarges horizontal footprint | **Needs Runtime Browser Measurement** | 395 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |
| Legal services in Muscat | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | **Needs Runtime Browser Measurement** | Dynamic across full orbit and hero safe zones | **Needs Runtime Browser Measurement** | 365 | Matching `.query-pill[aria-label]` rect + computed transform/translate/scale |

The current orbit radius is a source-space radius before responsive scaling. It is not interchangeable with measured distance from Compass center because layer-center mismatch, responsive scale, parallax, short-mobile Y offset, mobile query translation, and object transforms all affect the rendered result.

## 18. Optical Weight Analysis

### Center definitions

- **Visual Center:** the rendered center of the visible Ecosystem field as perceived from all rings, tokens, pills, clipping, opacity, and surrounding page content. Its current numeric coordinate **Needs Runtime Browser Measurement** at a declared viewport and animation frame.
- **Mathematical Center:** the coordinate origin used by a geometry system. The Compass/ring center is the flex center of `.layer-compass`; the object-orbit mathematical center is based on `(window.innerWidth/2, window.innerHeight/2)` inside `.layer-ecosystem`. Their exact source-derived separation is documented in Section 9.
- **Optical Center:** the perceptual center of mass after weighting each visible object's footprint, opacity, text density, icon shape, clipping, focus state, and contrast. Its current numeric coordinate **Needs Runtime Browser Measurement** plus an explicit weighting model.

The optical center can differ from the average coordinate center because a wide pill and a narrow token contribute equal weight to a simple center-point average but do not occupy equal visual area. Likewise, an object at opacity `.12` does not contribute the same visual mass as a focused object at opacity `1`, even if their rectangles are identical.

### Width-weighted balance

Platform boxes have a fixed 52px structural contribution plus variable label width. Query pills have a fixed 30px structural contribution plus variable Arabic or English text width. Consequently, label length and font shaping shift width-weighted balance toward the sectors occupied by longer strings. The current width-weighted center **Needs Runtime Browser Measurement** after fonts finish loading and must be evaluated at one synchronized frame.

### Area-weighted balance

Platform layout height is 34px and query height is 24px, but widths remain content-dependent. Mobile platform scale reduces visual area to `.8² = .64` of the unscaled rectangle outside focus. Focus scaling changes area again. The current area-weighted center **Needs Runtime Browser Measurement** because actual widths, focus state, transforms, and clipping are runtime-dependent.

### Opacity-weighted balance

Current ambient opacity is `.55` for all platform tokens, `.22` for desktop/tablet query pills, and `.12` for mobile query pills. Focus raises platforms to `1`, queries to `1` on desktop/tablet, and queries to `.2` on mobile. Therefore platform tokens dominate opacity-weighted mass, particularly on mobile. Which sector gains additional focus weight changes continuously with needle alignment. The numeric opacity-weighted center **Needs Runtime Browser Measurement** at the selected timestamp.

### Text-length and large-token influence

Long labels such as “Hugging Face” and “Midjourney” create wider platform footprints than short labels such as “xAI.” Long English and Arabic query strings create substantially wider horizontal footprints than the fixed 24px pill height. These objects exert more width- and area-weighted influence than their mathematical center points indicate. Exact relative influence depends on Thmanyah Sans glyph metrics and therefore **Needs Runtime Browser Measurement**.

### Empty-sector analysis

Desktop/tablet source phases distribute platform centers every 30 degrees and query centers every 30 degrees with a 15-degree offset, but alternating radii, unequal rectangles, continuous counter-rotation, clipping, and opacity prevent the visible field from being a uniform circle. Mobile platforms use irregular custom phases and radii; mobile queries retain regular phases but are translated 180px upward. Empty sectors therefore change over time and by breakpoint. Their angular spans and visible areas **Need Runtime Browser Measurement** from a synchronized set of object bounds.

### Upper versus lower visual weight

The object-orbit mathematical origin is 10px below the Compass center. On mobile, query pills are visually translated 180px upward. On short mobile, platform positions add 64px downward while both component layers move an additional 50px upward relative to normal mobile. These source facts bias different object families in different vertical directions. The current upper/lower visual-weight ratio **Needs Runtime Browser Measurement** because animation phase, clipping, focus opacity, auto widths, and hero occlusion determine the visible mass.

### Left versus right visual weight

Desktop RTL shifts both layers left by `15vw`; LTR shifts them right by `15vw`. Within the Ecosystem, unequal label widths and multilingual pill widths mean symmetric center coordinates do not imply symmetric occupied area. Above a 1280px viewport, the window-based orbital X origin also sits `(VW-1280)/2` to the right of the Compass center. The current left/right visual-weight ratio **Needs Runtime Browser Measurement** at the target viewport and direction.

### Current-state summary

The mathematical center is fully source-defined. The visual and optical centers are stateful measurements, not constants: they vary with breakpoint, viewport dimensions, animation time, pointer/focus state, font metrics, opacity, and clipping. Section 9's mobile platform center-point mean `(5.38px, 6.09px)` is an arithmetic coordinate result only; it is not a width-, area-, or opacity-weighted optical-center measurement.

## 19. Re-Engineering Blueprint Inputs

This section enumerates the complete input contract a future implementation specification must carry forward. It records required inputs only and does not change the current design.

### Shared coordinate system

- Viewport definitions: `VW`, `VH`, `100dvh`, device-pixel ratio, and mobile browser-chrome behavior.
- Canvas rule: fixed `.page-experience`, `width:100%`, `max-width:1280px`, centered margin, `height:100dvh`, and `overflow:hidden`.
- Local-to-screen coordinate conversion using `PX`, layer structural `top:20px`, and breakpoint layer transforms.
- SVG coordinate conventions: Ecosystem `-1000 -1000 2000 2000`; Compass `-200 -200 400 400`; positive screen Y points downward.
- Angle convention: orbital zero points right, increasing angles move clockwise on screen, needle display applies `+90°`.

### Component centers

- Compass/ring center formula from the transformed flex layer.
- JS object-orbit center from `window.innerWidth/2` and `window.innerHeight/2` in layer-local coordinates.
- Known center deltas: horizontal wide-canvas mismatch and vertical `+10px` object-origin offset.
- Mobile platform `+64px` short-height center offset and query visual `-180px` translation.

### Wrapper hierarchy

- Exact page, layer, Ecosystem, rings, objects, Compass, stage, SVG, navigation, token, pill, icon, and label hierarchy from Section 2.
- Positioning modes, containing blocks, containment, pointer-events inheritance, clipping boundary, paint order, and z-index variables.
- Direction-sensitive transforms for RTL and LTR.

### Platform Token dataset

- Stable array order and all 12 `id`, `name`, and unused `iconLabel` values.
- Inline icon SVG geometry keyed by `id`.
- Generated desktop/tablet radius and phase formulas.
- Explicit per-platform mobile radius and phase values.
- Shared speed `.5`, depth `.75`, layer `near`, ambient/focused opacity, label typography, padding, gap, border, icon box, and scales.
- Data-attribute names consumed by `initEcosystem`.

### Query Pill dataset

- Stable array order, exact 12 query strings, language, and derived text direction.
- Alternating radius formula, 15-degree phase offset, speed `-.3`, depth `.25`, and layer `far`.
- Typography, padding, border, ambient/focused opacity, focus scale, mobile opacity, and mobile translation.
- Data-attribute names consumed by `initEcosystem`.

### Runtime measurements

- One measurement record per canonical desktop, tablet, mobile, and short-mobile viewport.
- Synchronized `getBoundingClientRect()` output for every token, every pill, `.compass`, `.ecosystem`, both layers, Hero Content, Header, and Footer.
- Computed `transform`, `translate`, `scale`, opacity, font family, font size, and font-load state.
- Capture metadata: viewport, DPR, direction, timestamp, pointer/focus state, and reduced-motion state.
- Center coordinates calculated from each measured rectangle.

### Visual bounding data

- Visual width/height and full rectangle for every object.
- Center-to-Compass distance, center-to-peer distance, and edge-to-edge nearest-neighbor distance.
- Clipped versus unclipped rectangle portions at the page boundary.
- Focused and ambient footprints where scale differs.
- Safe radius definition and captured value for each object/neighbor bearing.

### Optical balancing data

- Declared mathematical, visual, and optical center definitions.
- Width-, area-, and opacity-weighting formulas.
- Font-resolved text widths and object-area weights.
- Visible-area adjustment for viewport clipping and occlusion by higher layers.
- Upper/lower and left/right totals at each canonical capture.
- Empty-sector angular spans and the timestamp/state used to compute them.

### Animation inputs

- Base period `80000ms`, per-family speeds, direction, shared timestamp, and RAF lifecycle.
- Responsive orbit scale function, platform mobile multiplier, parallax strength/depth, and pointer range.
- Focus threshold `.22rad`, focus class behavior, opacity/scale transition durations, and easing tokens.
- Compass breathe keyframes, duration, easing, iteration, and reduced-motion override.
- Visibility pause/resume and Astro page-swap cleanup behavior.

### Compass geometry

- CSS size expressions for all breakpoints and SVG-unit-to-CSS-pixel conversion.
- Every ring radius/stroke/opacity, axis endpoint, cardinal/intercardinal tick, graduation mark, hub radius, and fill.
- Needle shaft, tip, counterweight, pivot, transform origin, and `+90°` rendering offset.
- Signal base, rest/max extension, endpoint circles, stroke values, and dynamic attribute targets.
- Deep/mid/core layer opacity and SVG tilt perspective.

### Needle targeting inputs

- Pointer tracking element and bounding-area normalization.
- Pointer angle, active/inactive state transitions, tilt targets, signal-distance mapping, and inertia parameters.
- Desktop/tablet ambient DOM order and 4-second switch cadence.
- Mobile platform index order and 6-second switch cadence.
- Mobile target-coordinate scaling and short-mobile Y offset.
- Shortest-path angular inertia and the exposed angle used by Ecosystem focus detection.
- Reduced-motion snapping behavior as currently implemented.

### Responsive rules

- Exact breakpoint thresholds: 1200px, 768px, and the 700px short-mobile height condition.
- Canvas dimensions, layer transforms, Compass sizes, orbit scales/radii, token scale, query translation/opacity, and target cadence per breakpoint.
- Normal-motion versus reduced-motion position formulas at every breakpoint.

### Safe zones

- Runtime rectangles for Header, Hero title, description, CTA group, Footer, Compass, and page clipping boundary.
- Definition of whether overlap means rectangle intersection, visible-alpha intersection, or minimum clearance.
- Per-breakpoint and per-direction safe-zone coordinate rectangles.
- Current mobile query translation and higher-layer occlusion rules.

### Collision constraints

- Object-to-object intersection rule using transformed runtime rectangles.
- Minimum platform-to-platform, query-to-query, and platform-to-query clearances if specified by the future implementation document.
- Compass exclusion geometry and relationship to focused object scale.
- Full-orbit temporal sampling interval sufficient for 160s and 266.667s periods.
- Font-loading, resize, pointer parallax, focus, reduced-motion, clipping, and short-mobile states included in collision validation.

### Validation checklist

- Confirm dataset count/order and every data attribute.
- Confirm wrapper containing blocks, shared layer transforms, z-indexes, and clipping.
- Confirm Compass and orbit centers against the documented formulas.
- Confirm all desktop/tablet/mobile phases, radii, scales, offsets, and directions.
- Confirm runtime bounds only after fonts load and within one synchronized frame.
- Confirm pointer, ambient targeting, shortest-path rotation, signal stretch, focus threshold, and target cadence.
- Confirm normal and reduced-motion geometry separately.
- Confirm RTL/LTR, desktop, tablet, mobile, and short-mobile capture matrices.
- Confirm object, Compass, Header, Hero Content, CTA, Footer, and viewport-boundary intersections.
- Confirm that measured visual and optical centers identify their weighting model and capture state.

## 20. Dependency Graph

### Architectural dependency edges

The table records dependencies among the requested files. Imports routed through `src/scripts/motion/index.js` are identified as barrel-mediated even though the implementing dependency terminates in `pointer.js`, `orbital.js`, `inertia.js`, or `reduced-motion.js`.

| Source component | Target component | Dependency type | Direction | Why the dependency exists | What breaks if it changes |
|---|---|---|---|---|---|
| `src/styles/tokens.css` | `src/styles/layout.css` | Layout / Rendering | Tokens → layout | Supplies `--z-background`, `--z-ecosystem`, `--z-compass`, `--z-content`, `--z-header`, `--z-footer`, and spacing values consumed by global layout selectors. | Layer order and shared spacing become unresolved or change globally. |
| `src/styles/tokens.css` | `src/components/PlatformToken.astro` | Rendering / Motion | Tokens → PlatformToken | Supplies colors, radii, font family/size/weight, transition durations, and easing. | Token appearance, dimensions, opacity transitions, and font metrics change or become unresolved. |
| `src/styles/tokens.css` | `src/components/QueryPill.astro` | Rendering / Motion | Tokens → QueryPill | Supplies colors, radii, typography, transition durations, and easing. | Pill appearance, dimensions, and focus transitions change or become unresolved. |
| `src/styles/tokens.css` | `src/components/Compass.astro` | Geometry / Rendering / Motion | Tokens → Compass | Defines `--compass-size` at all breakpoints plus colors, typography, z-index, easing, and focus styles. | Compass CSS size, SVG unit-to-pixel mapping, breathing easing, or hidden-navigation rendering changes. |
| `src/styles/animations.css` | `src/components/Compass.astro` | Motion / Rendering | Animations → Compass | Defines the `breathe` keyframes named by `.compass__svg`. | The declared Compass animation references a missing or changed keyframe. |
| `src/styles/animations.css` | `src/components/PlatformToken.astro` | Motion | Animations → PlatformToken | The global reduced-motion selector forces animation/transition durations and iteration counts for every element. | Reduced-motion timing behavior differs from the page-wide policy. |
| `src/styles/animations.css` | `src/components/QueryPill.astro` | Motion | Animations → QueryPill | The global reduced-motion selector supplements component-specific transition removal. | Reduced-motion timing behavior differs from the page-wide policy. |
| `src/styles/layout.css` | `src/pages/index.astro` | Layout | Layout → page markup | Defines `.page-experience` and every `.layer-*` class rendered by the homepage. | The page loses its fixed canvas, containing blocks, clipping, stacking, or pointer-event defaults. |
| `src/styles/layout.css` | `src/components/Ecosystem.astro` | Layout / Geometry | Layout → Ecosystem | `.layer-ecosystem` establishes the containing block, height, top inset, containment, and z-index for `.ecosystem`. | Ecosystem local coordinates, clipping relationship, and stacking change. |
| `src/styles/layout.css` | `src/components/Compass.astro` | Layout / Geometry | Layout → Compass | `.layer-compass` establishes the flex-centered containing block, top inset, z-index, and pointer-event surface. | Compass center, pointer tracking rectangle, and layer order change. |
| `src/pages/index.astro` | `src/components/Ecosystem.astro` | Rendering | Page → Ecosystem | Imports and renders one `<Ecosystem />` inside `.layer-ecosystem`. | No Ecosystem DOM, data attributes, rings, tokens, or pills are produced. |
| `src/pages/index.astro` | `src/components/Compass.astro` | Rendering | Page → Compass | Imports and renders one `<Compass />` inside `.layer-compass`. | No Compass DOM or SVG targets exist for `compass.js`. |
| `src/pages/index.astro` | `src/styles/layout.css` | Layout | Page selectors → global layer rules | Its markup supplies the class names consumed by `layout.css`; its scoped media rules add transforms to those same global classes. | Renamed or removed layer classes disconnect global layout and page-specific transforms. |
| `src/pages/index.astro` | `src/styles/tokens.css` | Layout / Geometry | Page inheritance → tokens | The rendered tree inherits root custom properties, including layer z-indexes and Compass size. | CSS custom properties used by descendants become unresolved or differ. |
| `src/pages/index.astro` | `src/scripts/pointer.js` | Runtime / State | Page bootstrap → pointer | Calls barrel-exported `createPointerTracker` with `.layer-compass` or the document root fallback. | Pointer state, normalized coordinates, angle, and cleanup are unavailable. |
| `src/pages/index.astro` | `src/scripts/compass.js` | Runtime / Motion | Page bootstrap → Compass runtime | Imports `initCompass`, passes SVG/needle/signal elements and pointer/ambient getters, and calls `destroy()` on swap. | Needle, tilt, signal, target following, and lifecycle cleanup stop. |
| `src/pages/index.astro` | `src/scripts/ecosystem.js` | Runtime / Motion | Page bootstrap → Ecosystem runtime | Imports `initEcosystem`, passes `.ecosystem__objects`, the live Compass angle getter, and pointer coordinates. | Objects remain at CSS fallback positions; orbit, parallax, focus, and ambient angle stop. |
| `src/components/Ecosystem.astro` | `src/components/PlatformToken.astro` | Data / Rendering | Ecosystem → PlatformToken | Maps each distributed platform object into `PlatformToken` props and DOM data attributes. | Platform tokens or their orbit metadata are absent or malformed. |
| `src/components/Ecosystem.astro` | `src/components/QueryPill.astro` | Data / Rendering | Ecosystem → QueryPill | Maps each distributed query object into `QueryPill` props and DOM data attributes. | Query pills or their orbit metadata are absent or malformed. |
| `src/components/Ecosystem.astro` | `src/scripts/ecosystem.js` | Data / Runtime | Rendered DOM → Ecosystem runtime | Produces `.ecosystem__objects` and the `[data-orbit-radius]` elements parsed at initialization. | `initEcosystem` cannot discover objects or construct orbital descriptors. |
| `src/components/PlatformToken.astro` | `src/scripts/ecosystem.js` | Data / State / Rendering | Token DOM → Ecosystem runtime | Exposes platform kind, regular/mobile radius, regular/mobile phase, speed, and depth; accepts `--orbit-x/y` and `.is-focused`. | Mobile platform selection, position calculation, focus styling, or platform filtering becomes incorrect. |
| `src/components/QueryPill.astro` | `src/scripts/ecosystem.js` | Data / State / Rendering | Pill DOM → Ecosystem runtime | Exposes radius, phase, speed, and depth; accepts `--orbit-x/y` and `.is-focused`. | Query orbit position and alignment focus become incorrect. |
| `src/components/Compass.astro` | `src/scripts/compass.js` | Geometry / Rendering / Runtime | Compass DOM → Compass runtime | Supplies `.compass__svg`, `.compass__needle`, and signal elements that the script mutates. | Selector lookup fails or the script cannot render needle, tilt, or signal state. |
| `src/components/Compass.astro` | `src/styles/animations.css` | Motion | Compass style → named keyframes | `.compass__svg` refers to `animation: breathe`. | A renamed keyframe leaves the animation declaration nonfunctional. |
| `src/scripts/ecosystem.js` | `src/scripts/orbital.js` | Geometry / Motion | Ecosystem runtime → orbit math | Calls barrel-exported `createOrbital`, `parallaxOffset`, and `isAligned`. | Object coordinates, parallax offsets, ambient angles, and focus detection cannot be calculated consistently. |
| `src/scripts/ecosystem.js` | `src/scripts/pointer.js` | Runtime / Motion | Ecosystem runtime → RAF utility | Calls barrel-exported `createAnimationLoop`. | Per-frame orbit updates, visibility pause/resume, and loop cleanup stop. |
| `src/scripts/ecosystem.js` | `src/scripts/reduced-motion.js` | State / Motion | Ecosystem runtime → motion preference | Reads the initial preference and subscribes to changes. | Static reduced-motion positioning and mode changes are not applied. |
| `src/scripts/compass.js` | `src/scripts/inertia.js` | Motion / State | Compass runtime → inertia | Calls barrel-exported `createAngleInertia` and `createInertia`. | Shortest-path needle motion, tilt smoothing, and signal smoothing stop or change. |
| `src/scripts/compass.js` | `src/scripts/pointer.js` | Runtime / Motion | Compass runtime → RAF utility | Calls barrel-exported `createAnimationLoop`. | Per-frame needle/tilt/signal updates and visibility handling stop. |
| `src/scripts/compass.js` | `src/scripts/reduced-motion.js` | State / Motion | Compass runtime → motion preference | Reads/subscribes to reduced-motion state and resets motion values when it activates. | Reduced-motion Compass behavior and live preference changes stop. |
| `src/scripts/pointer.js` | `src/pages/index.astro` | State / Runtime | Pointer state → page getter closures | Exposes live getters `x`, `y`, `angle`, and `isActive`; page passes them into both systems. | Compass and Ecosystem no longer share the same pointer state. |
| `src/scripts/orbital.js` | `src/scripts/ecosystem.js` | Geometry / State | Orbit results → Ecosystem state | Returns `x(t)`, `y(t)`, `angle(t)`, parallax offsets, and alignment booleans. | Ecosystem cannot write final coordinates or focus classes. |
| `src/scripts/inertia.js` | `src/scripts/compass.js` | State / Motion | Inertial state → Compass rendering | Returns live values, velocities, target setters, update methods, and snap behavior. | Compass rendering loses its current smoothed state. |
| `src/scripts/reduced-motion.js` | `src/scripts/ecosystem.js` | State | Media query → Ecosystem | Supplies current and changed `prefers-reduced-motion` values. | Ecosystem mode cannot follow the user preference. |
| `src/scripts/reduced-motion.js` | `src/scripts/compass.js` | State | Media query → Compass | Supplies current and changed `prefers-reduced-motion` values. | Compass mode cannot follow the user preference. |
| `src/scripts/ecosystem.js` | `src/scripts/compass.js` | State / Motion | Ecosystem ambient angle → Compass target | `ecosystemInstance.ambientAngle` is exposed through a getter passed to `initCompass`. | Inactive-pointer needle targeting has no Ecosystem target. |
| `src/scripts/compass.js` | `src/scripts/ecosystem.js` | State / Motion | Compass angle → Ecosystem focus | `compass.angle` is exposed through a getter passed to `initEcosystem`. | `.is-focused` cannot follow needle alignment. |

`compass.js` also consumes `clamp` and `mapRange` from `src/scripts/motion/lerp.js` through the barrel, and `PlatformToken.astro` consumes `PlatformIcon.astro`. Those files are outside the requested graph list but remain direct implementation dependencies documented in Section 1.

### Dependency execution order

1. The browser parses `BaseLayout.astro` output and loads `global.css`; its import order loads `tokens.css`, typography, `animations.css`, then `layout.css` before component-scoped styles participate in the rendered page.
2. `index.astro` has already server-rendered the fixed homepage canvas, `.layer-ecosystem`, `.layer-compass`, one Ecosystem instance, and one Compass instance.
3. `Ecosystem.astro` has generated platform/query data, rendered all object data attributes, and rendered the ring SVG.
4. `Compass.astro` has rendered the complete Compass SVG and hidden navigation destinations in the authored neutral state.
5. The homepage module imports `compass.js`, `ecosystem.js`, and the barrel-exported pointer utility.
6. On `DOMContentLoaded`, `index.astro` queries the Compass SVG/needle/signal nodes and `.ecosystem__objects`. Initialization stops if the required SVG, needle, or object container is missing.
7. `createPointerTracker` measures `.layer-compass`, attaches five window listeners, and exposes live pointer getters.
8. `initCompass` reads reduced-motion state, creates angle/scalar inertia state, subscribes to motion-preference changes, and starts its RAF loop. Its ambient getter exists but returns `null` until `ecosystemInstance` is assigned.
9. `initEcosystem` reads all orbit data attributes, creates regular/mobile orbital descriptors, filters platform descriptors, subscribes to motion-preference changes, attaches resize handling, and starts its RAF loop.
10. Each Compass frame consumes pointer and ambient state, updates or snaps inertia, mutates needle/signal/SVG rendering, and exposes the current needle angle.
11. Each Ecosystem frame consumes pointer and Compass angle, selects the current ambient target, calculates object positions, writes `--orbit-x/y`, and updates `.is-focused` outside its reduced branch.
12. CSS composes layer transforms, object transforms, individual translate/scale, opacity, and SVG animation into final paint. Both RAF loops continue until visibility pause, Astro swap cleanup, or page termination.

## 21. Runtime Data Flow

### End-to-end pipeline

| Stage | Input | Output / produced values | Responsible file and function | Consumed by | Runtime frequency | Dependencies |
|---:|---|---|---|---|---|---|
| 1. Root style resolution | CSS imports and `:root` declarations | Color, size, spacing, duration, easing, z-index, and `--compass-size` custom properties | `tokens.css`; `global.css` import order | Layout and all four Astro components | Style initialization; recalculated when media-query state/viewport changes | CSS cascade and breakpoint match |
| 2. Canvas construction | Viewport and server-rendered markup | Fixed `.page-experience` border box, centered width cap, `100dvh` height, clipping boundary | `layout.css` `.page-experience`; `index.astro` markup | All homepage layers | Initial layout and viewport-driven reflow | `VW`, `VH`, CSS containing-block rules |
| 3. Layer construction | Canvas border box | Absolute `.layer-ecosystem` and `.layer-compass` boxes with top inset, z-index, pointer behavior, and containment | `layout.css`; `index.astro` media rules | Ecosystem and Compass wrappers; pointer tracker | Initial layout and breakpoint/viewport change | Direction, width/height media queries |
| 4. Static Ecosystem data generation | Platform/query arrays and array indexes | 12 distributed platform records, 12 distributed query records, regular/mobile radii/phases, speeds, depths, layers | `Ecosystem.astro` frontmatter | `PlatformToken`, `QueryPill`, rendered DOM | Build/server render only | Array order and distribution formulas |
| 5. Static object rendering | Distributed records | 24 absolute elements with orbit data attributes, labels/icons, CSS classes, and source-defined box styles | `Ecosystem.astro`; `PlatformToken.astro`; `QueryPill.astro` | `initEcosystem`; CSS renderer | Build/server render; style recalculation as needed | Component props, token variables, fonts |
| 6. Static Compass rendering | Inline SVG source geometry | SVG rings, marks, hub, neutral needle, signal, and hidden navigation nodes | `Compass.astro` | `initCompass`; CSS renderer | Build/server render | `--compass-size`, SVG viewBox |
| 7. DOM target discovery | `document` after `DOMContentLoaded` | References to SVG, needle, signal elements, object container, and Compass layer | `index.astro` DOMContentLoaded handler | Pointer, Compass, Ecosystem initializers | Once per page initialization | Exact selector/class continuity |
| 8. Pointer tracking initialization | `.layer-compass` element | Cached tracking rectangle; live `x`, `y`, `angle`, `isActive`; cleanup function | `pointer.js:createPointerTracker` | Getter closures passed to both runtime systems | Once; area refreshed on resize; state changes on move/leave/touch | Layer bounding box, window events |
| 9. Initial Compass state | SVG references, pointer getter, ambient getter, reduced-motion query | Needle angle `-π/2`; tilt X/Y `0`; signal stretch `0`; subscription; RAF controller | `compass.js:initCompass` using `inertia.js`, `reduced-motion.js`, `pointer.js` | Compass frame renderer; Ecosystem angle getter | Once | DOM references and helper modules |
| 10. Initial Ecosystem state | Object container, pointer getter, Compass angle getter, viewport, reduced-motion query | `centerX`, `centerY`, responsive scale, platform scale/offset, 24 orbital descriptors, platform subset, target indexes, subscription, RAF controller | `ecosystem.js:initEcosystem` using `orbital.js`, `reduced-motion.js`, `pointer.js` | Ecosystem frame renderer; Compass ambient getter | Once; center/scale/offset refreshed on resize | Data attributes, array/DOM order, viewport |
| 11. Pointer event normalization | Mouse/touch client coordinates and cached tracking rectangle | `x` and `y` clamped to `[-.5,.5]`; `isActive`; derived `atan2(y,x)` angle | `pointer.js:onMove`, `normalizePointerCoord`, getters | Compass frame; Ecosystem parallax frame | Per pointer/touch event | Valid finite event coordinates and nonzero tracking area |
| 12. Responsive mode selection | `window.innerWidth`, `window.innerHeight` | `isMobile`; `S(VW)`; platform `.8` multiplier; optional `64px` offset | `ecosystem.js:getScaleFactor`, `getPlatformOrbitOffsetY`, frame and resize handlers | Orbit position and mobile target calculations | Every frame for `isMobile`; scale/offset variables on init/resize | 768px, 1200px, 700px thresholds |
| 13. Orbital angle calculation | Radius, phase, speed, depth, RAF timestamp | `angle(t) = phase + (t/80000)×speed×2π` | `orbital.js:createOrbital().angle/x/y` | Ambient selection and object coordinate calculation | Per object per Ecosystem frame as called | Shared RAF timestamp and base period |
| 14. Ambient target selection | Breakpoint, elapsed timestamp, descriptor order, current target index | `currentAmbientAngle`; desktop/tablet selected every 4s, mobile platform selected every 6s | `ecosystem.js` frame callback | `getAmbientAngle` closure in `compass.js` | Every Ecosystem frame; index changes by cadence | DOM order, mobile index list, responsive scaling/offset on mobile |
| 15. Compass target selection | Pointer state or `currentAmbientAngle` | Needle target; active speed/friction or ambient speed/friction; tilt and signal targets | `compass.js` frame callback | Inertial state | Every Compass frame | Pointer activity, breakpoint, initialized Ecosystem getter |
| 16. Compass inertia update | Current value, target, velocity, speed, friction | New needle angle, tilt X/Y, and signal-stretch values | `inertia.js:update`; `compass.js` frame callback | Compass draw functions; exposed `compass.angle` | Every non-reduced Compass frame | Shortest-angle normalization for needle |
| 17. Compass geometry rendering | Current inertial values | Needle SVG rotation; SVG perspective/tilt transform; signal `y2/cy` attributes | `compass.js:drawFull` or `drawNeedleOnly` | Browser SVG/CSS renderer; Ecosystem focus getter | Every Compass frame | Existing SVG target nodes; reduced-motion branch |
| 18. Active orbital selection | Object descriptor, breakpoint, platform flag | Regular orbit or mobile platform orbit; platform scale and offset | `ecosystem.js` object loop | Position branch and focus branch | Per object per Ecosystem frame | `data-orbit-kind`, mobile data attributes |
| 19. Raw object offset | Active orbit and RAF timestamp | `rawX = cos(angle)×radius`; `rawY = sin(angle)×radius` | `orbital.js:x/y` | Responsive scaling | Per object per Ecosystem frame | Phase, radius, speed |
| 20. Responsive object offset | Raw X/Y, `S(VW)`, platform multiplier | `ox`, `oy` in CSS pixels | `ecosystem.js` object loop | Final coordinate write; mobile focus angle | Per object per normal-motion frame | Breakpoint and object family |
| 21. Parallax offset | Pointer X/Y, object depth, strength `20` | `dx = pointer.x×depth×20`; `dy = pointer.y×depth×20` | `orbital.js:parallaxOffset` called by `ecosystem.js` | Final coordinate write | Per object per normal-motion frame | Shared pointer state and depth |
| 22. Final object coordinate | Window center, `ox/oy`, parallax, platform offset | `--orbit-x`; `--orbit-y` inline custom properties | `ecosystem.js` object loop | Platform/query CSS transform | Per object per frame; reduced branch uses its documented static formula | Window dimensions and all prior offset stages |
| 23. Focus-angle calculation | Current Compass angle and active object geometry | Object angle; `focused` boolean at threshold `.22rad` | `ecosystem.js` with `orbital.js:isAligned` | Element `.is-focused` class | Per object per normal-motion frame | Compass RAF state; mobile platform offset rule |
| 24. Object CSS composition | `--orbit-x/y`, layout box, breakpoint rules, focus class | Centering translation, mobile query translation, token/query scale, opacity, transitions | `PlatformToken.astro` and `QueryPill.astro` scoped CSS | Browser compositor/paint | Style/composite update after each JS write or state change | Font metrics, CSS transform model, media queries |
| 25. Compass CSS composition | SVG geometry, layer transform, `--compass-size`, JS SVG transform, `breathe` | Final Compass box and painted geometry | `layout.css`, `tokens.css`, `animations.css`, `Compass.astro` | Browser compositor/paint | Animation frame and CSS animation timeline | Breakpoint, reduced motion, layer transform |
| 26. Resize propagation | New `window.innerWidth/innerHeight` | Pointer area; Ecosystem center/scale/platform offset; CSS breakpoint and size resolution | `pointer.js:onResize`; `ecosystem.js:onResize`; CSS engine | Subsequent frames | Per window resize event/style recalculation | Window dimensions |
| 27. Reduced-motion propagation | Media-query initial/change event | `reduced` flags; snapped/reset Compass state; static Ecosystem positions; component transition/animation overrides | `reduced-motion.js`; both initializers; component/global CSS | Both loops and renderer | Once on subscription, then per preference change | `matchMedia` and CSS media query |
| 28. Teardown | `astro:before-swap` | RAF loops stopped; media subscriptions and event listeners removed | `index.astro`; returned `destroy()` functions | Browser lifecycle | Once per Astro page swap | Successful initialization references |

### Final rendered position chain

```text
window.innerWidth / innerHeight
→ fixed page canvas and transformed layer
→ JS window center
→ regular or mobile orbital descriptor
→ angle(t), raw radius vector
→ responsive orbit scale
→ pointer parallax
→ optional short-mobile platform Y offset
→ --orbit-x / --orbit-y
→ object transform with -50% self-centering
→ individual query translate or token/query scale
→ ancestor layer transform
→ page clipping and higher-layer occlusion
→ final painted rectangle: Needs Runtime Measurement
```

## 22. Canonical Coordinate System

### Canonical system definition

The canonical interchange system for future implementations **MUST be viewport CSS pixel coordinates**, designated `V`. This formalizes the coordinate space already used by `window.innerWidth`, `window.innerHeight`, pointer `clientX/clientY`, and `getBoundingClientRect()`.

- **Units:** CSS pixels.
- **Global origin `V(0,0)`:** top-left of the layout viewport.
- **Positive X:** right.
- **Positive Y:** down.
- **Screen point notation:** `V(x,y)`.
- **Runtime rectangle:** `{left, top, right, bottom, width, height}` in `V`, as returned by `getBoundingClientRect()`; actual values **Need Runtime Measurement**.

This canonical system does not replace component-local or SVG coordinates. It is the required common space into which every center, target, safe zone, and measured rectangle must be converted before cross-component comparison.

### Origins and local coordinate spaces

| Coordinate space | Origin | Units/axes | Current mapping to canonical `V` |
|---|---|---|---|
| Global/viewport `V` | Viewport top-left | CSS px; +X right, +Y down | Identity |
| Canvas `C` | `.page-experience` top-left | CSS px; same axes | `V = C + (PX,0)` before descendant transforms |
| Ecosystem layer `EL` | `.layer-ecosystem` untransformed border-box top-left | CSS px; same axes | `V = EL + (PX,20) + LayerTransform`; current border box after transform **Needs Runtime Measurement** |
| Compass layer `CL` | `.layer-compass` untransformed border-box top-left | CSS px; same axes | Same structural mapping as `EL` because both layers share layout and page transforms |
| Ecosystem object container `EO` | `.ecosystem__objects` top-left | CSS px; same axes | Coincident with `EL(0,0)` before the ancestor layer transform |
| Orbit mathematical space `O` | JS `(centerX,centerY)=(VW/2,VH/2)` inside `EO` | CSS px; +X right, +Y down | `V = (PX,20) + LayerTransform + (VW/2,VH/2) + orbit offsets` |
| Object local box `B` | Element border-box top-left before transform | CSS px | Authored at `EO(0,0)`; transformed so its center aligns with `--orbit-x/y`, then individual transforms apply |
| Ecosystem SVG `ES` | SVG viewBox origin at `(-1000,-1000)`; mathematical center `(0,0)` | SVG units; +X right, +Y down in rendered SVG | Default `xMidYMid meet` maps the 2000-square viewBox into `.ecosystem__rings`; exact CSS matrix **Needs Runtime Measurement** when wrapper aspect ratio is not square |
| Compass SVG `CS` | ViewBox top-left `(-200,-200)`; Compass origin `(0,0)` | SVG units; +X right, +Y down | Uniform scale `CompassSize/400`, translated to the CSS SVG center, then affected by SVG/ancestor CSS transforms |
| Pointer normalized `P` | Center of measured tracking area | Unitless; each axis `[-.5,.5]` | `P.x=(clientX-left)/width-.5`; `P.y=(clientY-top)/height-.5`; cross-component use is through angle, not direct CSS px |

### Required conversion rules

1. Convert canvas-local coordinates to `V` by adding the centered canvas offset `PX` and any vertical canvas offset; the current canvas vertical offset is zero.
2. Convert layer-local coordinates to `V` by adding canvas origin, the layer's structural `top:20px`, and the layer's active CSS transform.
3. Convert orbit offsets to `V` only after applying the current responsive orbit scale, platform multiplier, parallax, and platform Y offset.
4. Convert an object center to an object rectangle by using its runtime transformed bounds. Static text-box width is not a canonical value and **Needs Runtime Measurement**.
5. Convert Compass SVG points by applying the viewBox-to-CSS uniform scale and Compass CSS-box translation, followed by the live SVG tilt and ancestor layer transform. A live transformed point **Needs Runtime Measurement** or the current computed transform matrix.
6. Convert Ecosystem SVG points using the default meet matrix, including letterbox offsets when the wrapper is not square.
7. Compare Compass targets, object centers, visual bounds, and safe zones only after all operands are expressed in `V`.
8. Preserve radians for runtime angular state. Convert to degrees only at the SVG needle rendering boundary where `rotate(deg + 90)` is written.

### Transform and operation order

The position-production order is distinct from CSS transform composition:

1. Generate orbital angle from phase, time, and speed.
2. Generate radius vector in orbit space.
3. Apply responsive orbit scaling and the mobile platform multiplier.
4. Add pointer parallax.
5. Add the short-mobile platform Y offset when applicable.
6. Add the JS center and write `--orbit-x/y`.
7. Apply the object's legacy `transform: translate(calc(--orbit-x - 50%), calc(--orbit-y - 50%))`.
8. Compose CSS individual transform properties in the browser-defined order `translate`, `rotate`, `scale`, followed by the legacy `transform` property. Current objects define individual `translate` only for mobile queries, no individual `rotate`, and individual `scale` for tokens/focused queries.
9. Apply the ancestor `.layer-ecosystem` transform.
10. Apply clipping and stacking during paint.

For the Compass:

1. Resolve the Compass CSS box and center it with layer flex layout.
2. Map Compass SVG coordinates into the square CSS box.
3. Rotate `.compass__needle` about SVG `(0,0)` using the SVG transform attribute.
4. Mutate signal geometry in the rotated needle group.
5. Apply live CSS perspective/rotateX/rotateY to `.compass__svg`.
6. Compose the CSS `breathe` animation on the same `.compass__svg` transform property according to the active computed animation state; the exact live composed matrix **Needs Runtime Measurement**.
7. Apply the ancestor `.layer-compass` transform.

### Center mapping

| Center name | Definition in the canonical system | Relationship |
|---|---|---|
| Compass Center | `V(PX + PW/2 + Lx, VH/2 + 10 + Ly)` before live SVG tilt/breathe | Flex center of `.layer-compass`; also the Ecosystem ring SVG center |
| Orbit Center | `V(PX + VW/2 + Lx, VH/2 + 20 + Ly)` before family-specific offsets | JS origin used to place orbit objects |
| Mathematical Center | The declared origin of the system being discussed | For Compass/rings it is Compass Center; for JS objects it is Orbit Center; the term must identify which system |
| Visual Center | Center of the visible rendered Ecosystem footprint in `V` | **Needs Runtime Measurement** because clipping, animation, opacity, text metrics, and occlusion contribute |
| Optical Center | Weighted perceptual center in `V` under a declared weighting model | **Needs Runtime Measurement** and a stated width/area/opacity/visibility model |

Every future implementation **MUST use viewport CSS pixel space `V` as the canonical cross-component coordinate system**. Component-local, orbit, normalized pointer, and SVG coordinates may remain internal, but they must have explicit conversion functions or formulas to and from `V`. No future implementation may compare a layer-local orbit point directly with a viewport rectangle or an SVG point without conversion.

## 23. Engineering Constraints

### Architecture Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Architecture.SingleViewportCanvas` | `.page-experience` is fixed, inset 0, `100%` wide capped at 1280px, `100dvh`, overflow hidden | Establishes the homepage as one clipped composition | Every layer, center, visible orbit envelope | Critical | Yes |
| `Architecture.SiblingLayerModel` | Ecosystem and Compass are separate absolute sibling layers | Separates environmental objects from the guidance instrument | Stacking, pointer surface, independent rendering | Critical | Yes |
| `Architecture.SingletonComponents` | One `<Ecosystem />` and one `<Compass />` rendered by `index.astro` | Maintains one coordinated state pair | DOM queries, initialization, target/focus exchange | Critical | Yes |
| `Architecture.BidirectionalAngleContract` | Ecosystem exposes ambient angle; Compass exposes needle angle | Couples targeting and focus without merging components | Both runtime systems | Critical | Yes |
| `Architecture.DOMContentLoadedBootstrap` | Homepage initializes both systems in one handler | Ensures required DOM exists before queries | Runtime startup and cleanup references | High | Yes |

### Rendering Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Rendering.BorderBoxReset` | Universal `box-sizing:border-box` | Makes documented box formulas include padding/borders | Token/pill dimensions, canvas sizing | High | Yes |
| `Rendering.ObjectSelfCentering` | `translate(calc(--orbit-x - 50%), calc(--orbit-y - 50%))` from `left/top:0` | Centers variable-size objects on calculated points | Every token/pill position | Critical | Yes |
| `Rendering.InlinePlatformIcons` | Platform SVG selected by `id`, 24×24 viewBox, rendered in a 20×20 box | Keeps icon geometry addressable and tied to token data | PlatformToken rendering and width formula | Medium | Yes |
| `Rendering.RuntimePositionVariables` | JS writes `--orbit-x` and `--orbit-y` | Separates runtime coordinates from component box styles | Object transform/compositor path | Critical | Yes |
| `Rendering.FontDependency` | Thmanyah Sans Regular/Medium with `font-display:swap` | Determines multilingual label rendering | Auto widths, visual bounds, optical weight | High | Yes |
| `Rendering.PageClipping` | `.page-experience { overflow:hidden }`; body hides X overflow | Constrains the orbital composition to the page canvas | Visibility, collision observations, scroll behavior | Critical | Yes |

### Motion Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Motion.BaseOrbitPeriod` | `80000ms` at speed 1 | Common deterministic time basis | Platform/query revolution periods and ambient angles | High | Yes |
| `Motion.PlatformSpeed` | `.5` | Produces a 160s clockwise orbit | All platform positions and mobile target coordinates | High | Yes |
| `Motion.QuerySpeed` | `-.3` | Produces a 266.667s counterclockwise orbit | All query positions and desktop ambient targets | High | Yes |
| `Motion.SharedTimestamp` | RAF `time` passed into every orbital call | Keeps same-family phase relationships deterministic | Collision spacing and target alignment | Critical | Yes |
| `Motion.ParallaxStrength` | Strength `20`, multiplied by object depth and normalized pointer | Provides depth-dependent environmental response | Final object positions and collision envelope | High | Yes |
| `Motion.NeedleShortestPath` | `createAngleInertia` normalizes target difference to `[-π,π]` | Prevents long-way rotation | Needle behavior and focus traversal | Critical | Yes |
| `Motion.VisibilityLifecycle` | RAF pauses when hidden and resumes when visible | Controls runtime work and time-based updates | Both loops | High | Yes |
| `Motion.ReducedPreference` | JS and CSS both respond to `prefers-reduced-motion` | Provides the current reduced-motion mode | Compass, objects, transitions, breathing | Critical | Yes |

### Coordinate Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Coordinate.ViewportCenterInput` | Ecosystem uses `window.innerWidth/2`, `window.innerHeight/2` | Defines the current JS orbit origin | Every object position and mobile target angle | Critical | Yes |
| `Coordinate.LayerTopInset` | Ecosystem and Compass layers both override top to `20px` | Establishes their current vertical containing blocks | Center formulas and +10px orbit/Compass delta | Critical | Yes |
| `Coordinate.OrbitEquation` | `x=cos(angle)×radius`, `y=sin(angle)×radius` | Defines deterministic circular geometry | Every orbital descriptor | Critical | Yes |
| `Coordinate.ScreenYAxis` | Positive Y points downward | Matches CSS/SVG screen coordinates | Angle direction, placement, needle mapping | Critical | Yes |
| `Coordinate.NeedleDisplayOffset` | Rendered rotation is `angleDegrees + 90` | Maps authored up-pointing needle to mathematical angle zero at right | Needle visual alignment | Critical | Yes |
| `Coordinate.CanonicalInterchange` | Viewport CSS pixel space `V` as formalized in Section 22 | Gives cross-component comparisons one space | Rebuild, bounds, targets, safe zones | Critical | Yes |

### Layer Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Layer.EcosystemZ` | `--z-ecosystem:10` | Places environment behind Compass/content | All tokens, pills, rings | Critical | Yes |
| `Layer.CompassZ` | `--z-compass:20` | Places guidance above Ecosystem | Compass visibility and overlap | Critical | Yes |
| `Layer.ContentHeaderFooterOrder` | Content 30, Footer 40, Header 45 | Keeps page UI above both target components | Occlusion and interaction | Critical | Yes |
| `Layer.SharedTransform` | Both target layers receive identical desktop/mobile page transforms | Keeps their layer frames moving together | Relative center relationship | Critical | Yes |
| `Layer.PointerOwnership` | Ecosystem pointer events none; Compass layer pointer events auto | Gives tracking to Compass layer without object interaction | Pointer tracker and noninteractive objects | High | Yes |
| `Layer.QueryPaintOrder` | All query pills render after all platform tokens with auto z-index | Defines same-layer overlap paint order | Token/query visual overlap | High | Yes |

### Responsive Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Responsive.DesktopThreshold` | `1200px` | Selects desktop layer shift, orbit scaling branch, and 420px Compass resolution | Layout, coordinates, targeting | Critical | Yes |
| `Responsive.MobileThreshold` | `768px` boundary (`<768` JS; `max-width:767px` CSS) | Selects mobile orbits, scales, query styles, layer offset, and targeting | Both complete systems | Critical | Yes |
| `Responsive.ShortMobileThreshold` | Mobile and `VH<=700px` | Selects additional layer shift and platform Y offset | Short-mobile relative geometry | Critical | Yes |
| `Responsive.DesktopLayerShift` | RTL `-15vw`; LTR `+15vw` | Positions both systems relative to directional content | Both layer centers | High | Yes |
| `Responsive.MobileLayerShift` | `-11vh-70px`; short mobile `-11vh-120px` | Establishes current mobile vertical composition | Compass and Ecosystem screen centers | Critical | Yes |
| `Responsive.OrbitScaleFunction` | `.55` mobile, `.8` tablet, desktop clamped `VW/1600` | Controls rendered orbit distances | All normal-motion objects and mobile targets | Critical | Yes |
| `Responsive.CompassSize` | 420px desktop, 380px tablet, `min(55vw,240px)` mobile | Controls proportional Compass geometry | Entire Compass | High | Yes |
| `Responsive.MobilePlatformScale` | Orbit multiplier `.8`; visual token scale `.8` | Separately controls orbit distance and token footprint | Mobile platform geometry | Critical | Yes |
| `Responsive.MobileQueryOffset` | `translate:0 -180px`; opacity `.12` | Defines current mobile query rendering | Query bounds, focus/visual angle relationship | High | Yes |

### Interaction Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Interaction.TrackingSurface` | `.layer-compass` bounding rectangle | Defines normalized pointer area | Pointer angle and tilt amplitude | Critical | Yes |
| `Interaction.PointerRange` | Each normalized axis clamps to `[-.5,.5]` | Bounds shared interaction state | Parallax, tilt, signal stretch | High | Yes |
| `Interaction.PointerAngle` | `atan2(y,x)` | Produces the Compass target convention | Needle and focus | Critical | Yes |
| `Interaction.FocusThreshold` | `.22rad` | Defines angular focus ownership | `.is-focused` on all objects | High | Yes |
| `Interaction.NoninteractiveObjects` | Ecosystem and objects receive no pointer events | Keeps objects representational rather than direct controls | Event routing and cursor behavior | High | Yes |
| `Interaction.CleanupContract` | Destroy Compass, Ecosystem, and pointer tracker on `astro:before-swap` | Prevents duplicate loops/listeners | Astro navigation lifecycle | Critical | Yes |

### Compass Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Compass.ViewBox` | `-200 -200 400 400` | Centers proportional geometry at SVG `(0,0)` | Every Compass coordinate | Critical | Yes |
| `Compass.Pivot` | Needle transform origin `(0,0)` | Aligns rotation with hub and rings | Needle, signal, target direction | Critical | Yes |
| `Compass.StructuralLayers` | Deep, mid, core, hub, needle, signal groups in current order | Defines addressability and opacity hierarchy | Styling and runtime selectors | Critical | Yes |
| `Compass.InitialAngle` | `-π/2`, authored needle up, rendered with +90° offset | Establishes neutral north state | Initial and reduced-motion orientation | High | Yes |
| `Compass.ActiveInertia` | Needle speed `.25`, friction `.82`; tilt speed `.15`, friction `.85`; signal speed `.2`, friction `.82` | Defines current pointer response | Live Compass motion | High | Yes |
| `Compass.AmbientInertia` | Desktop/tablet speed `.01`, friction `.82`; mobile speed `.018`, friction `.86` | Defines current inactive target following | Ambient Compass motion | High | Yes |
| `Compass.SignalRange` | Base `-88`; rest 22; max 35 | Bounds signal endpoint from `-110` to `-123` | Signal line/tip/ring geometry | High | Yes |
| `Compass.Breathe` | 6s smooth infinite scale/opacity keyframes | Defines current CSS idle animation | `.compass__svg` computed transform/opacity | High | Yes |

### Ecosystem Constants

| Constant name | Current implementation | Reason it exists | What depends on it | Risk of changing it | Architectural review required |
|---|---|---|---|---|---|
| `Ecosystem.ObjectCount` | 12 platforms and 12 queries | Defines distribution denominator and target order | Phases, DOM order, target cycling | Critical | Yes |
| `Ecosystem.PlatformOrder` | Array order from ChatGPT through Synthesia | Defines generated phases and mobile index semantics | Placement and target order | Critical | Yes |
| `Ecosystem.QueryOrder` | Array order from “أفضل مطعم في الرياض” through “Legal services in Muscat” | Defines generated phases and desktop target sequence | Placement and target order | Critical | Yes |
| `Ecosystem.PlatformBaseOrbit` | Alternating 230/210, phase `index/12×2π` | Defines desktop/tablet platform field | Platform geometry and ambient targets | High | Yes |
| `Ecosystem.QueryBaseOrbit` | Alternating 395/365, phase `index/12×2π+2π/24` | Defines query field | Query geometry and ambient targets | High | Yes |
| `Ecosystem.MobilePlatformData` | Explicit per-token radii/phases in `Ecosystem.astro` | Defines mobile platform composition | Position, focus angle, mobile needle targets | Critical | Yes |
| `Ecosystem.MobileGuidanceOrder` | `[0,7,3,10,5,1,8,4,11,6,2,9]` | Defines semantic mobile target sequence | Ambient target selection | Critical | Yes |
| `Ecosystem.TargetCadence` | 4s desktop/tablet; 6s mobile | Defines when ambient target indexes advance | Needle target changes | High | Yes |
| `Ecosystem.RingGeometry` | 2000-square viewBox; six radii 160 through 460 at 60-unit spacing | Defines environmental reference geometry | Ring rendering and visual center | High | Yes |
| `Ecosystem.DataAttributeContract` | Radius, phase, mobile radius/phase, speed, depth, and platform kind attributes | Connects server-rendered data to runtime descriptors | `initEcosystem` parsing | Critical | Yes |

### Architectural Invariants

- The homepage remains one fixed, clipped viewport composition rather than a sequence of document-flow sections.
- Exactly one Ecosystem and one Compass instance participate in the homepage runtime.
- `.layer-ecosystem` remains below `.layer-compass`; both remain below Hero Content, Footer, and Header.
- Ecosystem and Compass remain separate sibling systems with independent DOM ownership.
- Both systems use the same pointer tracker instance created by the homepage bootstrap.
- The Ecosystem remains the source of inactive-pointer ambient target angles.
- The Compass remains the source of the current needle angle used for Ecosystem focus detection.
- Every cross-component point or rectangle is converted to canonical viewport CSS pixel space before comparison.
- The Compass hub, ring center, and needle pivot remain coincident at Compass SVG `(0,0)`.
- Needle rendering preserves the authored-up geometry and the current mathematical-angle-to-display-angle convention.
- Platform and query positions remain deterministic functions of data, time, viewport state, and pointer state; no random position source is present.
- Object runtime placement remains centered on calculated points rather than aligned by object top-left corners.
- Platform/query data order remains stable wherever generated phase or target index depends on array/DOM order.
- Responsive CSS thresholds and JavaScript thresholds continue to describe the same desktop/tablet/mobile boundaries.
- Normal-motion and reduced-motion paths remain separately defined and must both produce finite coordinates.
- Reduced-motion preference remains observable at initialization and after live preference changes.
- Every RAF loop and window/media listener has a lifecycle cleanup path on Astro page swap.
- Page clipping, stacking, and pointer-event ownership remain explicit; runtime objects do not become direct pointer targets implicitly.
- Runtime bounding boxes, visual centers, optical centers, safe radii, and collision distances are never treated as source constants; they **Need Runtime Measurement** under a declared capture state.

## Canonical Device Matrix

### Source-defined matrix status

The current source defines responsive categories and transition thresholds, but it does not define a named list of official device viewport dimensions. Therefore concrete reference widths and heights cannot be declared as existing project facts. Any exact validation viewport selected within a source-defined range **requires runtime validation** and must be recorded by development and QA before its results are treated as canonical.

The source-proven boundaries are:

- Mobile: `VW <= 767px`; the design-token comment describes the supported mobile range as `320px–767px`.
- Tablet: `768px <= VW <= 1199px`.
- Desktop: `VW >= 1200px`.
- Short mobile: mobile width plus `VH <= 700px`.
- Desktop orbit scale reaches its maximum at `VW >= 1600px`.
- The fixed page canvas reaches its `1280px` maximum width at `VW >= 1280px`.
- Mobile Compass size reaches its `240px` cap when `55vw >= 240px`, at `VW >= 240/0.55`; this derived transition is approximately `436.36px`, but an exact device viewport at that boundary is not declared by source.

### Reference viewport categories

| Viewport category | Width | Height | Orientation | Primary purpose | Responsive breakpoint category |
|---|---|---|---|---|---|
| Desktop Large | Source-defined category: `VW >= 1600px`; exact canonical width **requires runtime validation** | Not defined by source; **requires runtime validation** | Landscape (`VW > VH`) for category use; no source orientation query | Validate maximum desktop orbit scale, capped 1280px canvas, wide-viewport center relationship, desktop layer shift, and clipping | Desktop |
| Desktop Standard | Source-defined reference condition: canvas is capped from `VW >= 1280px`; exact canonical width **requires runtime validation** | Not defined by source; **requires runtime validation** | Landscape for category use; no source orientation query | Validate the capped canvas at and above its maximum width while desktop layout rules are active | Desktop |
| Laptop | Source-defined desktop entry range begins at `VW = 1200px`; an official laptop width/height is not declared and **requires runtime validation** | Not defined by source; **requires runtime validation** | Landscape for category use; no source orientation query | Validate the desktop breakpoint near its lower boundary, including the 420px Compass and desktop directional layer transform | Desktop |
| Tablet Landscape | `768px–1199px`; exact canonical width **requires runtime validation** | Not defined by source; **requires runtime validation** | Landscape (`VW > VH`) | Validate tablet orbit scale `.8`, 380px Compass, no desktop layer shift, and landscape clipping | Tablet |
| Tablet Portrait | `768px–1199px`; exact canonical width **requires runtime validation** | Not defined by source; **requires runtime validation** | Portrait (`VH > VW`) | Validate the same tablet rules under a taller viewport and confirm that no orientation-specific logic is assumed | Tablet |
| Mobile Large | Source does not define a separate large-mobile width; select within `320px–767px` and record it; **requires runtime validation** | Not defined by source; use `VH > 700px` when validating the normal-height mobile branch; exact height **requires runtime validation** | Portrait for category use; no source orientation query | Validate capped or near-capped mobile Compass sizing, mobile platform data, query translation, and normal mobile vertical layer transform | Mobile |
| Mobile Standard | Source does not define a separate standard-mobile width; select within `320px–767px` and record it; **requires runtime validation** | Not defined by source; use `VH > 700px` for the normal-height branch; exact height **requires runtime validation** | Portrait for category use; no source orientation query | Validate the primary mobile composition between the supported minimum and maximum widths | Mobile |
| Mobile Small | Source-supported lower width is `320px`; whether that exact width is the official canonical device **requires runtime validation** | Not defined by source; use `VH > 700px` unless testing short mobile; exact height **requires runtime validation** | Portrait for category use; no source orientation query | Validate the fluid `55vw` Compass branch, narrow-width clipping, object bounds, and horizontal-scroll prevention | Mobile |
| Short Mobile | `320px–767px`; exact canonical width **requires runtime validation** | `VH <= 700px`; exact canonical height **requires runtime validation** | Typically portrait, but source condition is height-based and does not require orientation | Validate the short-mobile layer transform, 64px platform-orbit Y offset, content/footer positions, clipping, and target alignment | Mobile + short-height override |

These categories are the canonical validation matrix structure for future homepage development, QA, visual validation, and responsive verification. A concrete test run becomes canonical only after its exact width, height, device-pixel ratio, direction, motion preference, font-load state, and capture state are recorded. Intermediate devices must interpolate through the existing fluid expressions and breakpoint rules rather than introduce separate device-specific layout logic unless the responsive architecture itself is formally changed.

## Design Intent Rules

These rules describe visual intent evidenced by the current component hierarchy, geometry, opacity, motion, and layer relationships. They are not replacement implementation rules.

| Design intent | Source-derived evidence |
|---|---|
| The Compass is the primary visual anchor. | It occupies its own layer above the Ecosystem, uses the core opacity hierarchy, is centered as a single instrument, and provides the direction state consumed by Ecosystem focus. |
| Platform Tokens visually orbit the Compass rather than functioning as viewport-aligned labels. | Tokens use polar radii/phases around an orbital center designed in direct relationship to the Compass layer, and the mobile needle targets their orbital coordinates. The current implementation's center differences remain documented engineering facts rather than a different visual narrative. |
| Query Pills remain secondary information. | They occupy the far layer, use lower opacity than Platform Tokens, move more slowly in the opposite direction, and reduce to `.12` opacity on mobile. |
| The Ecosystem is perceived as one unified composition. | One `Ecosystem` instance owns one ring field and one object container for all platforms and queries; one runtime loop coordinates their positions and focus state. |
| Optical balance has higher relevance to perception than center-point symmetry alone. | Object labels have unequal widths, queries have unequal multilingual text lengths, object families have different opacity and scale, and clipping changes visible area even when phase centers are regular. |
| No animated Ecosystem object visually outranks the Compass layer. | The complete Ecosystem is at z-index 10 and the Compass at z-index 20; ambient platform opacity is `.55` and query opacity is `.22` or `.12` on mobile. |
| Motion reinforces spatial hierarchy. | Platforms and queries use different radii, depths, speeds, directions, and opacities; needle alignment temporarily focuses the object in the active direction. |
| Compass motion represents guidance rather than object ownership. | Compass receives an ambient target angle, exposes only its current direction, and leaves `.is-focused` state management to the Ecosystem. |
| Mobile preserves the desktop visual narrative. | The same Compass, platform set, query set, orbit system, focus relationship, and layer order remain present; mobile changes size, position, opacity, and target selection without replacing the systems. |
| Responsive behavior preserves the composition before exact coordinates. | Both target layers move together at page breakpoints, while component-specific scale/radius rules adapt internal geometry. |
| Layer relationships are more stable than absolute screen positions. | Ecosystem, Compass, content, Footer, and Header retain their z-order across all current breakpoints even as transforms and sizes change. |
| Platform Tokens remain more visually prominent than Query Pills. | Platforms use higher ambient opacity, nearer depth, icon-plus-label construction, and dedicated mobile target logic. |
| The Compass remains structurally calm while its needle communicates direction. | Rings and hub retain fixed authored geometry; needle, signal, subtle SVG breathing, and tilt carry the live response. |
| Natural variation is produced through content footprint and responsive placement rather than random motion. | All phases, radii, speeds, target orders, and time functions are deterministic; no random source is present. |
| Reduced motion preserves the component narrative while suppressing continuous displacement. | Compass and Ecosystem remain rendered; JS switches to snapping/static branches and CSS removes or shortens motion. |
| Protected page layers remain visually above the two target components. | Hero Content, Footer, and Header have higher layer z-indexes than both Ecosystem and Compass. |

Any evaluation of visual dominance, optical balance, readability, or visible footprint at a specific viewport **requires runtime validation** because those outcomes depend on rendered text metrics, animation state, clipping, and higher-layer occlusion.

## Visual State Matrix

| Visual state | Trigger | Expected visual behavior | Active systems | Components affected | Animation expectations | Layout expectations | Dependencies |
|---|---|---|---|---|---|---|---|
| Initial Load | Server-rendered page is parsed before runtime initialization | Ecosystem rings, all objects, Compass SVG, neutral authored needle, and hidden navigation exist immediately; object transforms use CSS fallbacks until JS writes orbit variables | Static HTML/SVG and CSS | Ecosystem, tokens, pills, Compass | Compass `breathe` may begin when CSS applies; JS motion has not yet established its first frame | Fixed canvas and layer stack already apply | Astro-rendered DOM, global/component CSS, font loading |
| Runtime Initialization | `DOMContentLoaded` with required selectors present | Shared pointer state, Compass runtime, and Ecosystem runtime are created; motion preference is read; RAF loops start | Pointer tracker, Compass loop, Ecosystem loop, reduced-motion subscriptions | Both target components | First runtime frames begin updating needle and object coordinates | Existing containing blocks and breakpoint styles remain unchanged | `index.astro` bootstrap, DOM selector continuity |
| Idle | Runtime active and no pointer/touch input is active | Needle follows the current ambient Ecosystem target; objects continue deterministic orbit and focus evaluation; Compass breathes outside reduced motion | Both RAF loops, target cycling, CSS breathing | Compass, tokens, pills | Continuous orbit; ambient inertial needle following; focus transitions; breathing | No layout-mode change | Ambient getter, target indexes/cadence, orbit timestamp |
| Pointer Active | Valid mousemove or touchmove sets `isActive=true` | Needle targets pointer angle; SVG tilts; signal can stretch; Ecosystem parallax responds to the same normalized pointer | Pointer tracker, Compass inertia, Ecosystem orbit/parallax/focus | Compass, tokens, pills | Active needle/tilt/signal inertia and object parallax run per frame | Layer and object layout rules remain unchanged | Tracking rectangle, pointer normalization, inertia, parallax depth |
| Pointer Inactive | Mouse leaves window or touch ends | Needle target returns to ambient selection; tilt and signal targets return to neutral; object orbit continues | Both RAF loops and target cycling | Compass, Ecosystem objects | Inertia settles tilt/signal and redirects needle; orbit remains continuous | No layout-mode change | `onLeave`, current ambient angle |
| Platform Focus | Needle/object angular difference is below `.22rad` for a platform | Matching token receives `.is-focused`, opacity becomes 1, and scale becomes base scale × 1.06 outside reduced motion | Ecosystem focus detection and CSS transition | One or more platform tokens satisfying the threshold | Opacity/scale transition uses current duration/easing; orbit continues | Token remains centered on its calculated orbit point | Current Compass angle, platform active orbit, threshold, CSS class |
| Query Focus | Needle/object angular difference is below `.22rad` for a query | Matching pill receives `.is-focused`; desktop/tablet opacity becomes 1 and scale 1.04; mobile opacity becomes `.2` | Ecosystem focus detection and CSS transition | One or more Query Pills satisfying the threshold | Opacity/scale transition outside reduced motion; orbit continues | Mobile `translateY(-180px)` remains part of the visual position | Current Compass angle, query orbit angle, threshold, breakpoint CSS |
| Reduced Motion | `prefers-reduced-motion:reduce` is true or changes to true | Compass breathing/tilt/signal motion is suppressed or reset according to current branches; object orbit/parallax uses static placement; component transitions/scales follow reduced rules | Reduced-motion media query, both JS reduced branches, CSS overrides | Compass, tokens, pills | No continuous object drift or Compass breathing; active pointer can snap needle in the reduced Compass branch | Static coordinates use the separate reduced-motion formulas documented earlier | `reduced-motion.js`, global and component media queries |
| Viewport Resize | Window resize event and CSS media-query reevaluation | Pointer tracking area is remeasured; Ecosystem center, responsive scale, platform scale, and short-mobile offset update; Compass size/layer transforms may resolve differently | Resize listeners, CSS layout engine, both subsequent RAF loops | Both target components | Existing loops continue with updated geometry; no separate resize animation is defined | Containing blocks, breakpoint category, Compass size, and object coordinates may change | `pointer.js:onResize`, `ecosystem.js:onResize`, CSS breakpoints |
| Desktop | `VW >= 1200px` | Compass resolves to 420px; both layers receive direction-sensitive horizontal shift; regular platform/query orbits and desktop scaling function apply | Desktop CSS and non-mobile runtime branches | Both target components | 4s ambient target cadence across all objects; normal orbit/parallax/needle behavior | Capped page canvas can create the documented wide-viewport center delta | Width threshold, document direction, canvas cap |
| Tablet | `768px <= VW <= 1199px` | Compass resolves to 380px; no page-specific target-layer transform; regular orbits use scale `.8` | Tablet CSS and non-mobile runtime branches | Both target components | Same non-mobile motion mode and 4s target cadence | Full-width canvas within tablet range; shared structural top inset remains | Width threshold and viewport dimensions |
| Mobile | `VW <= 767px` and `VH > 700px` | Compass uses `min(55vw,240px)`; both layers shift upward; platforms use explicit mobile phases/radii and `.8` orbit multiplier; queries shift upward and reduce opacity | Mobile CSS and mobile runtime branches | Both target components | 6s platform-only target cadence; normal orbit/parallax remains active outside reduced motion | Mobile transform, token scale, query translation, and mobile content stacking apply | Width and height conditions, mobile dataset, target order |
| Short Mobile | `VW <= 767px` and `VH <= 700px` | Both layers use the stronger upward transform; platform orbit/target Y receives `+64px`; query mobile rules remain active | Short-mobile CSS override and mobile runtime offset branch | Both target components, with platform-specific internal offset | Same mobile cadence and motion mode; platform target angle includes short-height offset | Short-height composition differs from normal mobile by the documented layer and platform offsets | Width/height media conditions and `getPlatformOrbitOffsetY` |
| Document Hidden | `document.hidden=true` | RAF callbacks stop; current DOM/CSS state remains painted as last rendered | Visibility lifecycle in each RAF controller | Compass and Ecosystem runtime | RAF animation pauses; CSS animation behavior is controlled by the browser and **requires runtime validation** | No intended layout change | `visibilitychange` handlers |
| Document Visible Again | `document.hidden=false` | RAF loops restart with a fresh scheduled frame and reset internal `lastTime` bookkeeping | Visibility lifecycle in each RAF controller | Compass and Ecosystem runtime | Time-based orbital functions consume the new RAF timestamp; exact first resumed frame **requires runtime validation** | No intended layout change | `visibilitychange`, `performance.now()` timeline |
| Astro Page Swap | `astro:before-swap` | Both animation instances and the pointer tracker are destroyed | Cleanup paths | Both runtime systems | RAF and event-driven updates stop | Existing page is leaving; no continuing homepage layout behavior | Registered teardown handler |

Expected visual bounds, exact computed transforms, and state-transition screenshots for any row **require runtime validation** at a declared canonical device, timestamp, pointer state, font state, and motion preference.

## Acceptance Criteria

All criteria are pass/fail checks. Geometry-dependent checks use synchronized browser-computed rectangles and therefore **require runtime validation** on every approved viewport in the Canonical Device Matrix.

### Composition

- **Pass** if exactly one `.ecosystem` and exactly one `.compass` are rendered inside their respective homepage layers; otherwise **fail**.
- **Pass** if the Compass layer's computed z-index is greater than the Ecosystem layer's computed z-index; otherwise **fail**.
- **Pass** if every rendered Platform Token is produced by the platform dataset and every rendered Query Pill is produced by the query dataset, with counts of 12 each; otherwise **fail**.
- **Pass** if Platform Tokens and Query Pills remain centered on their calculated runtime points through the documented self-centering transform; otherwise **fail**.
- **Pass** if the Compass remains unobscured by Ecosystem objects according to synchronized runtime rectangle/paint validation; otherwise **fail**. This check **requires runtime validation**.
- **Pass** if the rendered visual hierarchy retains Platform Tokens at greater ambient opacity than Query Pills at the same breakpoint; otherwise **fail**.

### Responsive

- **Pass** if CSS and JavaScript select mobile below 768px, tablet from 768px through 1199px, and desktop from 1200px upward without an uncovered width; otherwise **fail**.
- **Pass** if short-mobile rules activate only when `VW <= 767px` and `VH <= 700px`; otherwise **fail**.
- **Pass** if Compass computed width and height are equal and resolve from the documented breakpoint expression; otherwise **fail**. Computed dimensions **require runtime validation**.
- **Pass** if the target layers receive the documented direction-sensitive desktop transform, no tablet transform, and documented mobile/short-mobile transform; otherwise **fail**.
- **Pass** if no horizontal scrolling is introduced at any canonical validation viewport; otherwise **fail**. This check **requires runtime validation**.
- **Pass** if every canonical matrix category completes layout, interaction, and collision validation without introducing a category-specific code path absent from the responsive architecture; otherwise **fail**.
- **Pass** if intermediate widths resolve through the existing fluid values and breakpoint rules without a discontinuity not defined by source; otherwise **fail**. This check **requires runtime validation**.

### Interaction

- **Pass** if one shared pointer tracker supplies finite `x`, `y`, `angle`, and `isActive` state to both runtime systems; otherwise **fail**.
- **Pass** if normalized pointer X/Y never leave `[-.5,.5]` and invalid coordinates do not replace valid state; otherwise **fail**.
- **Pass** if pointer-active needle targeting uses `atan2(y,x)` and rendered rotation preserves the `+90°` display offset; otherwise **fail**.
- **Pass** if inactive desktop/tablet targeting cycles through the complete object descriptor order and inactive mobile targeting uses the documented platform index order; otherwise **fail**.
- **Pass** if `.is-focused` is determined by Compass/object angular alignment using the current `.22rad` threshold; otherwise **fail**.
- **Pass** if Ecosystem objects remain noninteractive through pointer events and the Compass layer remains the tracking surface; otherwise **fail**.

### Animation

- **Pass** if platform and query orbit positions remain deterministic functions of phase, radius, speed, timestamp, responsive scale, and pointer state; otherwise **fail**.
- **Pass** if platforms use speed `.5` and queries use speed `-.3` against the `80000ms` base period; otherwise **fail**.
- **Pass** if needle angle inertia continues to use shortest-path normalization; otherwise **fail**.
- **Pass** if Compass signal endpoint remains within the source-defined rest and maximum extension values; otherwise **fail**.
- **Pass** if object position updates use transform-fed custom properties rather than layout `left/top` mutation; otherwise **fail**.
- **Pass** if both RAF loops pause through their visibility lifecycle and stop during Astro teardown; otherwise **fail**.
- **Pass** if no additional animation causes an Ecosystem object to paint above the Compass layer; otherwise **fail**.

### Accessibility

- **Pass** if every Platform Token and Query Pill retains `role="img"` and a nonempty accessible label matching its rendered content identity; otherwise **fail**.
- **Pass** if every platform icon and decorative Ecosystem/Compass SVG remains hidden from assistive technology as currently authored; otherwise **fail**.
- **Pass** if Compass navigation retains its navigation landmark, label, four links, and keyboard-focus visibility; otherwise **fail**.
- **Pass** if reduced-motion preference disables the documented nonessential CSS/JS motion without removing the rendered Compass, Platform Tokens, Query Pills, or navigation; otherwise **fail**.
- **Pass** if focus-visible Compass destinations are not clipped by their own hidden-state rules after focus; otherwise **fail**. This check **requires runtime validation**.

### Performance

- **Pass** if object motion continues to update `--orbit-x/y` and compositor-oriented transform/opacity/scale properties rather than forcing per-frame positional layout through `top/left`; otherwise **fail**.
- **Pass** if exactly one Compass RAF loop and one Ecosystem RAF loop run for the active homepage instance; otherwise **fail**.
- **Pass** if resize, pointer, touch, visibility, and media-query listeners are removed through the documented cleanup paths; otherwise **fail**.
- **Pass** if hidden-document RAF controllers have no scheduled frame until visibility resumes; otherwise **fail**.
- **Pass** if all per-frame coordinate values and written CSS pixel values remain finite; otherwise **fail**.

### Visual Consistency

- **Pass** if Platform Tokens retain their icon-plus-label structure, 20px icon layout box, source-defined padding/gap/border, and breakpoint scale rules; otherwise **fail**.
- **Pass** if Query Pills retain their text-only structure, source-defined padding/border/typography, far-layer opacity, and mobile opacity/translation rules; otherwise **fail**.
- **Pass** if Compass deep, mid, and core groups retain their opacity ordering `.18 < .45 < 1`; otherwise **fail**.
- **Pass** if all Compass rings, hub geometry, needle geometry, signal geometry, and SVG viewBox match the source-defined values; otherwise **fail**.
- **Pass** if object labels are fully rendered without unintended internal clipping; otherwise **fail**. This check **requires runtime validation** after fonts load.
- **Pass** if no Platform Token or Query Pill intersects protected Header, Hero Content, CTA, or Footer rectangles under the approved collision rule; otherwise **fail**. This check **requires runtime validation** across the animation sampling plan.
- **Pass** if no rendered object is unintentionally clipped by the page boundary outside the documented composition; otherwise **fail**. The intended clipping set must be declared, and validation **requires runtime validation**.

### Architecture

- **Pass** if all Architectural Invariants in Section 23 remain true; otherwise **fail**.
- **Pass** if the page preserves the fixed six-layer ordering and does not move Ecosystem or Compass into document flow; otherwise **fail**.
- **Pass** if the canonical viewport CSS pixel coordinate system is used for cross-component geometry comparisons; otherwise **fail**.
- **Pass** if platform/query array order remains consistent with generated phases and target indexes, or all dependent values are changed under architectural review; otherwise **fail**.
- **Pass** if CSS breakpoint boundaries and JavaScript breakpoint predicates remain equivalent; otherwise **fail**.
- **Pass** if the Ecosystem-to-Compass ambient-angle contract and Compass-to-Ecosystem current-angle contract both remain operational; otherwise **fail**.
- **Pass** if no source-code change introduces an unrecorded runtime constant, device-specific branch, random position source, duplicate component instance, or duplicate animation loop; otherwise **fail**.
- **Pass** if all canonical device categories have recorded validation results for normal motion and reduced motion; otherwise **fail**. Exact viewport selections and browser-computed results **require runtime validation**.

# Target Unified Component Architecture

## Purpose

This section defines the target architecture for the next-generation Homepage Ecosystem component.

It does **not** modify the current implementation.

It defines a completely new component that will be developed separately, validated independently, and only replace the current Homepage component after final approval.

The visual identity, motion language, interaction model, datasets, and overall user experience remain the same unless explicitly overridden by this section.

---

# Primary Architectural Goal

The entire visual system becomes **one unified component** instead of two coordinated components.

Current architecture:

Homepage
├── layer-ecosystem
│   ├── Rings
│   ├── Platform Tokens
│   └── Query Pills
│
└── layer-compass
    └── Compass

Target architecture:

Homepage
└── Unified Ecosystem Component
    ├── Rings
    ├── Compass
    ├── Platform Tokens
    └── Query Pills

Every visual element belongs to the same component hierarchy.

There is no independent Ecosystem layer.

There is no independent Compass layer.

---

# Unified Coordinate System

The new component owns exactly one coordinate system.

All visual calculations originate from the same center.

There shall never be multiple runtime centers.

The following elements share the exact same center coordinate:

- Compass
- Rings
- Orbit Engine
- Platform Tokens
- Query Pills
- Future floating objects

The center is defined once.

Every orbit, animation, interaction, and layout calculation references this center.

No child element computes or owns its own independent origin.

---

# Single Visual Origin

The component contains one visual origin only.

This origin represents:

- Compass center
- Ring center
- Orbit center
- Optical center

Those concepts are intentionally unified.

No runtime translation is allowed between them.

No correction offsets are allowed between them.

No synchronization logic is allowed between multiple centers because only one center exists.

---

# Single Parent Container

The component owns one root container.

The root container becomes the only positioning context.

Every visual object is positioned relative to this container.

Nothing inside the component positions itself relative to:

- window.innerWidth
- window.innerHeight
- document
- viewport center

All positioning is local to the unified component.

---

# Unified Runtime Engine

The component behaves as one runtime system.

Instead of multiple independent systems exchanging state, the new implementation behaves as one coordinated runtime engine.

The runtime owns:

- one animation loop
- one coordinate system
- one resize handler
- one pointer tracker
- one responsive calculation
- one orbit controller

Individual internal modules may exist for code organization, but they must behave as one runtime architecture.

---

# Unified Orbit Model

Every floating object belongs to one orbit system.

Objects may have different:

- orbit radius
- angular speed
- direction
- orbit layer
- orbit family
- opacity
- interaction priority

However every orbit is calculated from the same origin.

No orbit may introduce its own center.

---

# Visual Layering

The component internally contains multiple visual groups.

These groups are rendering groups only.

They are not independent coordinate systems.

Recommended rendering order:

1. Rings
2. Query Pills
3. Platform Tokens
4. Compass

Rendering order must never imply different coordinate origins.

---

# Responsive Behaviour

Responsive behavior must modify only:

- orbit radius
- spacing
- scaling
- density
- visibility
- safe areas

Responsive behavior must never create a different coordinate system.

Desktop, tablet and mobile all share the exact same center.

Only the surrounding geometry changes.

---

# Safe Distribution

Floating objects must always be distributed around the unified center.

Distribution quality becomes a first-class architectural requirement.

The runtime is responsible for producing visually balanced layouts.

The implementation must avoid situations where objects appear visually concentrated on one side while leaving large empty sectors on another.

The target is optical balance rather than mathematical symmetry.

---

# Future Extensibility

Every future floating object must be attachable without creating a new layer.

Examples include:

- AI platforms
- Search queries
- Signals
- Decorative objects
- Future orbit families

All future objects inherit the same coordinate system automatically.

No future feature should require introducing another independent center.

---

# Architectural Constraints

The following rules are mandatory.

The implementation MUST NOT:

- create multiple runtime centers
- synchronize two different coordinate systems
- compute object positions from viewport center
- compute object positions from window center
- introduce correction offsets between Compass and Ecosystem
- maintain separate Compass and Ecosystem positioning logic

The implementation MUST:

- own one coordinate system
- own one visual center
- own one runtime controller
- own one parent positioning context
- calculate every orbit from the unified center

---

# Migration Strategy

This architecture is intentionally isolated from the current Homepage.

Implementation order:

1. Build the new component.
2. Validate visual behavior.
3. Validate responsive behavior.
4. Validate floating-object distribution.
5. Validate interaction.
6. Validate animation.
7. Replace the current Homepage component only after approval.

The existing Homepage implementation remains the production reference until the new unified component reaches feature parity.

# Unified Geometry Model

## Purpose

This section defines the geometric rules governing the Unified Ecosystem Component.

The objective is to ensure that every visual element behaves as part of one coherent spatial system.

Geometry is considered a shared infrastructure.

Individual elements never define their own geometric reference.

---

# Global Center

The component owns one global center.

```
Unified Center
```

This point becomes the origin for every spatial calculation performed inside the component.

The Unified Center is immutable during runtime except when the component itself is resized.

It represents the visual, mathematical and interaction center simultaneously.

There shall never be more than one center.

---

# Coordinate Space

Every object exists inside the same local coordinate space.

All positions are calculated relative to:

```
(0,0) = Unified Center
```

Every floating element is represented as:

```
Position =
Center
+
Orbit Offset
+
Optional Local Offset
```

No object is positioned directly using viewport coordinates.

No object references document coordinates.

No object references another independent layer.

---

# Orbit System

Every floating element belongs to an orbit.

An orbit is defined by geometric properties rather than hardcoded screen positions.

Each orbit may define:

- radius
- angle
- angular velocity
- rotation direction
- priority
- visibility rules

Objects may belong to different orbit families while still sharing the same center.

---

# Orbit Families

The architecture supports multiple orbit families.

Examples include:

Compass Ring

Platform Orbit

Query Orbit

Future Orbit Types

Each family may use different radii and motion characteristics.

They never own different centers.

---

# Radius Definition

Orbit radius is always measured from the Unified Center.

No radius is measured from another object.

No radius is measured from viewport boundaries.

Responsive layouts modify radius values only.

They never relocate the center.

---

# Angular Position

Every floating object owns an angle.

```
0° → top
90° → right
180° → bottom
270° → left
```

The angular value determines the object's position on its orbit.

Objects never store absolute screen coordinates.

Their visible position is derived from:

- current angle
- current radius
- Unified Center

---

# Motion

Movement is angular.

Objects rotate around the Unified Center.

Objects never translate independently across the screen unless explicitly designed to temporarily leave their orbit.

Orbit motion remains continuous regardless of viewport size.

---

# Distribution Rules

Floating objects should appear naturally balanced.

The runtime should avoid:

- large empty sectors
- overlapping clusters
- visually compressed regions
- inconsistent spacing

Distribution is evaluated visually rather than mathematically.

Perfect symmetry is not required.

Visual balance is required.

---

# Orbit Density

Every orbit has a maximum comfortable density.

When additional objects are introduced, the runtime should prefer:

- increasing spacing
- redistributing angles
- increasing orbit radius when appropriate

The runtime should avoid allowing objects to collide visually.

---

# Layer Depth

Depth is represented by orbit distance rather than coordinate ownership.

Objects farther from the center occupy larger orbit radii.

Objects closer to the center occupy smaller orbit radii.

Depth never introduces another coordinate system.

---

# Responsive Geometry

Responsive behavior modifies geometry only.

Examples include:

- orbit radius
- spacing
- density
- scaling
- safe margins

Responsive behavior never changes:

- Unified Center
- Orbit model
- Coordinate space
- Rotation origin

The same mathematical model applies across all devices.

Only the numerical values change.

---

# Collision Safety

Objects should preserve a minimum visual separation.

The runtime should prevent:

- overlapping labels
- token collisions
- query collisions
- intersections with the compass body

Collision handling should be deterministic.

Objects should never randomly jump between positions.

---

# Visual Balance

The component should always appear centered.

The visual weight should remain approximately balanced around the Unified Center.

No viewport size should produce the perception that:

- all elements shifted left
- all elements shifted right
- all elements shifted upward
- all elements shifted downward

The Unified Center remains the visual anchor under every responsive breakpoint.

---

# Future Compatibility

Future floating elements automatically inherit:

- Unified Center
- Coordinate Space
- Orbit Model
- Distribution Rules
- Collision Rules
- Responsive Geometry

Adding a new orbit family must never require introducing another coordinate system.

The geometry model is intended to remain stable regardless of future component expansion.

# Unified Component Structure

## Purpose

This section defines the required internal structure of the new Unified Ecosystem Component.

The new component must be created in new files and remain isolated from the current Homepage implementation until it is approved.

The current `.layer-ecosystem` and `.layer-compass` architecture must remain unchanged during development of the new component.

---

## Root Component

The new system must have one root component.

Recommended responsibility:

```text
UnifiedEcosystem
```

The exact filename may follow the existing project naming conventions, but the component must remain clearly separate from the current `Ecosystem.astro` and `Compass.astro` files.

The root component owns:

* the unified positioning context
* the shared center
* the Rings
* the Compass
* the Platform Tokens
* the Query Pills
* the runtime initialization target

---

## Target DOM Hierarchy

The target hierarchy should remain simple.

```text
div.unified-ecosystem
├── svg.unified-ecosystem__rings
├── div.unified-ecosystem__objects
│   ├── Platform Token × 12
│   └── Query Pill × 12
└── div.unified-ecosystem__compass
    └── Compass SVG
```

The exact internal wrappers may change only when technically required.

Additional wrappers must not be introduced without a clear layout, rendering, or accessibility purpose.

---

## Root Positioning Context

`.unified-ecosystem` is the only positioning context for all component elements.

It must use:

```css
position: relative;
```

The Rings, Compass, Platform Tokens, and Query Pills must all be positioned relative to this root.

No internal element may use the viewport or document as its positioning container.

---

## Shared Center Representation

The root component must expose one center to all descendants.

The center may be represented by:

* local runtime coordinates
* CSS custom properties
* a shared runtime state object

The implementation must not maintain separate center values for the Compass and floating objects.

The required relationship is:

```text
Compass Center
=
Ring Center
=
Platform Orbit Center
=
Query Orbit Center
=
Unified Component Center
```

---

## Internal Rendering Groups

The component may contain separate rendering groups for clarity:

```text
Rings Group
Objects Group
Compass Group
```

These are internal rendering groups only.

They do not own:

* separate centers
* separate responsive transforms
* separate coordinate systems
* separate layout origins

---

## Existing Child Components

The current child component details should be reused where practical.

This includes:

* Platform Token markup
* Platform icon SVGs
* Platform labels
* Query Pill markup
* Compass SVG geometry
* Compass needle geometry
* Compass signal geometry
* accessibility labels
* typography
* borders
* opacity hierarchy

Reusing these details does not require reusing the current parent architecture.

The new root component must own the final placement and runtime behavior.

---

## Isolation Requirement

The new component must initially be rendered only in an isolated development route or preview page.

It must not be inserted into the production Homepage during the first implementation phase.

The isolated preview must provide enough space to validate:

* Desktop
* Tablet
* Mobile
* Short mobile
* RTL
* Reduced motion
* Pointer interaction
* Orbit distribution

---

# Unified Rendering Pipeline

## Purpose

This section defines the required initialization and rendering sequence.

The pipeline must remain deterministic and minimal.

---

## Static Rendering Phase

During Astro rendering, the component must produce:

1. The unified root container.
2. The Rings.
3. The Platform Token dataset.
4. The Query Pill dataset.
5. The floating-object DOM elements.
6. The Compass SVG.
7. The runtime data attributes or configuration required by the controller.

The component must be visually present before JavaScript initialization.

---

## Runtime Initialization Phase

After the component DOM exists, runtime initialization must occur in this order:

1. Locate the Unified Ecosystem root.
2. Read the component dimensions.
3. Calculate the single local center.
4. Read Platform Token and Query Pill orbit configuration.
5. Locate the Compass needle and signal elements.
6. Initialize the shared pointer tracker.
7. Initialize the unified runtime state.
8. Write the initial positions.
9. Start the animation loop.
10. Register resize, visibility, motion-preference, and teardown handlers.

Initialization must stop safely if the required root or critical Compass elements are missing.

---

## Frame Rendering Order

Each animation frame should perform the following operations:

1. Read current component dimensions if invalidated.
2. Read the current pointer state.
3. Determine the active Compass target.
4. Update Compass inertia.
5. Calculate the current Compass angle.
6. Calculate every object's current orbit angle.
7. Calculate every object's local position from the unified center.
8. Apply optional parallax.
9. Evaluate Compass-to-object angular focus.
10. Write object transforms and focus classes.
11. Render the Compass needle, tilt, and signal.
12. Schedule the next frame.

The order may be adjusted internally for efficiency, but the final state must be based on one synchronized runtime frame.

---

## Position Output

Object positions must be written as local component coordinates.

Preferred output:

```css
--orbit-x
--orbit-y
```

These values must represent local coordinates inside the unified root.

The final object transform must center the object's own box on the calculated position.

The implementation must not write viewport-based coordinates into child elements.

---

## Rendering Order

The visual paint order must be:

```text
Rings
Query Pills
Platform Tokens
Compass
```

The Compass must remain visually above all floating objects.

The complete unified component must remain below the Homepage content, Header, and Footer when it is eventually integrated.

---

## Resize Pipeline

On resize:

1. Remeasure the unified root.
2. Recalculate the shared center.
3. Recalculate responsive orbit values.
4. Recalculate safe boundaries.
5. Re-render all object positions from the same center.

Resize must not create a second runtime instance.

Resize must not restart the full component unless technically unavoidable.

---

## Reduced-Motion Pipeline

When reduced motion is active:

* Continuous orbit movement must stop.
* Compass breathing and tilt must stop.
* Object positions must remain based on the unified center.
* The same responsive geometry must remain active.
* Objects must not revert to a separate coordinate formula.
* The component must remain fully visible and understandable.

---

## Teardown Pipeline

The component must expose one cleanup path.

Cleanup must remove:

* the animation frame
* pointer listeners
* resize listeners
* visibility listeners
* motion-preference listeners

The component must not leave duplicate listeners or runtime loops after Astro navigation.

---

# Unified Runtime Responsibilities

## Purpose

This section defines the minimum runtime responsibilities required to implement the new component without introducing unnecessary abstraction.

The implementation may use one controller file or a small number of focused helper files.

The architecture must remain easy to inspect.

---

## Root Controller

The root runtime controller is responsible for:

* component initialization
* DOM discovery
* shared state ownership
* one animation loop
* responsive mode detection
* unified center calculation
* object position updates
* Compass target integration
* focus-state updates
* lifecycle cleanup

There must not be one independent Compass runtime and another independent Ecosystem runtime exchanging coordinates.

---

## Geometry Responsibility

The geometry logic is responsible for:

* reading root width and height
* calculating the unified center
* resolving responsive orbit radii
* converting angle and radius into local X/Y coordinates
* applying optional elliptical scaling
* enforcing Compass clearance
* producing finite local positions

The geometry logic must remain independent from DOM naming where practical.

---

## Orbit Responsibility

The orbit logic is responsible for:

* current angle
* initial phase
* radius
* speed
* direction
* object family
* responsive radius configuration

The existing deterministic motion model should be preserved unless the new component specification explicitly changes it.

No random angle or radius generation is allowed.

---

## Distribution Responsibility

Initial distribution must be defined through explicit dataset values or deterministic formulas.

The runtime must not continuously rearrange objects.

The runtime may support predefined responsive configurations for:

* Desktop
* Tablet
* Mobile
* Short mobile

These configurations must preserve the same unified center.

---

## Pointer Responsibility

The component must use one pointer tracker.

The tracking surface must be the unified component root or a clearly defined interaction surface inside it.

Pointer state may affect:

* Compass direction
* Compass tilt
* Signal stretch
* object parallax

Pointer state must not alter the component center.

---

## Compass Responsibility

The Compass runtime is responsible for:

* target angle selection
* shortest-path angle movement
* needle rendering
* optional tilt
* signal stretch
* exposing the current angle for focus evaluation

The Compass does not own a separate coordinate system.

Its pivot is the unified center.

---

## Focus Responsibility

Focus is determined by comparing:

* the current Compass angle
* the current object angle

The existing angular threshold may be reused initially.

Focus must not be calculated from unrelated screen rectangles.

A focused object may change:

* opacity
* visual scale

Focus must not change the object's orbit center.

---

## Responsive Responsibility

The responsive configuration controls:

* Compass size
* Platform orbit radii
* Query orbit radii
* token scale
* query scale or visibility
* layer density
* safe boundaries
* target cadence where necessary

It must not control the center independently for different object families.

---

## Collision Responsibility

The first implementation does not require a complex real-time collision engine.

Collision safety should initially be achieved through:

* explicit orbit radii
* explicit starting phases
* controlled token scale
* controlled query visibility
* responsive dataset values
* runtime validation

A dynamic collision solver must not be introduced unless static responsive configuration proves insufficient.

---

## State Ownership

The unified controller should own one state object containing only required runtime values.

Example responsibility groups:

```text
dimensions
center
pointer
responsive mode
needle state
object descriptors
motion preference
animation frame
```

No duplicated center or breakpoint state should exist in separate modules.

---

# Current-to-Target Migration Mapping

## Purpose

This section defines which existing details are reused, replaced, or excluded while building the new isolated component.

The current production implementation must remain untouched during this phase.

---

## Reuse Without Redesign

The following details should be reused as the visual and behavioral reference:

* all 12 Platform Tokens
* Platform names and IDs
* Platform icon SVGs
* Platform Token visual styles
* all 12 Query Pill strings
* Query language and direction
* Query Pill visual styles
* Compass SVG geometry
* Compass rings and graduation marks
* Compass hub
* Compass needle
* Compass signal
* Platform orbit speed
* Query orbit speed
* pointer angle behavior
* shortest-path Compass inertia
* focus concept
* reduced-motion support
* accessibility labels
* Thmanyah Sans typography
* current color tokens

These details may be copied into new files or reused through existing child components where this does not preserve the old two-layer architecture.

---

## Rebuild

The following parts must be rebuilt for the new component:

* root component structure
* unified root container
* local coordinate system
* center calculation
* orbit positioning
* responsive geometry
* component-level pointer tracking
* runtime state ownership
* animation-loop ownership
* resize handling
* lifecycle integration
* isolated preview route

---

## Remove From the New Architecture

The following current behaviors must not be carried into the new component:

* separate `.layer-ecosystem`
* separate `.layer-compass`
* separate Compass and Ecosystem centers
* object coordinates based on `window.innerWidth / 2`
* object coordinates based on `window.innerHeight / 2`
* the current `+10px` center mismatch
* the wide-screen horizontal center mismatch
* independent responsive transforms for the two systems
* correction offsets used to visually compensate for different centers
* mobile Query Pill `translateY(-180px)` as a substitute for proper geometry
* separate Compass and Ecosystem RAF systems
* state exchange between two independent runtime controllers

---

## Preserve Temporarily in Production

Until the new component is approved, the following current files and behavior remain unchanged:

* `src/components/Ecosystem.astro`
* `src/components/Compass.astro`
* `src/scripts/ecosystem.js`
* `src/scripts/compass.js`
* current Homepage layer markup
* current Homepage runtime initialization
* current production responsive behavior

The isolated implementation must not rename, delete, or repurpose these files.

---

## New Files

The implementation should create new files instead of modifying the current production files.

A minimal target structure may be:

```text
src/components/unified-ecosystem/
├── UnifiedEcosystem.astro
├── UnifiedPlatformToken.astro
├── UnifiedQueryPill.astro
└── unified-ecosystem.js
```

Existing icon components and shared motion helpers may be reused when suitable.

The final filenames may follow project conventions, but the separation from the current implementation must remain obvious.

---

## Preview Integration

A separate preview page must render the new component.

Example responsibility:

```text
src/pages/unified-ecosystem-preview.astro
```

The route name is not mandatory.

The important requirement is that the preview:

* does not affect the Homepage
* uses the real project styles and fonts
* provides a clear viewport for testing
* allows responsive inspection
* allows runtime interaction testing

---

## Migration Gate

The new component must not replace the current Homepage implementation until all of the following are approved:

* unified center alignment
* Compass alignment
* Rings alignment
* Platform Token distribution
* Query Pill distribution
* Desktop layout
* Tablet layout
* Mobile layout
* Short-mobile layout
* pointer interaction
* ambient targeting
* focus behavior
* reduced motion
* performance
* cleanup behavior

---

## Final Replacement Phase

After approval:

1. Render the new component inside the appropriate Homepage layer.
2. Remove the old `layer-ecosystem` and `layer-compass` instances.
3. Remove the old Homepage runtime initialization.
4. Preserve the existing Homepage content, Header, Footer, and stacking order.
5. Run full production validation.
6. Delete legacy component files only after confirming they have no remaining imports.

The replacement phase is outside the current isolated implementation scope.
