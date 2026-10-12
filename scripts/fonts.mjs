/**
 * 字体处理。
 * 中文字体体积大，这里把 npm 包中按 unicode-range 切好的 woff2 分片
 * 复制到 dist/fonts/，浏览器只会下载页面实际用到的那几片。
 * 依赖从 node_modules 读取，因此不需要把字体文件提交进仓库。
 */
import { readFile, writeFile, mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CJK_PACKAGE = 'lxgw-wenkai-webfont';
const CJK_WEIGHTS = ['regular', 'bold'];
const MONO_PACKAGE = '@fontsource/jetbrains-mono';
const MONO_WEIGHTS = ['400', '700'];

/**
 * 复制中文字体分片并生成对应的 @font-face 规则。
 * 返回生成的 CSS 文本与复制到的文件数量。
 */
async function setupCjkFonts(modulesDir, fontsDir) {
  const packageDir = join(modulesDir, CJK_PACKAGE);
  if (!existsSync(packageDir)) {
    return { css: '', count: 0, skipped: true };
  }

  const rules = [];
  let count = 0;

  for (const weight of CJK_WEIGHTS) {
    const cssFile = join(packageDir, `lxgwwenkai-${weight}.css`);
    if (!existsSync(cssFile)) continue;

    // 原 CSS 里字体路径是 './files/xxx.woff2'，改写为站点绝对路径
    const source = await readFile(cssFile, 'utf8');
    rules.push(source.replace(/url\(['"]?\.\/files\//g, "url('/fonts/"));

    const prefix = `lxgwwenkai-${weight}-subset-`;
    const files = (await readdir(join(packageDir, 'files'))).filter(
      (f) => f.startsWith(prefix) && f.endsWith('.woff2')
    );
    for (const file of files) {
      await copyFile(join(packageDir, 'files', file), join(fontsDir, file));
      count += 1;
    }
  }

  return { css: rules.join('\n'), count, skipped: false };
}

/** 复制等宽字体（只取 latin 子集）并生成 @font-face 规则。 */
async function setupMonoFonts(modulesDir, fontsDir) {
  const packageDir = join(modulesDir, MONO_PACKAGE);
  if (!existsSync(packageDir)) {
    return { css: '', count: 0, skipped: true };
  }

  const rules = [];
  let count = 0;

  for (const weight of MONO_WEIGHTS) {
    const file = `jetbrains-mono-latin-${weight}-normal.woff2`;
    const source = join(packageDir, 'files', file);
    if (!existsSync(source)) continue;

    await copyFile(source, join(fontsDir, file));
    count += 1;

    rules.push(`@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('/fonts/${file}') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}`);
  }

  return { css: rules.join('\n'), count, skipped: false };
}

/**
 * 准备字体：复制分片到 dist/fonts/，返回需要注入到样式表前面的 CSS。
 * @param {string} root 项目根目录
 * @param {string} distDir 输出目录
 */
export async function setupFonts(root, distDir) {
  const modulesDir = join(root, 'node_modules');
  const fontsDir = join(distDir, 'fonts');
  await mkdir(fontsDir, { recursive: true });

  const cjk = await setupCjkFonts(modulesDir, fontsDir);
  const mono = await setupMonoFonts(modulesDir, fontsDir);

  if (cjk.skipped || mono.skipped) {
    console.warn('  ! 字体依赖缺失，已退回系统字体。请先运行 npm install。');
  }

  return {
    css: [cjk.css, mono.css].filter(Boolean).join('\n'),
    count: cjk.count + mono.count,
  };
}
