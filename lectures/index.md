<div class="lec-kicker">DIVE INTO DEEP LEARNING · 讲义</div>

# 讲义目录

<p class="lead">每一讲对应原书的一章：先把概念讲清楚，再用一个能动手的小组件把它跑一遍。仓库目前只完成骨架——主题、组件、容器语法与写作规范都已就位，正文将按 <code>AUTHORING.md</code> 逐讲补写。</p>

<Chips :items="['依据 d2l.ai 中文版', '原书图表重绘', '每讲 3–8 个交互演示', '状态：正文待撰写']" />

<div class="part-label">PART 1 · 阅读约定</div>

## 1.1 一页讲义的结构

每讲以 kicker 起头（英文栏目名 + 讲号），接一句导语和几枚信息胶囊，然后按小节展开。正文里的每个定义、示例、易错点、练习都用带色边的提示框区分，读者扫一眼颜色就知道该认真读还是可以先跳过。

<RevealAll /> 用于一次展开全页的问题卡，正文里每节末尾还有一句话总结。

## 1.2 六种提示框

::: def 定义名 @2.1
定义正文。术语首次出现时附英文，如 <span class="en">tensor</span>；公式照常用 $y = \mathbf{w}^\top \mathbf{x} + b$ 写。
:::

::: warn 注意 @2.1
容易踩的坑放这里。原书某处不严谨时保留原文，再用灰字 <span class="muted">（补充：……）</span> 注明。
:::

::: exer 练习 @2.1
原书每节末尾的练习放这里，题号照抄，答案另起一段。
:::

另外还有 <span class="hl">prin</span>（原则）、<span class="hl">ex</span>（示例）、<span class="hl">exam</span>（核心）三种，写法与上面一致。

## 1.3 先想再看

::: qa 一个问题的标题 @2.2
答案默认模糊，读者先自己想一想，点开后再看。答案里同样可以放列表、公式和代码。
:::

## 1.4 出处标签

行内标注原书章节：<Src s="2.1" />。容器标题末尾写 `@2.1`，就会渲染成同样的标签；图片用 `<Fig src="/img/03/xxx.svg" cap="说明" s="3.5" />`，图注右侧自动带上出处。

## 1.5 一句话总结与速记卡

::: tldr
每节末尾一句话，把这节的结论压成一行。
:::

:::: recap
::: card 卡片标题
- 全讲结束时用它做速记，两列排布
- 想占满整行就加 `wide`
:::
::::

<div class="part-label">PART 2 · 章节规划</div>

## 2.1 章节规划

讲号即文件名：`lectures/03.md`；图片放 `public/img/03/`；本讲专用组件命名 `L03Xxx.vue`。

| 讲 | 主题 | 原书 | 状态 |
| --- | --- | --- | --- |
| 01 | 引言 | §1 | <span class="muted">待撰写</span> |
| 02 | 预备知识 | §2 | <span class="muted">待撰写</span> |
| 03 | 线性神经网络 | §3 | <span class="muted">待撰写</span> |
| 04 | 多层感知机 | §4 | <span class="muted">待撰写</span> |
| 05 | 深度学习计算 | §5 | <span class="muted">待撰写</span> |
| 06 | 卷积神经网络 | §6 | <span class="muted">待撰写</span> |
| 07 | 现代卷积神经网络 | §7 | <span class="muted">待撰写</span> |
| 08 | 循环神经网络 | §8 | <span class="muted">待撰写</span> |
| 09 | 现代循环神经网络 | §9 | <span class="muted">待撰写</span> |
| 10 | 注意力机制 | §10 | <span class="muted">待撰写</span> |
| 11 | 优化算法 | §11 | <span class="muted">待撰写</span> |
| 12 | 计算性能 | §12 | <span class="muted">待撰写</span> |
| 13 | 计算机视觉 | §13 | <span class="muted">待撰写</span> |
| 14 | 自然语言处理：预训练 | §14 | <span class="muted">待撰写</span> |
| 15 | 自然语言处理：应用 | §15 | <span class="muted">待撰写</span> |

## 2.2 开始写作

1. 读一遍 `AUTHORING.md` 里的目录约定、容器语法和讲义骨架。
2. 新建 `lectures/<讲号>.md`，图片放进 `public/img/<讲号>/`。
3. 在 `.vitepress/config.mts` 的 `sidebar` 里添上这一讲。
4. `npm run dev` 本地预览，`npm run build` 自查一遍再提交。
