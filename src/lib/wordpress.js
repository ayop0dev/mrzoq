// @ts-check
/**
 * WordPress REST API Client - Marzoq
 *
 * The single interface between the Astro frontend and the WordPress backend.
 * WordPress REST API is the canonical content interface for Version 1.
 */

const WP_URL = import.meta.env.WORDPRESS_URL || '';
const SITE_URL = import.meta.env.SITE_URL || 'https://mrzoq.com';
const WORDPRESS_BASE_URL = normalizeBaseUrl(WP_URL);
const SITE_BASE_URL = normalizeBaseUrl(SITE_URL);
const API_BASE = WORDPRESS_BASE_URL ? `${WORDPRESS_BASE_URL}/wp-json/wp/v2` : '';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_PER_PAGE = 100;

/** @type {Promise<Article[]> | null} */
let allPostsCache = null;

/**
 * @typedef {object} WpRendered
 * @property {string} rendered
 */

/**
 * @typedef {object} WpTerm
 * @property {number} id
 * @property {string} name
 * @property {string} slug
 * @property {string} taxonomy
 * @property {string} [link]
 */

/**
 * @typedef {object} WpAuthor
 * @property {number} id
 * @property {string} name
 * @property {string} [slug]
 * @property {string} [link]
 */

/**
 * @typedef {object} WpMediaSize
 * @property {string} source_url
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * @typedef {object} WpMedia
 * @property {number} id
 * @property {string} source_url
 * @property {string} [alt_text]
 * @property {{ width?: number, height?: number, sizes?: Record<string, WpMediaSize> }} [media_details]
 */

/**
 * @typedef {object} WpPost
 * @property {number} id
 * @property {string} slug
 * @property {string} link
 * @property {string} date
 * @property {string} modified
 * @property {string} [date_gmt]
 * @property {string} [modified_gmt]
 * @property {number} [featured_media]
 * @property {WpRendered} title
 * @property {WpRendered} content
 * @property {WpRendered} excerpt
 * @property {{ author?: WpAuthor[], 'wp:featuredmedia'?: WpMedia[], 'wp:term'?: WpTerm[][] }} [_embedded]
 * @property {object} [yoast_head_json]
 */

/**
 * @typedef {object} ArticleImage
 * @property {string} url
 * @property {string} alt
 * @property {number | undefined} [width]
 * @property {number | undefined} [height]
 */

/**
 * @typedef {object} ArticleTaxonomy
 * @property {string} name
 * @property {string} slug
 */

/**
 * @typedef {object} ArticleAuthor
 * @property {string} name
 * @property {string} [slug]
 */

/**
 * @typedef {object} Article
 * @property {number} id
 * @property {string} slug
 * @property {string} wordpressSlug
 * @property {string} title
 * @property {string} excerpt
 * @property {string} content
 * @property {string} date
 * @property {string} modified
 * @property {string} canonical
 * @property {string} wordpressUrl
 * @property {ArticleImage | null} featuredImage
 * @property {ArticleAuthor | null} author
 * @property {ArticleTaxonomy[]} categories
 * @property {ArticleTaxonomy[]} tags
 * @property {object | undefined} [seo]
 */

/**
 * @typedef {object} PaginatedPosts
 * @property {Article[]} posts
 * @property {number} total
 * @property {number} totalPages
 * @property {number} page
 * @property {number} perPage
 */

/**
 * @typedef {object} WpService
 * @property {number} id
 * @property {string} slug
 * @property {WpRendered} title
 * @property {WpRendered} content
 * @property {WpRendered} excerpt
 * @property {object} acf
 */

/**
 * @typedef {object} WpPortfolioItem
 * @property {number} id
 * @property {string} slug
 * @property {WpRendered} title
 * @property {WpRendered} content
 * @property {WpRendered} excerpt
 * @property {string} [modified]
 * @property {object} [yoast_head_json]
 * @property {object} acf
 */

function normalizeBaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

