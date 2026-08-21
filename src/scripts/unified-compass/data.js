/**
 * Unified Compass — floating element content.
 *
 * Per spec 2.3, this content is a configurable field: a manually editable mix of
 * AI product names, SEO keywords, and search-engine names, not hardcoded into the
 * component's runtime logic. Edit this array to change what the component shows;
 * nothing else needs to change.
 *
 * Each entry:
 * - id:    stable identifier (used for touch two-tap target tracking)
 * - label: the visible phrase (variable length; the pill sizing adapts, see config.js)
 * - href:  optional link. Omit or leave empty for a decorative, non-interactive pill.
 * - tier:  'dim' | 'medium' | 'bright' — artistic/visual-balance choice only,
 *          intentionally not tied to what the phrase means (spec 2.3, 9).
 * - lang:  BCP-47 language of this specific phrase ('ar' | 'en') — set per item,
 *          never inferred from the page's own direction (audit D3).
 *

 * Array order doubles as the visibility priority list: at responsive modes
 * that show fewer than all items (see config.js `responsive.modes`), the
 * visible set is always the first N items in this order, never a removal
 * from the dataset itself. Reorder this array to change which items survive
 * at reduced density. Anchor angle is intentionally NOT stored per item —
 * it's computed at runtime from an item's position within the CURRENTLY
 * VISIBLE set (see distribution.js), so a reduced subset is always
 * re-spread evenly around the full circle rather than left at gaps sized
 * for the full arrangement.
 *
 * `logo` (optional): key into ai-logos.js `AI_LOGOS`, for items whose brand
 * has a matching SVG mark in assets/ai-logos/. Rendered by
 * UnifiedCompass.astro immediately before the label; omit for items with no
 * matching mark.
 *
 * `emphasis` (optional): 'raised' | 'muted' — a small, deliberate override of
 * an item's own tier-default visual weight (UnifiedCompass.astro reads it
 * via a `data-emphasis` attribute), for the rare case a specific item should
 * stand out from or recede behind its tier's usual presence to improve the
 * overall composition. Omit for the tier default; most items should. This
 * replaces DOM-position-based CSS selectors (nth-child etc.) as the
 * mechanism for "not every same-tier item looks identical" — the dataset,
 * not sibling position, is the single source of truth for visual variety.
 *
 * Item order: array order is BOTH the visibility priority list (see above)
 * AND, since distribution.js spaces the currently-visible set evenly by
 * their position within it, the determinant of which angle (and therefore
 * which side of the compass) each item lands on. Tiers are deliberately
 * interleaved by position here so the five 'bright' logo pills split evenly
 * between the left and right half of the ring instead of clustering on one
 * side (verified: this order yields a 4/4 bright split left/right, vs. an
 * earlier ordering that produced 5/2 and read as visually left-heavy).
 */
const RAW_ITEMS = [
  { id: 'google', label: 'Google', href: '#', tier: 'medium', lang: 'en' },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    href: '#',
    tier: 'bright',
    lang: 'en',
    logo: 'chatgpt',
    emphasis: 'raised',
  },
  {
    id: 'seo-riyadh-agency',
    label: 'أفضل شركة تسويق في الرياض',
    href: '#',
    tier: 'dim',
    lang: 'ar',
  },
  { id: 'claude', label: 'Claude', href: '#', tier: 'bright', lang: 'en', logo: 'claude' },
  {
    id: 'marketing-dubai',
    label: 'best marketing agency Dubai',
    href: '#',
    tier: 'medium',
    lang: 'en',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    href: '#',
    tier: 'bright',
    lang: 'en',
    logo: 'perplexity',
  },
  {
    id: 'ecommerce-platform',
    label: 'أفضل منصة تجارة إلكترونية',
    href: '#',
    tier: 'dim',
    lang: 'ar',
  },
  { id: 'gemini', label: 'Gemini', href: '#', tier: 'medium', lang: 'en', logo: 'gemini' },
  {
    id: 'antigravity',
    label: 'Antigravity',
    href: '#',
    tier: 'bright',
    lang: 'en',
    logo: 'antigravity',
  },
  { id: 'copilot', label: 'Copilot', href: '#', tier: 'medium', lang: 'en' },
  { id: 'bing', label: 'Bing', href: '#', tier: 'dim', lang: 'en', emphasis: 'muted' },
  { id: 'codex', label: 'Codex', href: '#', tier: 'bright', lang: 'en', logo: 'codex' },
  { id: 'huggingface', label: 'Hugging Face', href: '#', tier: 'medium', lang: 'en' },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    href: '#',
    tier: 'bright',
    lang: 'en',
    logo: 'deepseek',
  },
  {
    id: 'legal-muscat',
    label: 'Legal services in Muscat',
    href: '#',
    tier: 'dim',
    lang: 'en',
  },
  { id: 'grok', label: 'Grok', href: '#', tier: 'bright', lang: 'en', logo: 'grok' },
  {
    id: 'digital-transform-gulf',
    label: 'أفضل شركة تحول رقمي في الخليج',
    href: '#',
    tier: 'dim',
    lang: 'ar',
  },
  { id: 'manus', label: 'Manus', href: '#', tier: 'bright', lang: 'en', logo: 'manus' },
];

export const FLOATING_ELEMENTS = RAW_ITEMS.map((item, index) => ({
  ...item,
  // Deterministic (not random) per-item drift timing offsets, so the ring
  // feels organic without any two elements breathing in lockstep.
  driftDelaySec: Number(((index * 0.63) % 4).toFixed(2)),
  driftDurationSec: Number((4.5 + ((index * 0.37) % 2.5)).toFixed(2)),
}));
