---
title: 这个博客支持的 Markdown 写法
date: 2026-10-10
tags: [建站, 说明]
summary: 一份给自己的速查表：标题、代码、表格、引用、图片等都怎么写。
---

给自己留一份速查表，免得每次写的时候还要翻文档。

## 基础排版

### 文字

**加粗**、*斜体*、~~删除线~~、`行内代码`，还有[链接](https://github.com/)。

### 标题

用 `##` 到 `####`。二级标题会带一条朱砂色的竖线，三级以下就朴素一些。

## 列表

无序列表：

- 第一项
- 第二项
  - 嵌套一层
- 第三项

有序列表：

1. 先做这个
2. 再做那个
3. 最后收尾

## 代码

行内代码用反引号包起来，比如 `std::vector<int>`。

代码块标注语言就能高亮：

```cpp
class Scanner {
public:
    explicit Scanner(QObject *parent = nullptr) : QObject(parent) {}

    void start(const QString &path) {
        if (path.isEmpty()) {
            emit failed(QStringLiteral("路径为空"));
            return;
        }
        m_path = path;
        emit started();
    }

private:
    QString m_path;
};
```

不带语言标注也可以，会自动判断：

```
$ npm run build
✓ 构建完成：3 篇文章、5 个标签
```

## 引用与分隔线

> 引用适合放别人的话，或者需要强调的结论。
>
> 可以写多段。

分隔线用三个短横线：

---

## 表格

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 文章标题，必填 |
| `date` | date | 发布日期，影响排序 |
| `tags` | array | 标签列表 |

## 图片

```markdown
![图片说明](/images/example.png)
```

图片放在 `src/static/` 目录下，构建时会复制到站点根目录。建议压缩后再提交，毕竟仓库不是图床。

## 小结

写得最多的其实还是段落和代码块，其他的用到再查就行。
