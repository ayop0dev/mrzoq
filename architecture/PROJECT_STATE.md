# PROJECT_STATE.md

# Marzoq.com — Project State

---

# Current Phase

🔧 REMEDIATION COMPLETE (Round 2) — Awaiting Deployed Verification

---

# Overall Status

🟢 Phase 0  🟢 Phase 1  🟢 Phase 3  🟢 Phase 2  🟢 Phase 4
🟢 Phase 5  🟢 Phase 6  🟢 Phase 7  🟢 Phase 8  🟢 Phase 9
🟢 Phase 10 🟠 Phase 11 🟠 Phase 12

All 14 audit issues (MRZ-001–014) re-audited and fully resolved in source.
Phase 11 (QA) awaits deployed-preview verification.
Phase 12 (Release) awaits WordPress CMS connection and analytics setup.

---

# Completed Phases

✓ Phase 0 — Repository scaffold (astro.config.mjs, tsconfig, eslint, prettier, .env.example, .gitignore)
✓ Phase 1 — Foundation: CSS tokens, typography (15 @font-face), layout, animations, global.css, BaseLayout
✓ Phase 3 — Motion System: lerp, inertia, orbital, pointer, reduced-motion (barrel index)
✓ Phase 2 — Components: Compass, PlatformToken, QueryPill, Ecosystem, Navigation, CtaButton, GlassPanel, ContentBlock, Card, Logo
✓ Phase 4 — CMS Integration: wordpress.js (apiFetch, getServices, getPosts, getPortfolio, extractSeo, getMediaUrl)
✓ Phase 5 — Homepage: six-layer single-viewport composition, compass.js, ecosystem.js
✓ Phase 6 — Experience Pages: about, services, contact
✓ Phase 7 — Archive Pages: blog/index, portfolio/index
✓ Phase 8 — Content Pages: blog/[slug], portfolio/[slug]
✓ Phase 9 — SEO: canonical, OG, Twitter Card, JSON-LD schema.org, robots.txt, sitemap.xml
✓ Phase 10 — Performance: CSS custom property positioning (no layout reflow), Page Visibility API, getBoundingClientRect caching, CSS containment, Vite target=es2020, motion chunk splitting

---

# Remediation Summary (independent re-audit 2026-06-28)

## P0 — Blocking

- [x] MRZ-001: Contact form — Netlify Forms (data-netlify, name, form-name hidden, honeypot),
      JS handler with pending/success/failure states, ARIA live region, field validation,
      value preservation on failure. **Blocker**: end-to-end delivery requires Netlify deployment.

## P1 — Major

- [x] MRZ-002: Compass needle angle — +90° offset in drawNeedleOnly() and drawFull();
      single shared pointer via getPointer param; reduced-motion loop snaps to current pointer angle.
- [x] MRZ-003: Accessibility — aria-hidden removed from Ecosystem root and layer-ecosystem;
      PlatformToken and QueryPill have role="img" + aria-label for AT exposure;
      decorative SVG rings retain aria-hidden="true"; Compass nav uses visually-hidden-but-focus-visible pattern.
- [x] MRZ-004: Single Viewport — CRITICAL: removed overflow-y: auto from contact.astro
      @media (max-height: 600px) block; replaced with density reduction (smaller gaps, smaller textarea,
      hide headline block at very short screens) that keeps content within 100dvh without scrolling.
