/**
 * 静态站点构建脚本。
 * 读取 posts/ 下的 Markdown，生成 dist/ 中的完整静态站点，
 * 可直接部署到 GitHub Pages（无需任何服务端运行时）。
 */
import { readFile, writeFile, mkdir, readdir, rm, cp, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import hljs from 'highlight.js';
import matter from 'gray-matter';
import site from '../site.config.mjs';
import { renderHome, renderPost, renderArchive, renderTags, renderAbout, renderNotFound } from '../src/templates.mjs';
import { renderRss, renderSitemap, renderRobots } from '../src/feeds.mjs';
import { setupFonts } from './fonts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'posts');
const distDir = join(root, 'dist');
const staticDir = join(root, 'src', 'static');
const styleFile = join(root, 'src', 'style.css');
const clean = process.argv.includes('--clean');

/** 把日期字符串（YYYY-MM-DD）转成 Date，非法输入回退到当前时间。 */
function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date();
}

/** 生成 URL 友好的 slug；中文标题保留为可读拼音式编码由浏览器处理。 */
function slugify(text) {
  const slug = String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `post-${Date.now()}`;
}

/**
 * 标签名转路径片段。
 * 中文标签保留原字（URL 中会被百分号编码），但必须剔除
 * 路径分隔符等会破坏目录结构的字符，避免生成非法路径。
 */
function tagSlug(name) {
  const cleaned = String(name ?? '')
    .trim()
    .replace(/[\\/:*?"<>|#%]+/g, '')
    .replace(/\.+$/, '')
    .trim();
  return cleaned || 'untagged';
}

/** 估算中文与英文混排的阅读时长（分钟）。 */
function readingMinutes(markdown) {
  const text = markdown.replace(/```[\s\S]*?```/g, ' ');
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  const minutes = chinese / 350 + words / 200;
  return Math.max(1, Math.round(minutes));
}

/** 从 Markdown 正文中提取纯文本摘要。 */
function makeExcerpt(markdown, limit = 110) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit)}……` : text;
}

/** 格式化日期用于显示。 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y} 年 ${m} 月 ${d} 日`;
}

/** 机器可读的日期（YYYY-MM-DD）。 */
function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 解析一篇 Markdown 文章，返回元数据与 HTML。 */
async function loadPost(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const { data, content } = matter(raw);
  const fileSlug = basename(filePath, extname(filePath));
  const title = String(data.title ?? fileSlug).trim();
  const slug = data.slug ? slugify(data.slug) : slugify(fileSlug === 'index' ? title : fileSlug);
  const date = parseDate(data.date);
  const tags = Array.isArray(data.tags)
    ? data.tags.map((t) => String(t).trim()).filter(Boolean)
    : String(data.tags ?? '')
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);

  const html = marked.parse(content, { gfm: true, breaks: false });

  return {
    title,
    slug,
    date,
    iso: isoDate(date),
    displayDate: formatDate(date),
    tags,
    summary: String(data.summary ?? '').trim() || makeExcerpt(content),
    minutes: readingMinutes(content),
    html,
    source: relative(root, filePath).replace(/\\/g, '/'),
    draft: Boolean(data.draft),
  };
}

/** 把 highlight.js 应用到正文中的代码块。 */
function highlightCode(html) {
  return html.replace(/<pre><code class="language-([\w-]+)">([\s\S]*?)<\/code><\/pre>/g, (match, lang, code) => {
    const language = hljs.getLanguage(lang) ? lang : null;
    try {
      const decoded = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      const result = language
        ? hljs.highlight(decoded, { language }).value
        : hljs.highlightAuto(decoded).value;
      return `<pre><code class="hljs language-${language ?? 'plaintext'}">${result}</code></pre>`;
    } catch {
      return match;
    }
  });
}

/** 写入文件，自动创建父目录。 */
async function writePage(relativePath, contents) {
  const target = join(distDir, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

/** 主流程。 */
async function build() {
  if (clean && existsSync(distDir)) {
    await rm(distDir, { recursive: true, force: true });
  }
  await mkdir(distDir, { recursive: true });

  // 1. 读取并解析文章
  let files = [];
  if (existsSync(postsDir)) {
    files = (await readdir(postsDir)).filter((f) => extname(f).toLowerCase() === '.md');
  }
  const all = await Promise.all(files.map((f) => loadPost(join(postsDir, f))));
  const posts = all
    .filter((p) => !p.draft)
    .sort((a, b) => b.date - a.date);

  // 2. 给正文加代码高亮
  for (const post of posts) {
    post.html = highlightCode(post.html);
  }

  // 3. 标签聚合
  const tagMap = new Map();
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag).push(post);
    }
  }
  const tags = [...tagMap.entries()]
    .map(([name, items]) => ({ name, slug: tagSlug(name), posts: items, count: items.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));

  // 4. 渲染页面
  // 标签名 → 目录名的映射，供文章列表与归档页生成链接
  const tagSlugs = Object.fromEntries(tags.map((t) => [t.name, t.slug]));
  const ctx = { site, posts, tags, tagSlugs };
  await writePage('index.html', renderHome(ctx));
  await writePage(join('archive', 'index.html'), renderArchive(ctx));
  await writePage(join('tags', 'index.html'), renderTags(ctx));
  await writePage(join('about', 'index.html'), renderAbout(ctx));

  for (const post of posts) {
    await writePage(join('posts', post.slug, 'index.html'), renderPost({ ...ctx, post }));
  }

  for (const tag of tags) {
    await writePage(join('tags', tag.slug, 'index.html'), renderTags({ ...ctx, activeTag: tag.name }));
  }

  // 5. 站点级文件
  await writePage('404.html', renderNotFound(ctx));
  await writePage('rss.xml', renderRss(ctx));
  await writePage('sitemap.xml', renderSitemap(ctx));
  await writePage('robots.txt', renderRobots(ctx));
  await writePage('.nojekyll', '');

  // 6. 样式表：把字体 @font-face 规则放在最前面，再拼接站点样式
  const fonts = await setupFonts(root, distDir);
  const style = await readFile(styleFile, 'utf8');
  await writePage('style.css', `${fonts.css}\n\n${style}`);

  // 7. 客户端脚本
  const clientScript = join(root, 'src', 'main.js');
  if (existsSync(clientScript)) {
    await cp(clientScript, join(distDir, 'main.js'));
  }

  // 8. 复制静态资源（favicon 等）
  if (existsSync(staticDir)) {
    await cp(staticDir, distDir, { recursive: true, force: true });
  }

  const count = posts.length;
  console.log(`✓ 构建完成：${count} 篇文章、${tags.length} 个标签`);
  if (fonts.count) console.log(`  字体分片：${fonts.count} 个 woff2`);
  console.log(`  输出目录：${relative(process.cwd(), distDir)}`);
}

build().catch((error) => {
  console.error('构建失败：', error);
  process.exitCode = 1;
});
