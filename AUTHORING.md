# 讲义制作规范

本站用 VitePress 构建。每一讲 = 一个 Markdown 文件 + 一个图片目录 + 若干本讲专用的交互组件。动笔前先把这份规范读完，再对照 `lectures/01.md` 看一遍各种容器渲染出来的样子。

## 目录约定

| 内容 | 位置 |
|---|---|
| 正文 | `lectures/<讲号>.md`，如 `lectures/03.md`（讲号即原书章号，两位补零） |
| 图片 | `public/img/<讲号>/<原书小节>-<语义>.<svg\|png\|jpg\|webp>`，如 `public/img/03/3.1-linear-regression.svg`，正文引用为 `/img/03/3.1-linear-regression.svg` |
| 本讲交互组件 | `.vitepress/theme/components/L<讲号><名字>.vue`，如 `L03SoftmaxDemo.vue`（必须放在 components 根目录，会被自动全局注册） |
| 本讲工具函数 | `.vitepress/theme/lib/l<讲号>.ts` |

**不要修改共享文件**：`custom.css`、`index.ts`、`Layout.vue`、`lib/store.ts`、`index.md`，以及 components 下不带 `L<讲号>` 前缀的通用组件，还有别的讲的文件。`config.mts` 只允许在 `nav`、`sidebar` 里加自己的那一讲。侧栏、首页和上一讲/下一讲链接由统稿人统一更新。

## 内容要求

1. **全中文**，术语首次出现时附英文：`<span class="en">tensor</span>`。
2. **小节编号跟着讲号走**：`## 3.1 …`、`### 3.1.1 …`，不要另起一套编号。
3. **原书图表一条不漏**。图能用代码画的，改写成 SVG 或交互组件（优先，深色模式友好）；其余位图存进 `public/img/<讲号>/`，最长边超过 1600px 的缩小，带透明通道的存 `.webp`，其余存 `.jpg`（quality 86）。
4. **每节都要有能跑的代码**。本站叫“动手学”，概念讲完就要给出可执行的最小例子，紧接着贴运行结果。代码块标语言（`py` / `sh` / `text`），输出用 `<div class="out prose">…</div>`。
5. **不遗漏内容**：每个定义、公式、图、例子、代码、练习、脚注都要有。原书重复啰嗦的地方可以压缩，但不能少知识点。
6. **出处标签**：每个小节、定义框、图都标原书章节号（`@3.1` 或 `<Src s="3.1" />`），方便读者回查。
7. **原书的“小结 / 练习”** 分别做成 `::: tldr`（一句话）与 `::: exer`（练习照抄题号）。
8. 自己补充的解释标“补充说明”。发现原书有错或不严谨的地方，保留原文并用灰字 `<span class="muted">（补充：……）</span>` 注释，不要直接改。
9. **推导要写完整**，每一步说明依据（用了哪条链式法则、哪个假设），不要跳步。
10. 每讲最后放“★ 本讲速记”（`:::: recap`）和延伸阅读。
11. 正文不要引用读者看不到的文件（本地笔记、作业、未公开资料等）。

## Markdown 骨架

```md
<div class="lec-kicker">DIVE INTO DEEP LEARNING · LECTURE 03</div>

# 线性神经网络

<p class="lead">一段导语：这讲解决什么问题，读完能动手做什么。</p>

<Chips :items="['对应原书第 3 章', 'N 个交互演示', '阅读约 X 分钟']" />

<div class="ctrl"><RevealAll /><span class="muted" style="font-size:13px">图例：<span class="src">§3.1</span> 为原书章节 · Q 卡先想再看 · 点击图片可放大</span></div>

<div class="part-label">PART 1 · 线性回归</div>

## 3.1 小节标题

::: def 定义名 @3.1
内容，可以有 $公式$ 和列表
:::

::: ex [自定义标签] 标题 @3.1
:::

::: qa 问题文字 @3.1
答案
:::

::: tldr
一句话总结
:::

:::: recap
::: card 卡片标题
- 要点
:::
::::

行内出处：<Src s="3.1" />
图片：<Fig src="/img/03/3.1-linear-regression.svg" cap="说明" s="3.1" />      size="sm" / "md" 可选；原书给了像素宽度就加 w="500"，按原样还原
并排：<FigGrid> 两个 <Fig> </FigGrid>，更高用 <FigGrid tall>
双栏：<Cols ratio="1fr 1.2fr"> 左文右图 </Cols>
交互组件：<L03SoftmaxDemo />（单独一行，前后空行）
表格题注：<div class="tab-cap">表 3.4.1　标题 <span class="src">§3.4</span></div> 放在表格上方
```

注意事项：

- 正文里不要出现 `{{`（会被 Vue 当成插值）。
- 提示框共六种：`def` 定义、`prin` 原则、`ex` 示例、`warn` 注意、`exam` 核心、`exer` 练习。
- 公式用 `$…$` 和 `$$…$$`（构建时由 MathJax 渲染），不要用图片代替公式。
- 表格用标准 Markdown 表格；需要等宽对齐的数值表，直接写 `<table class="mapping">`。

## 交互组件规范

- 用 `<Widget title="标题">` 包裹，内部只用全局类：`.ctrl`、`.btn`、`.btn.primary`、`.seg`（按钮组，选中项加 `.on`）、`.out`（输出框，可加 `.prose`）、`.stats` / `.stat`、`.cell`、`.mini-table`、`.widget-note`。
- 颜色一律走 CSS 变量（否则深色模式会坏）：`var(--accent)`、`var(--accent-soft)`、`var(--ink)`、`var(--ink-2)`、`var(--ink-3)`、`var(--line)`、`var(--line-2)`、`var(--paper)`、`var(--vp-c-bg)`、`var(--ex)`、`var(--warn)`、`var(--prin)`，以及对应的 `-bg`。SVG 里写成 `style="fill:var(--accent)"`，不能写 `fill="var(...)"`。
- 不要在 setup 顶层访问 `window` / `document`（构建时会做服务端渲染），需要时放进 `onMounted`。
- 组件要真正帮助理解：让读者调参数看结果、一步一步跑完某个过程，或者亲手玩一个反直觉的实验。每讲 3–8 个，宁缺毋滥。
- 不引入新的运行时依赖；计算量大的演示要能在一帧内算完。

## 自检

完成后在仓库根目录运行：

```bash
npm run build
```

必须构建通过、无报错、无死链。再确认：

- 正文没有残留的 `:::` 语法错误（提示框都成对闭合）；
- 引用的每张图都在 `public/img/<讲号>/` 下存在；
- 目录里列出的每张图都在正文里被引用；
- `sidebar` 里已加上这一讲，上一讲/下一讲能正常跳转。