- [x] MRZ-005: Text contrast — ALL opacity-based text colors replaced across ALL pages:
      blog/[slug] (date, back-link, copyright, blockquote), blog/index (subtext, empty, footer),
      portfolio/[slug] (back-link), portfolio/index (subtext, empty, footer),
      privacy (subtitle, body text, footer), terms (subtitle, body text, footer),
      Card (meta used primary-60 → text-secondary; description opacity → color).
      --color-text-secondary (#286848, 5.0:1 vs #EADED2) used throughout.
- [x] MRZ-006: Services CMS — removed static fallback array; services page shows intentional
      empty state ("خدماتنا قادمة قريبًا.") when WordPress unavailable; no false sample content.
      apiFetch uses AbortController with 8s timeout.
- [x] MRZ-007: OG image — public/og-default.png generated (1200×630, valid PNG via scripts/gen-og.mjs);
      BaseLayout references /og-default.png; HTTP 200 verified.
- [x] MRZ-008: PROJECT_STATE.md reflects truthful in-progress state.

## P2 — Minor

- [x] MRZ-009: GlassPanel forwards rest Astro.props (scoped style attribute fix).
- [x] MRZ-010: Landmarks — ALL pages corrected:
      blog/index: removed role="main" from div, added native <main>, removed role="banner" from header.
      portfolio/index: same.
      privacy: removed role="main" from outer div, wrapped content in <main>, removed explicit roles.
      terms: same.
      Experience pages (index, about, services, contact): <main class="layer-content"> confirmed.
      Content pages (blog/[slug], portfolio/[slug]): <main id="main-content"> confirmed.
- [x] MRZ-011: Duplicate pointer — single shared pointer tracker in initCompass getPointer param.
- [x] MRZ-012: ESLint — js.configs.recommended + globals; all no-unused-vars and
      no-constant-binary-expression errors fixed.
- [x] MRZ-013: Touch targets — ALL interactive targets verified at ≥44px min-block-size:
      Navigation links, CtaButton, contact form inputs/submit (experience pages);
      Footer.astro privacy/terms links (display: inline-flex + min-block-size: 44px);
      blog/[slug] back-link (display: inline-flex + min-block-size: 44px);
      portfolio/[slug] back-link (display: inline-flex + min-block-size: 44px);
      Archive Card links are block-level with padding, naturally ≥44px tall.

## P3 — Polish

- [x] MRZ-014: Copyright year — dynamic new Date().getFullYear() in ALL pages:
      Footer.astro (experience pages), blog/[slug], portfolio/[slug], blog/index,
      portfolio/index, privacy, terms.

---

# Validation (2026-06-28, Round 2)

```
npm run lint          → 0 errors, 0 warnings ✓
npm run format:check  → All files match Prettier ✓
npm run build         → 8 pages built in 1.35s ✓
Dev server HTTP 200   → /, /about, /services, /contact, /blog, /portfolio,
                         /privacy, /terms, /og-default.png ✓
```

---

# Open Blockers

- MRZ-001: Form submission requires Netlify deployment to verify end-to-end delivery.
  Netlify Forms attributes are correctly set. Use `netlify dev` or deploy a preview branch to test.
- MRZ-006: WordPress CMS must be connected to populate services/blog/portfolio with real content.
  Without WORDPRESS_URL, all CMS-driven pages show intentional empty states (no false content).
- Analytics: Google Analytics / Plausible not yet integrated. Add via BaseLayout `<slot name="head">`.

---

# Production Build

```
10 pages/routes: /, /about, /services, /contact, /blog, /portfolio,
                 /privacy, /terms, /robots.txt, /sitemap.xml
JS: ~5.7KB total (motion: 2.7KB + init: 3.0KB)
CSS: ~22KB total
Static assets: og-default.png (4.8KB), og-default.svg, favicon.svg, favicon.ico, fonts/
```

---

# Deployment

1. Set environment variables in hosting platform:
   - `SITE_URL=https://mrzoq.com`
   - `WORDPRESS_URL=https://cms.mrzoq.com` (enables CMS-driven blog/portfolio/services)

2. Netlify: `netlify.toml` is configured — connect repo and deploy
   - Build command: `npm run build`
   - Publish directory: `dist`

3. Verify after deployment:
   - Contact form submission reaches Netlify Forms inbox
   - /og-default.png returns 200 with correct Content-Type: image/png
   - /robots.txt and /sitemap.xml return 200
   - All internal links resolve
   - No horizontal or vertical scrolling on Experience Pages at all viewport sizes

---

# Production Ready Criteria

- [ ] Contact form submission verified end-to-end in Netlify preview
- [ ] WordPress CMS connected and tested with real content
- [ ] Analytics configured and tracking
- [ ] Final accessibility audit passes (Lighthouse / axe)
- [ ] Full viewport matrix tested in deployed browser

---

# Last Updated

2026-06-28 — Independent re-audit complete. All 14 MRZ remediations verified and corrected.
Round 2 fixes: MRZ-004 overflow-y violation, MRZ-005 all opacity failures, MRZ-006 static fallback,
MRZ-007 PNG format, MRZ-010 landmark structure, MRZ-013 touch targets, MRZ-014 copyright years.
Lint, format, build all pass. Dev server HTTP 200 for all pages.
