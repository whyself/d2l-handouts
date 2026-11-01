# 动手学深度学习讲义

《动手学深度学习》（Dive into Deep Learning）的中文交互式整理讲义。每讲对应原书一章：概念讲清楚之后，再配一个能动手的小组件把直觉跑一遍。

网站基于 VitePress 构建，视觉与结构沿用 [crypto-handouts](https://github.com/whyself/crypto-handouts) 的规范：暖纸底、陶土橙主色、带色边的提示框、先想再看的 Q 卡、原书图表全部重绘或收录。

> 当前状态：**骨架已完成，正文待撰写**。主题、组件、容器语法、写作规范与部署流水线都已就位，按 [AUTHORING.md](AUTHORING.md) 逐讲补写即可。

## 本地预览

```bash
npm install
npm run dev
```

构建静态站点：

```bash
npm run build      # 产物在 .vitepress/dist
npm run preview    # 本地预览构建结果
```

## 目录结构

```
.
├─ index.md                 # 首页（hero + 分部分介绍）
├─ lectures/
│  └─ index.md              # 讲义目录、阅读约定、章节规划
├─ public/img/<讲号>/        # 本讲用到的图片，按讲号分目录
├─ .vitepress/
│  ├─ config.mts            # 站点配置、侧栏、容器语法插件
│  └─ theme/
│     ├─ custom.css         # 全部颜色与排版变量都在这里
│     ├─ index.ts           # 注册全局组件
│     ├─ Layout.vue         # 挂载图片放大层
│     ├─ components/        # 通用组件 + 各讲专用交互组件
│     └─ lib/               # 各讲专用工具函数
└─ AUTHORING.md             # 讲义制作规范（不参与构建）
```

## 新增一讲

1. 新建 `lectures/<讲号>.md`，照 AUTHORING.md 里的骨架写。
2. 图片放 `public/img/<讲号>/`，正文用 `/img/<讲号>/<文件名>` 引用。
3. 本讲专用组件放 `.vitepress/theme/components/L<讲号><名字>.vue`，会被自动全局注册。
4. 在 `.vitepress/config.mts` 的 `sidebar` 里加上这一讲。
5. `npm run build` 通过后提交。

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages（见 `.github/workflows/deploy.yml`）。首次使用需在仓库 Settings → Pages 里把 Source 设为 GitHub Actions。

站点部署在 `https://<用户名>.github.io/d2l-handouts/`，因此 `config.mts` 里 `base` 固定为 `'/d2l-handouts/'`。仓库改名时记得同步修改。

## 版权

原书《动手学深度学习》内容与图表的版权归原作者所有，本站仅用于学习交流。正文中的补充说明为本站原创。
