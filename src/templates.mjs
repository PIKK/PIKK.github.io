/**
 * HTML 模板。所有页面共用一个 shell，保证页头、页脚、SEO 标签一致。
 * 纯字符串拼接，构建时一次性生成静态 HTML。
 */

/** HTML 转义，避免标题或摘要中的特殊字符破坏结构。 */
function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 把 URL 片段做安全编码（保留斜杠）。 */
function urlPath(...parts) {
  return parts
    .filter((p) => p !== undefined && p !== null && p !== '')
    .map((p) => encodeURIComponent(String(p)))
    .join('/');
}

/** 判断导航项是否当前页。 */
function isCurrent(navUrl, current) {
  if (navUrl === '/') return current === '/';
  return current === navUrl || current.startsWith(navUrl);
}

/** 标签名转链接路径，使用构建期生成的目录名映射。 */
function tagHref(tagSlugs, name) {
  return `/tags/${urlPath(tagSlugs?.[name] ?? name)}/`;
}

/** 页面外壳：head、页头、主体、页脚、脚本。 */
function shell({ site, title, description, canonical, bodyClass = '', current = '/', content, isArticle = false, ogType = 'website', publishedTime = '' }) {
  const pageTitle = title ? `${esc(title)} · ${esc(site.title)}` : esc(site.title);
  const desc = esc(description || site.description);
  const canonicalUrl = canonical ? `${site.url}${canonical}` : `${site.url}/`;

  return `<!DOCTYPE html>
<html lang="${esc(site.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${esc(canonicalUrl)}">
<meta name="theme-color" content="#fbf8f2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#17150f" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(title || site.title)}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${esc(canonicalUrl)}">
${publishedTime ? `<meta property="article:published_time" content="${esc(publishedTime)}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/rss.xml">
<link rel="stylesheet" href="/style.css">
<script>
// 尽早确定主题，避免深色模式下的白屏闪烁
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = saved || (prefersDark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
</script>
</head>
<body class="${esc(bodyClass)}">
<a class="skip-link" href="#main">跳到正文</a>
${isArticle ? '<div class="progress" aria-hidden="true"></div>' : ''}
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="/">
      <span class="brand__seal" aria-hidden="true">${esc(site.seal)}</span>
      <span class="brand__text">
        <span class="brand__title">${esc(site.title)}</span>
        <span class="brand__tagline">${esc(site.tagline)}</span>
      </span>
    </a>
    <nav class="nav" aria-label="主导航">
      ${site.nav
        .map(
          (item) =>
            `<a class="nav__link" href="${esc(item.url)}"${isCurrent(item.url, current) ? ' aria-current="page"' : ''}>${esc(item.text)}</a>`
        )
        .join('\n      ')}
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="切换深浅色主题">
        <svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 12H2M22 12h-2.2M5.6 5.6 4.1 4.1M19.9 19.9l-1.5-1.5M18.4 5.6l1.5-1.5M4.1 19.9l1.5-1.5"/></svg>
        <svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1Z"/></svg>
      </button>
    </nav>
  </div>
</header>
<main id="main">
${content}
</main>
<footer class="site-footer">
  <div class="wrap site-footer__inner">
    <span>© ${new Date().getFullYear()} ${esc(site.author)} · ${esc(site.footerNote)}</span>
    <span class="site-footer__links">
      <a href="/rss.xml">RSS</a>
      <a href="/sitemap.xml">站点地图</a>
      <a href="/archive/">归档</a>
    </span>
  </div>
</footer>
<button class="to-top" type="button" data-to-top aria-label="回到顶部">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
</button>
<script src="/main.js" defer></script>
</body>
</html>
`;
}

/** 文章列表项。 */
function postItem(post, index, tagSlugs) {
  return `      <li class="post-item" style="--i:${index}">
        <div class="post-item__gutter">
          <time class="post-item__date" datetime="${esc(post.iso)}">${esc(post.iso)}</time>
          <span class="post-item__index">NO.${String(index + 1).padStart(2, '0')}</span>
        </div>
        <div>
          <h2 class="post-item__title">
            <a class="post-item__link" href="/posts/${urlPath(post.slug)}/">${esc(post.title)}</a>
          </h2>
          <p class="post-item__summary">${esc(post.summary)}</p>
          <div class="post-item__foot">
            <span>约 ${post.minutes} 分钟</span>
            ${post.tags.map((t) => `<a class="tag" href="${tagHref(tagSlugs, t)}">${esc(t)}</a>`).join('')}
          </div>
        </div>
      </li>`;
}

/** 首页：报头 + 文章列表。 */
export function renderHome({ site, posts, tagSlugs }) {
  const content = `  <div class="wrap">
    <section class="masthead">
      <h1 class="masthead__title">${esc(site.title)}</h1>
      <p class="masthead__tagline">${esc(site.tagline)}。这里存放我写下的技术笔记、项目记录和一些不成熟的想法。</p>
      <div class="masthead__meta">
        <span class="label">共 ${posts.length} 篇 · 持续更新</span>
        <span class="label">Latest first</span>
      </div>
    </section>
${
  posts.length
    ? `    <ul class="post-list">
${posts.map((p, i) => postItem(p, i, tagSlugs)).join('\n')}
    </ul>`
    : `    <div class="empty">
      <div class="empty__mark" aria-hidden="true">☐</div>
      <h2 class="empty__title">还没有文章</h2>
      <p class="empty__text">在 <code>posts/</code> 目录放一个 Markdown 文件，重新构建就会出现。</p>
    </div>`
}
  </div>`;

  return shell({ site, title: '', description: site.description, canonical: '/', current: '/', content });
}

/** 文章页。 */
export function renderPost({ site, posts, post, tagSlugs }) {
  const index = posts.findIndex((p) => p.slug === post.slug);
  // posts 已按时间倒序，因此下标更大的是更早的文章
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index < posts.length - 1 ? posts[index + 1] : null;

  const nav = `    <nav class="post-nav" aria-label="文章导航">
${
  newer
    ? `      <a class="post-nav__item post-nav__item--prev" href="/posts/${urlPath(newer.slug)}/">
        <span class="post-nav__dir">← 更新的一篇</span>
        <span class="post-nav__title">${esc(newer.title)}</span>
      </a>`
    : '      <span></span>'
}
${
  older
    ? `      <a class="post-nav__item post-nav__item--next" href="/posts/${urlPath(older.slug)}/">
        <span class="post-nav__dir">更早的一篇 →</span>
        <span class="post-nav__title">${esc(older.title)}</span>
      </a>`
    : '      <span></span>'
}
    </nav>`;

  const content = `  <div class="wrap--narrow">
    <article class="article">
      <a class="article__back" href="/">← 返回首页</a>
      <header class="article__header">
        <h1 class="article__title">${esc(post.title)}</h1>
        <div class="article__meta">
          <time datetime="${esc(post.iso)}">${esc(post.displayDate)}</time>
          <span class="article__meta-sep">·</span>
          <span>约 ${post.minutes} 分钟</span>
${
  post.tags.length
    ? `          <span class="article__meta-sep">·</span>
          <span class="article__tags">${post.tags
            .map((t) => `<a class="tag" href="${tagHref(tagSlugs, t)}">${esc(t)}</a>`)
            .join('')}</span>`
    : ''
}
        </div>
      </header>
      <div class="prose">
${post.html}
      </div>
    </article>
${nav}
  </div>`;

  return shell({
    site,
    title: post.title,
    description: post.summary,
    canonical: `/posts/${urlPath(post.slug)}/`,
    current: '/posts/',
    content,
    isArticle: true,
    ogType: 'article',
    publishedTime: post.iso,
  });
}

/** 归档页：按年份分组。 */
export function renderArchive({ site, posts, tagSlugs }) {
  const byYear = new Map();
  for (const post of posts) {
    const year = post.date.getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(post);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const groups = years
    .map(
      (year, i) => `    <section class="year-group" style="--i:${i}">
      <div class="year-group__head">
        <h2 class="year-group__year">${year}</h2>
        <span class="year-group__count">${byYear.get(year).length} 篇</span>
      </div>
      <ul class="archive-list">
${byYear
  .get(year)
  .map(
    (post) => `        <li class="archive-item">
          <time class="archive-item__date" datetime="${esc(post.iso)}">${esc(post.iso.slice(5))}</time>
          <a class="archive-item__title" href="/posts/${urlPath(post.slug)}/">${esc(post.title)}</a>
          <span class="archive-item__tags">${post.tags
            .map((t) => `<a class="tag" href="${tagHref(tagSlugs, t)}">${esc(t)}</a>`)
            .join('')}</span>
        </li>`
  )
  .join('\n')}
      </ul>
    </section>`
    )
    .join('\n');

  const content = `  <div class="wrap">
    <header class="page-head">
      <span class="label">Archive</span>
      <h1 class="page-head__title">归档</h1>
      <p class="page-head__desc">按时间倒序排列的全部文章，共 ${posts.length} 篇。</p>
    </header>
${
  years.length
    ? groups
    : `    <div class="empty">
      <div class="empty__mark" aria-hidden="true">☐</div>
      <h2 class="empty__title">归档还是空的</h2>
      <p class="empty__text">等第一篇文章写完之后，这里就会热闹起来。</p>
      <a class="empty__action" href="/">回到首页</a>
    </div>`
}
  </div>`;

  return shell({
    site,
    title: '归档',
    description: `全部文章归档，共 ${posts.length} 篇。`,
    canonical: '/archive/',
    current: '/archive/',
    content,
  });
}

/** 标签页：标签云 + 可选的文章列表。 */
export function renderTags({ site, posts, tags, tagSlugs, activeTag = null }) {
  const active = activeTag ? tags.find((t) => t.name === activeTag) : null;
  const maxCount = Math.max(1, ...tags.map((t) => t.count));
  const listed = active ? active.posts : posts;

  const cloud = tags.length
    ? `    <div class="tag-cloud">
${tags
  .map(
    (tag) =>
      `      <a class="tag-cloud__item" href="${tagHref(tagSlugs, tag.name)}" style="--weight:${(tag.count / maxCount).toFixed(2)}"${active && active.name === tag.name ? ' aria-current="page"' : ''}>
        <span class="tag-cloud__name">${esc(tag.name)}</span>
        <span class="tag-cloud__count">${tag.count}</span>
      </a>`
  )
  .join('\n')}
    </div>`
    : `    <div class="empty">
      <div class="empty__mark" aria-hidden="true">#</div>
      <h2 class="empty__title">还没有标签</h2>
      <p class="empty__text">在文章的 front matter 里写 <code>tags: [标签]</code> 即可。</p>
    </div>`;

  const list = active
    ? `    <ul class="post-list" style="margin-top:2rem">
${active.posts.map((p, i) => postItem(p, i, tagSlugs)).join('\n')}
    </ul>`
    : '';

  const content = `  <div class="wrap">
    <header class="page-head">
      <span class="label">Tags</span>
      <h1 class="page-head__title">${active ? `标签：${esc(active.name)}` : '标签'}</h1>
      <p class="page-head__desc">${
        active
          ? `该标签下有 ${active.count} 篇文章。<a href="/tags/" style="color:var(--accent)">查看全部标签</a>`
          : `共 ${tags.length} 个标签，${posts.length} 篇文章。`
      }</p>
    </header>
${active ? list : cloud}
  </div>`;

  return shell({
    site,
    title: active ? `标签：${active.name}` : '标签',
    description: active ? `标签「${active.name}」下的全部文章。` : '全部文章标签。',
    canonical: active ? tagHref(tagSlugs, active.name) : '/tags/',
    current: '/tags/',
    content,
  });
}

/** 关于页。内容可在这里直接改。 */
export function renderAbout({ site }) {
  const content = `  <div class="wrap--narrow">
    <header class="page-head">
      <span class="label">About</span>
      <h1 class="page-head__title">关于</h1>
    </header>
    <div class="prose" style="margin-top:2rem">
      <p>你好，我是 ${esc(site.author)}。</p>
      <p>这里是我的个人博客，用来记录平时写代码时踩过的坑、做过的小项目，以及一些零散的想法。内容大多和技术有关，偶尔也会有别的。</p>
      <p>写下来的东西未必正确，也未必成熟，但都是我当时的真实理解。如果恰好对你有用，那就再好不过。</p>
      <div class="about-card">
        <p style="margin:0"><strong>这个站点</strong></p>
        <p style="margin-top:0.7rem">纯静态站点：文章用 Markdown 写作，构建脚本把它们编译成 HTML，托管在 GitHub Pages 上。没有数据库，没有服务端，也没有追踪脚本。</p>
        <p style="margin-top:0.7rem">想订阅更新，可以试试 <a href="/rss.xml">RSS</a>。</p>
      </div>
    </div>
  </div>`;

  return shell({
    site,
    title: '关于',
    description: `关于 ${site.author} 和他的博客。`,
    canonical: '/about/',
    current: '/about/',
    content,
  });
}

/** 404 页。 */
export function renderNotFound({ site, posts, tagSlugs }) {
  const recent = posts.slice(0, 3);
  const content = `  <div class="wrap--narrow">
    <div class="empty">
      <div class="empty__mark" aria-hidden="true">404</div>
      <h1 class="empty__title">这一页没有内容</h1>
      <p class="empty__text">可能是链接写错了，或者文章已经移动。要不先从最近的文章看起？</p>
      <a class="empty__action" href="/">回到首页</a>
    </div>
${
  recent.length
    ? `    <ul class="post-list">
${recent.map((p, i) => postItem(p, i, tagSlugs)).join('\n')}
    </ul>`
    : ''
}
  </div>`;

  return shell({
    site,
    title: '页面未找到',
    description: '页面未找到。',
    canonical: '/404.html',
    current: '',
    content,
  });
}
