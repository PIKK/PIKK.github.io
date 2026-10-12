/**
 * 站点级配置。改这里就能改全站的标题、导航和 SEO 信息。
 * 部署到 GitHub Pages 后，url 需与仓库地址一致。
 */
export default {
  // 站点标题，显示在页头与浏览器标签
  title: 'PIKK 的博客',
  // 页头下方的一句话简介
  tagline: '写点代码，记点想法',
  // 用于 SEO 与 RSS 的描述
  description: 'PIKK 的个人博客：技术笔记、项目记录与日常思考。',
  // 作者署名，显示在文章页与页脚
  author: 'PIKK',
  // 页头印章中的字
  seal: '记',
  // 站点根地址，末尾不要带斜杠
  url: 'https://pikk.github.io',
  // 页面语言
  lang: 'zh-CN',
  // 时区偏移（小时），用于生成 RSS 时间
  timezoneOffset: 8,
  // 顶部导航
  nav: [
    { text: '首页', url: '/' },
    { text: '归档', url: '/archive/' },
    { text: '标签', url: '/tags/' },
    { text: '关于', url: '/about/' },
  ],
  // 页脚显示的文字
  footerNote: '本页由 Markdown 与一点耐心构成',
};
