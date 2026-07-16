/**
 * sitemap.xml — SEO
 * Generated at build time. Lists all pages for search engines and AI crawlers.
 */
import { getAllPublishedPosts, getPortfolio } from '../lib/wordpress.js';

export async function GET() {
  const siteUrl = (import.meta.env.SITE_URL || 'https://mrzoq.com').replace(/\/+$/, '');
  const now = new Date().toISOString();

  // Static Experience Pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/about', priority: '0.8', changefreq: 'monthly' },
    { url: '/services', priority: '0.9', changefreq: 'monthly' },
    { url: '/contact', priority: '0.7', changefreq: 'monthly' },
    { url: '/blog', priority: '0.8', changefreq: 'daily' },
    { url: '/portfolio', priority: '0.8', changefreq: 'weekly' },
    { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { url: '/terms', priority: '0.3', changefreq: 'yearly' },
  ];

  // Dynamic content pages
  const posts = await getAllPublishedPosts();
  const portfolio = await getPortfolio();

  const postEntries = posts.map((p) => ({
    url: `/blog/${p.slug}`,
    priority: '0.7',
    changefreq: 'monthly',
    lastmod: p.modified || now,
  }));

  const portfolioEntries = portfolio.map((p) => ({
    url: `/portfolio/${p.slug}`,
    priority: '0.6',
    changefreq: 'monthly',
    lastmod: p.modified || now,
  }));

  const allEntries = [
    ...staticPages.map((p) => ({ ...p, lastmod: now })),
    ...postEntries,
    ...portfolioEntries,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries
  .map(
    (entry) => `  <url>
    <loc>${siteUrl}${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