function buildApiUrl(path, params = {}) {
  if (!API_BASE) return '';

  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

/**
 * Fetch JSON from WordPress with graceful failure.
 *
 * @template T
 * @param {string} endpoint
 * @returns {Promise<{ data: T | null, total: number, totalPages: number }>}
 */
async function apiFetch(endpoint) {
  if (!API_BASE || !endpoint) {
    return { data: null, total: 0, totalPages: 0 };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[WordPress API] ${response.status} for ${endpoint}`);
      return { data: null, total: 0, totalPages: 0 };
    }

    return {
      data: /** @type {T} */ (await response.json()),
      total: Number(response.headers.get('x-wp-total') || 0),
      totalPages: Number(response.headers.get('x-wp-totalpages') || 0),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[WordPress API] Failed to fetch ${endpoint}:`, error?.message ?? error);
    return { data: null, total: 0, totalPages: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'");
}

function stripTags(value = '') {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeSlug(slug = '') {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function encodePathSegment(segment = '') {
  return encodeURIComponent(segment).replace(/%2F/gi, '/');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeWordPressHtml(html = '') {
  return decodeHtmlEntities(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '');
}

function rewriteInternalWordPressLinks(html = '') {
  if (!WORDPRESS_BASE_URL) return html;

  const escapedOrigin = escapeRegExp(new URL(WORDPRESS_BASE_URL).origin);
  const hrefPattern = new RegExp(`href=(["'])(${escapedOrigin}[^"']*)\\1`, 'gi');

  return html.replace(hrefPattern, (match, quote, rawUrl) => {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return match;
    }

    const path = url.pathname.replace(/^\/+|\/+$/g, '');
    const segments = path.split('/').filter(Boolean);

    if (segments.length !== 1 || segments[0].startsWith('wp-')) {
      return match;
    }

    return `href=${quote}/blog/${decodeSlug(segments[0])}${url.search}${url.hash}${quote}`;
  });
}

function normalizeWordPressContent(html = '') {
  return rewriteInternalWordPressLinks(sanitizeWordPressHtml(html));
}

/**
 * @param {WpPost} post
 * @returns {ArticleImage | null}
 */
function extractFeaturedImage(post) {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media?.source_url) return null;

  const sizes = media.media_details?.sizes;
  const preferred = sizes?.large || sizes?.medium_large || sizes?.medium || null;

  return {
    url: preferred?.source_url || media.source_url,
    alt: stripTags(media.alt_text || post.title?.rendered || ''),
    width: preferred?.width || media.media_details?.width,
    height: preferred?.height || media.media_details?.height,
  };
}

/**
 * @param {WpPost} post
 * @param {string} taxonomy
 * @returns {ArticleTaxonomy[]}
 */
function extractTerms(post, taxonomy) {
  const groups = post._embedded?.['wp:term'] || [];
  return groups
    .flat()
    .filter((term) => term.taxonomy === taxonomy)
    .map((term) => ({
      name: decodeHtmlEntities(term.name),
      slug: decodeSlug(term.slug),
    }));
}

/**
 * @param {WpPost} post
 * @returns {ArticleAuthor | null}
 */
function extractAuthor(post) {
  const author = post._embedded?.author?.[0];
  if (!author?.name) return null;
  return {
    name: decodeHtmlEntities(author.name),
    slug: author.slug,
  };
}

/**
 * Map a raw WordPress post into the frontend article contract.
 *
 * @param {WpPost} post
 * @returns {Article}
 */
export function mapPostToArticle(post) {
  const slug = decodeSlug(post.slug);
  const title = stripTags(post.title?.rendered || '');
  const excerpt = stripTags(post.excerpt?.rendered || '');
  const content = normalizeWordPressContent(post.content?.rendered || '');

  return {
    id: post.id,
    slug,
    wordpressSlug: post.slug,
    title,
    excerpt,
    content,
    date: post.date,
    modified: post.modified,
    canonical: `${SITE_BASE_URL}/blog/${encodePathSegment(slug)}`,
    wordpressUrl: post.link,
    featuredImage: extractFeaturedImage(post),
    author: extractAuthor(post),
    categories: extractTerms(post, 'category'),
    tags: extractTerms(post, 'post_tag'),
    seo: post.yoast_head_json,
  };
}

/**
 * Fetch one page of published WordPress posts.
 *
 * @param {{ page?: number, perPage?: number }} [options]
 * @returns {Promise<PaginatedPosts>}
 */
export async function getPaginatedPosts(options = {}) {
  const page = Math.max(1, options.page || 1);
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, options.perPage || 10));
  const endpoint = buildApiUrl('/posts', {
    status: 'publish',
    orderby: 'date',
    order: 'desc',
    page,
    per_page: perPage,
    _embed: 1,
  });

  const { data, total, totalPages } = await apiFetch(endpoint);
  const rawPosts = Array.isArray(data) ? /** @type {WpPost[]} */ (data) : [];

  return {
    posts: rawPosts.map(mapPostToArticle),
    total,
    totalPages,
    page,
    perPage,
  };
}

/**
 * Fetch all published posts, traversing WordPress pagination.
 *
 * @returns {Promise<Article[]>}
 */
export async function getAllPublishedPosts() {
  if (allPostsCache) return allPostsCache;

  allPostsCache = (async () => {
    const firstPage = await getPaginatedPosts({ page: 1, perPage: MAX_PER_PAGE });
    const posts = [...firstPage.posts];

    for (let page = 2; page <= firstPage.totalPages; page += 1) {
      const nextPage = await getPaginatedPosts({ page, perPage: MAX_PER_PAGE });
      posts.push(...nextPage.posts);
    }

    return posts;
  })();

  return allPostsCache;
}

/**
 * Fetch recent blog posts.
 *
 * @param {number} [count=10]
 * @returns {Promise<Article[]>}
 */
export async function getPosts(count = 10) {
  if (count > MAX_PER_PAGE) {
    return (await getAllPublishedPosts()).slice(0, count);
  }

  const { posts } = await getPaginatedPosts({ perPage: count });
  return posts;
}

/**
 * Fetch a single post by slug.
 *
 * @param {string} slug
 * @returns {Promise<Article | null>}
 */
export async function getPostBySlug(slug) {
  const decodedSlug = decodeSlug(slug);
  const endpoint = buildApiUrl('/posts', {
    slug: decodedSlug,
    status: 'publish',
    _embed: 1,
  });
  const { data } = await apiFetch(endpoint);
  if (!Array.isArray(data) || data.length === 0) return null;
  return mapPostToArticle(/** @type {WpPost} */ (data[0]));
}

/**
 * Fetch all published services.
 * @returns {Promise<WpService[]>}
 */
export async function getServices() {
  const endpoint = buildApiUrl('/services', { per_page: 20, _embed: 1 });
  const { data } = await apiFetch(endpoint);
  return Array.isArray(data) ? /** @type {WpService[]} */ (data) : [];
}

/**
 * Fetch a single service by slug.
 * @param {string} slug
 * @returns {Promise<WpService | null>}
 */
export async function getServiceBySlug(slug) {
  const endpoint = buildApiUrl('/services', { slug, _embed: 1 });
  const { data } = await apiFetch(endpoint);
  if (!Array.isArray(data) || data.length === 0) return null;
  return /** @type {WpService} */ (data[0]);
}

/**
 * Fetch all portfolio items.
 * @returns {Promise<WpPortfolioItem[]>}
 */
export async function getPortfolio() {
  const endpoint = buildApiUrl('/portfolio', { per_page: 20, _embed: 1 });
  const { data } = await apiFetch(endpoint);
  return Array.isArray(data) ? /** @type {WpPortfolioItem[]} */ (data) : [];
}

/**
 * Fetch a single portfolio item by slug.
 * @param {string} slug
 * @returns {Promise<WpPortfolioItem | null>}
 */
export async function getPortfolioItemBySlug(slug) {
  const endpoint = buildApiUrl('/portfolio', { slug, _embed: 1 });
  const { data } = await apiFetch(endpoint);
  if (!Array.isArray(data) || data.length === 0) return null;
  return /** @type {WpPortfolioItem} */ (data[0]);
}

/**
 * @typedef {object} SeoMeta
 * @property {string} title
 * @property {string} description
 * @property {string} [canonical]
 * @property {string} [ogImage]
 */

/**
 * Extract SEO metadata from a WordPress object.
 *
 * @param {object} wpObject
 * @param {string} fallbackTitle
 * @returns {SeoMeta}
 */
export function extractSeo(wpObject, fallbackTitle = '') {
  if (!wpObject) {
    return { title: fallbackTitle, description: '' };
  }

  const yoast = wpObject.yoast_head_json;
  if (yoast) {
    return {
      title: stripTags(yoast.title || fallbackTitle),
      description: stripTags(yoast.description || ''),
      canonical: yoast.canonical || '',
      ogImage: yoast.og_image?.[0]?.url || '',
    };
  }

  return {
    title: stripTags(wpObject.title?.rendered || fallbackTitle),
    description: stripTags(wpObject.excerpt?.rendered || ''),
  };
}

/**
 * Get the best available image URL from a WordPress media object.
 *
 * @param {WpMedia | null | undefined} mediaDetails
 * @param {'full' | 'large' | 'medium' | 'thumbnail'} [size='large']
 * @returns {string | null}
 */
export function getMediaUrl(mediaDetails, size = 'large') {
  if (!mediaDetails) return null;
  const sizes = mediaDetails.media_details?.sizes;
  if (sizes?.[size]) return sizes[size].source_url;
  return mediaDetails.source_url ?? null;
}
