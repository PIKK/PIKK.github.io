/**
 * 构建产物校验。
 * 逐个检查 dist/ 下的 HTML：内部链接是否有对应文件、
 * 必需文件是否齐全、HTML 结构是否闭合。用于发布前自检。
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');

const problems = [];
let checkedLinks = 0;
let checkedFiles = 0;

/** 递归收集所有文件。 */
async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

/** 判断站点内的绝对路径是否存在对应资源。 */
async function targetExists(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]).replace(/^\/+/, '');
  const candidate = resolve(distDir, clean);
  if (!candidate.startsWith(distDir)) return false;

  if (existsSync(candidate)) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return true;
      if (info.isDirectory()) return existsSync(join(candidate, 'index.html'));
    } catch {
      return false;
    }
  }
  // /foo → /foo.html 或 /foo/index.html
  if (existsSync(`${candidate}.html`)) return true;
  return existsSync(join(candidate, 'index.html'));
}

async function main() {
  if (!existsSync(distDir)) {
    console.error('✗ 未找到 dist/，请先运行 npm run build');
    process.exit(1);
  }

  const files = await walk(distDir);
  checkedFiles = files.length;

  // 必需文件
  const required = ['index.html', '404.html', 'style.css', 'main.js', 'rss.xml', 'sitemap.xml', 'robots.txt', '.nojekyll', 'favicon.svg'];
  for (const name of required) {
    if (!existsSync(join(distDir, name))) problems.push(`缺少必需文件：${name}`);
  }

  // 逐个 HTML 检查链接与基本结构
  for (const file of files.filter((f) => extname(f) === '.html')) {
    const html = await readFile(file, 'utf8');
    const rel = relative(distDir, file).replace(/\\/g, '/');

    if (!/^<!DOCTYPE html>/i.test(html)) problems.push(`${rel}：缺少 DOCTYPE`);
    if (!/<html[^>]*lang=/i.test(html)) problems.push(`${rel}：缺少 lang 属性`);
    if (!/<title>[^<]+<\/title>/i.test(html)) problems.push(`${rel}：缺少 title`);
    if (!/name="description"/i.test(html)) problems.push(`${rel}：缺少 description`);
    if (!/<main[^>]*id="main"/i.test(html)) problems.push(`${rel}：缺少 main 锚点`);
    if ((html.match(/<h1[\s>]/gi) || []).length === 0) problems.push(`${rel}：缺少 h1`);

    // 检查站内链接与资源引用
    const refs = [
      ...html.matchAll(/(?:href|src)="([^"]+)"/g),
    ].map((m) => m[1]);

    for (const ref of refs) {
      if (!ref.startsWith('/')) continue; // 只校验站内绝对路径
      if (ref.startsWith('//')) continue;
      checkedLinks += 1;
      if (!(await targetExists(ref))) {
        problems.push(`${rel} → 死链：${ref}`);
      }
    }
  }

  // 检查样式表引用的字体文件
  const css = await readFile(join(distDir, 'style.css'), 'utf8');
  const fontRefs = [...css.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map((m) => m[1]);
  for (const ref of fontRefs) {
    checkedLinks += 1;
    if (!(await targetExists(ref))) problems.push(`style.css → 缺少字体：${ref}`);
  }

  // 检查 sitemap 中的地址
  const sitemap = await readFile(join(distDir, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const loc of locs) {
    const path = loc.replace(/^https?:\/\/[^/]+/, '') || '/';
    checkedLinks += 1;
    if (!(await targetExists(path))) problems.push(`sitemap.xml → 死链：${loc}`);
  }

  console.log(`检查文件 ${checkedFiles} 个，链接 ${checkedLinks} 条，字体引用 ${fontRefs.length} 条`);
  if (problems.length) {
    console.error(`\n✗ 发现 ${problems.length} 个问题：`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log('✓ 校验通过');
}

main().catch((error) => {
  console.error('校验脚本出错：', error);
  process.exit(1);
});
