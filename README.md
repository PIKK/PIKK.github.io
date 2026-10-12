# PIKK 的博客

纯静态个人博客：文章用 Markdown 写，构建成静态 HTML，托管在 GitHub Pages。
没有服务端、没有数据库，也没有追踪脚本。

## 写作

在 `posts/` 目录新建一个 `.md` 文件即可，文件名会成为文章链接。

```markdown
---
title: 文章标题
date: 2026-10-12
tags: [笔记, Qt]
summary: 可选，不写会自动从正文截取。
draft: false
---

正文用 Markdown 写。支持代码高亮、表格、引用等。
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `date` | 建议 | `YYYY-MM-DD`，用于排序与归档 |
| `tags` | 否 | 数组或逗号分隔 |
| `summary` | 否 | 列表页摘要，缺省自动截取 |
| `slug` | 否 | 自定义链接地址，缺省用文件名 |
| `draft` | 否 | 写 `true` 则构建时跳过 |

## 本地预览

```bash
npm install     # 首次
npm run dev     # 构建并启动预览 http://localhost:4173
```

只想重新构建：

```bash
npm run build
```

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages，
配置见 `.github/workflows/deploy.yml`。

本仓库已把 Pages 的 Source 设为 **GitHub Actions**（Settings → Pages）。
如果换了仓库，记得在新仓库里做同样设置，否则发布步骤会失败。

线上地址：<https://pikk.github.io/>

## 日常流程

```bash
# 1. 在 posts/ 里写一篇新的 Markdown
# 2. 本地预览确认效果
npm run dev

# 3. 提交并推送，CI 会自动构建发布
git add -A
git commit -m "新增文章：xxx"
git push
```

构建失败时，在仓库的 **Actions** 标签页可以看到具体日志；
`npm run check` 会校验死链和缺失资源，CI 里也会执行这一步。

## 站点配置

站点标题、简介、导航、作者等信息都在 `site.config.mjs` 里，改完重新构建即可。

## 目录结构

```
posts/              文章源文件（Markdown）
src/
  templates.mjs     页面模板
  style.css         样式
  main.js           浏览器端交互
  feeds.mjs         RSS / sitemap / robots
  static/           直接复制的静态资源
scripts/
  build.mjs         构建入口
  fonts.mjs         字体分片处理
  serve.mjs         本地预览服务器
site.config.mjs     站点配置
dist/               构建产物（不提交）
```
