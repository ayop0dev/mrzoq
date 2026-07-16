/**
 * robots.txt — SEO
 * Generated at build time.
 */
export async function GET() {
  const siteUrl = import.meta.env.SITE_URL || 'https://mrzoq.com';
  const body = `User-agent: *
Allow: /

# Block WordPress admin (if exposed)
Disallow: /wp-admin/
Disallow: /wp-json/

Sitemap: ${siteUrl}/sitemap.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
