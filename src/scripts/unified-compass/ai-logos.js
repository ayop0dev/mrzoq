/**
 * Unified Compass — AI product logo marks.
 *
 * Raw SVG source (imported via Vite's `?raw` suffix) for the monochrome
 * marks in assets/ai-logos/. Each file ships with a hardcoded `fill="black"`
 * attribute; that attribute has lower CSS specificity than any selector
 * targeting the injected markup, so the component's stylesheet can recolor
 * every mark to the design system's green (--color-primary, via
 * `currentColor`) purely in CSS — the source files themselves are never
 * edited. Keyed by the same string each data.js entry references via its
 * `logo` field.
 */
import antigravity from '../../../assets/ai-logos/Antigravity.svg?raw';
import appleIntelligence from '../../../assets/ai-logos/Apple Intelligent.svg?raw';
import chatgpt from '../../../assets/ai-logos/ChatGPT.svg?raw';
import claude from '../../../assets/ai-logos/Claude.svg?raw';
import codex from '../../../assets/ai-logos/Codex.svg?raw';
import deepseek from '../../../assets/ai-logos/DeepSeek.svg?raw';
import gemini from '../../../assets/ai-logos/Gemini.svg?raw';
import grok from '../../../assets/ai-logos/Grok.svg?raw';
import manus from '../../../assets/ai-logos/manus.svg?raw';
import perplexity from '../../../assets/ai-logos/perplexity.svg?raw';

export const AI_LOGOS = {
  antigravity,
  appleIntelligence,
  chatgpt,
  claude,
  codex,
  deepseek,
  gemini,
  grok,
  manus,
  perplexity,
};
