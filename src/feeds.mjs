/**
 * 站点级机器可读文件：RSS、sitemap、robots。
 */

/** XML 转义。 */
function xml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlPath(text) {
  return encodeURIComponent(String(text));
}

/** 转成 RFC 822 时间（RSS 要求），按站点时区偏移。 */
function rfc822(date, offsetHours = 8) {
  const shifted = new Date(date.getTime() + offsetHours * 3600 * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n) => String(n).padStart(2, '0');
  const sign = offsetHours >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetHours);
  return `${days[shifted.getUTCDay()]}, ${pad(shifted.getUTCDate())} ${months[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()} ${pad(
    shifted.getUTCHours()
  )}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())} ${sign}${pad(absOffset)}00`;
}

/** RSS 2.0 订阅源。 */
export function renderRss({ site, posts }) {
  const items = posts
    .map(
      (post) => `    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(`${site.url}/posts/${urlPath(post.slug)}/`)}</link>
      <guid isPermaLink="true">${xml(`${site.url}/posts/${urlPath(post.slug)}/`)}</guid>
      <pubDate>${rfc822(post.date, site.timezoneOffset)}</pubDate>
      <description>${xml(post.summary)}</description>
${post.tags.map((t) => `      <category>${xml(t)}</category>`).join('\n')}
    </item>`
    )
    .join('\n');

  const lastBuild = posts.length ? rfc822(posts[0].date, site.timezoneOffset) : rfc822(new Date(), site.timezoneOffset);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(site.title)}</title>
    <link>${xml(`${site.url}/`)}</link>
    <description>${xml(site.description)}</description>
    <language>${xml(site.lang)}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${xml(`${site.url}/rss.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

/** sitemap.xml。 */
export function renderSitemap({ site, posts }) {
  const newest = posts.length ? posts[0].iso : new Date().toISOString().slice(0, 10);
  const entries = [
    { loc: `${site.url}/`, lastmod: newest, priority: '1.0', changefreq: 'daily' },
    { loc: `${site.url}/archive/`, lastmod: newest, priority: '0.7', changefreq: 'weekly' },
    { loc: `${site.url}/tags/`, lastmod: newest, priority: '0.5', changefreq: 'weekly' },
    { loc: `${site.url}/about/`, lastmod: newest, priority: '0.5', changefreq: 'monthly' },
    ...posts.map((post) => ({
      loc: `${site.url}/posts/${urlPath(post.slug)}/`,
      lastmod: post.iso,
      priority: '0.8',
      changefreq: 'monthly',
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${xml(e.loc)}</loc>
    <lastmod>${xml(e.lastmod)}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

/** robots.txt，指向 sitemap。 */
export function renderRobots({ site }) {
  return `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;
}
