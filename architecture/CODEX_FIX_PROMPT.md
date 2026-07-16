You are working in the Marzoq.com repository (Astro project) at the root of the current working directory.

## Task

1. Read the full audit report at `architecture/DESIGN_AUDIT_2026-07-05.md`. It documents where the current implementation deviates from the canonical architecture/design specs in `/architecture` (`marzoq.architecture.md`, `marzoq.design-system.md`, `marzoq.visual.identity.md`, `compass.component.canon.md`, `ecosystem.specification.md`, `homepage.specification.md`). Read those canonical spec files too wherever the audit references a rule you don't fully understand before touching related code — do not guess at intent.

2. Fix the issues in the audit, in this order, using the "Recommended Fix Order" section of the report as your checklist:
   - **P0 (architecture-breaking, fix all of these):**
     1. `about.astro` has no viewport lock — it must use the same `page-experience`/`is-locked` pattern as the other Experience Pages so it never scrolls vertically, at any viewport size.
     2. `services.astro` / `contact.astro` only lock the viewport at `min-width: 768px` — extend the lock so mobile widths (<768px) are also non-scrolling.
     3. `Ecosystem.astro`'s orbital layer assignment is wrong: all Platform Tokens are on `layer: 'near'` and all Query Pills are on `layer: 'far'`, and the Middle layer is never populated. Per `ecosystem.specification.md`, Platform Tokens should predominantly belong to the Middle layer and Query Pills predominantly to the Near layer, with all three layers (Far/Middle/Near) actually populated and visually distinct (opacity/speed/radius).
   - **P1 (significant, fix all of these):**
     4. Compass auto-rotates continuously when idle (mobile "continuous sweeping" mode, and desktop idle drift from the ecosystem's ambient angle) — this is an explicitly forbidden behavior in `compass.component.canon.md`. Remove continuous idle auto-rotation; the needle should settle into a calm, resting orientation when idle, not sweep indefinitely.
     5. `ecosystem.js`'s reduced-motion branch returns before running focus detection, so Focus indication is fully disabled under `prefers-reduced-motion`. Fix it so drift/parallax/breathing are disabled but Focus indication still works, per the spec's explicit "preserve: ... focus indication" requirement.
     6. Several site-wide components still use `opacity` to dim text/links instead of `--color-text-secondary` (contrast risk against the `#EADED2` background): `Footer.astro` (`.footer__link`, `.footer__dot`, `.footer__copyright`, `.footer__social-link`), `Navigation.astro` (`.navigation__link`), `Logo.astro` (`.logo__text-en`), `ContentBlock.astro` (`.content-block__subtext`), and similar opacity-based labels in `contact.astro`/`services.astro`. Replace these with the `--color-text-secondary` token used elsewhere in the codebase.
     7. `Footer.astro` overrides footer link touch targets down to `32px` inside the `@media (max-width: 767px)` block, regressing below the required `44px` minimum. Fix so mobile footer links stay at ≥44px `min-block-size`.
     8. Compass signal-stretch animation mutates raw SVG geometry attributes (`y2`, `cy`) every frame instead of using a transform. Per `compass.component.canon.md`'s performance requirements ("only transform and opacity may animate"), refactor this to use a transform-based approach instead of attribute mutation, without changing the visual behavior (still bounded stretch, same min/rest/max range).
   - **P2 (polish, fix if reasonably quick — do not spend excessive time on these):**
     9. Compass breathing (scale+opacity keyframe on `.compass__svg`) runs continuously including during needle rotation, technically overlapping with the "only orientation changes during rotation" rule. If it's a simple decoupling (e.g. apply breathing to a separate wrapping layer that doesn't also carry rotation), do it; otherwise leave it and note why in your fix report.
     10. Thmanyah font weight 600 (`--weight-semibold`) has no matching `@font-face` declaration, causing faux-bold. Add the missing `@font-face` for weight 600 if the font file/asset for that weight exists in the repo; if it doesn't exist, note this in your report rather than fabricating a font-face pointing at a non-existent file.
     11. Compass accessibility label reads `"وجهات التنقل — Navigation Destinations"` instead of the canon's literal `"Primary Navigation"`/`"Guidance Navigation"` wording. Update the aria-label wording to match the canon while keeping bilingual support if that's the existing pattern.
     12. `blog/[slug].astro` blockquote uses a 3px `border-inline-start` — trim to 1px per the strict "no thick accent borders" rule.
     13. `--color-bg-gradient` uses pure `#ffffff` as a gradient stop — replace with a near-white tinted toward the brand hue if this is a trivial one-line change; otherwise skip and note it.

## Constraints

- Fix only what's listed above. Do not refactor unrelated code, rename things, or "clean up" beyond what's needed to close these findings.
- Preserve all currently-compliant behavior documented in the audit's "Confirmed Compliant" section — do not regress those while fixing the above.
- Match the existing code style and patterns already used in the file you're editing (e.g. reuse the `page-experience`/`is-locked` CSS classes and tokens that already exist rather than inventing new ones).
- After making changes, run the project's lint, format check, and build (check `package.json` scripts — likely `npm run lint`, `npm run format:check`, `npm run build`) and fix any errors those introduce.
- Do not touch anything outside `src/` and the audit/report docs you're asked to write.

## Deliverable

When done, write a new markdown file `architecture/FIX_REPORT_<today's date, YYYY-MM-DD>.md` summarizing what you did, structured like this:

- One section per numbered item above (1–13). For each: state whether it was **Fixed**, **Partially fixed**, or **Skipped**, which file(s) and lines you changed, a short description of the actual change, and — for anything Partially fixed or Skipped — why.
- A final "Validation" section showing the output/result of lint, format check, and build after your changes.
- Do not include large diffs in the report; describe changes in prose with file:line references, the way the original audit report does.

This report is for a human to review before anything is committed — do not commit or push anything yourself.
