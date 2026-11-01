<script setup lang="ts">
import { ref, computed } from 'vue'

// 《时光机器》开头 800 个词（公有领域），已按原书 read_time_machine 的方式去标点、转小写
const CORPUS = [
  'the time machine by h g wells i the time traveller for so it will be convenient to speak of',
  'him was expounding a recondite matter to us his grey eyes shone and twinkled and his usually pale face was',
  'flushed and animated the fire burned brightly and the soft radiance of the incandescent lights in the lilies of silver',
  'caught the bubbles that flashed and passed in our glasses our chairs being his patents embraced and caressed us rather',
  'than submitted to be sat upon and there was that luxurious after dinner atmosphere when thought roams gracefully free of',
  'the trammels of precision and he put it to us in this way marking the points with a lean forefinger',
  'as we sat and lazily admired his earnestness over this new paradox as we thought it and his fecundity you',
  'must follow me carefully i shall have to controvert one or two ideas that are almost universally accepted the geometry',
  'for instance they taught you at school is founded on a misconception is not that rather a large thing to',
  'expect us to begin upon said filby an argumentative person with red hair i do not mean to ask you',
  'to accept anything without reasonable ground for it you will soon admit as much as i need from you you',
  'know of course that a mathematical line a line of thickness nil has no real existence they taught you that',
  'neither has a mathematical plane these things are mere abstractions that is all right said the psychologist nor having only',
  'length breadth and thickness can a cube have a real existence there i object said filby of course a solid',
  'body may exist all real things so most people think but wait a moment can an instantaneous cube exist don',
  't follow you said filby can a cube that does not last for any time at all have a real',
  'existence filby became pensive clearly the time traveller proceeded any real body must have extension in four directions it must',
  'have length breadth thickness and duration but through a natural infirmity of the flesh which i will explain to you',
  'in a moment we incline to overlook this fact there are really four dimensions three which we call the three',
  'planes of space and a fourth time there is however a tendency to draw an unreal distinction between the former',
  'three dimensions and the latter because it happens that our consciousness moves intermittently in one direction along the latter from',
  'the beginning to the end of our lives that said a very young man making spasmodic efforts to relight his',
  'cigar over the lamp that very clear indeed now it is very remarkable that this is so extensively overlooked continued',
  'the time traveller with a slight accession of cheerfulness really this is what is meant by the fourth dimension though',
  'some people who talk about the fourth dimension do not know they mean it it is only another way of',
  'looking at time there is no difference between time and any of the three dimensions of space except that our',
  'consciousness moves along it but some foolish people have got hold of the wrong side of that idea you have',
  'all heard what they have to say about this fourth dimension i have not said the provincial mayor it is',
  'simply this that space as our mathematicians have it is spoken of as having three dimensions which one may call',
  'length breadth and thickness and is always definable by reference to three planes each at right angles to the others',
  'but some philosophical people have been asking why three dimensions particularly why not another direction at right angles to the',
  'other three and have even tried to construct a four dimension geometry professor simon newcomb was expounding this to the',
  'new york mathematical society only a month or so ago you know how on a flat surface which has only',
  'two dimensions we can represent a figure of a three dimensional solid and similarly they think that by models of',
  'three dimensions they could represent one of four if they could master the perspective of the thing see i think',
  'so murmured the provincial mayor and knitting his brows he lapsed into an introspective state his lips moving as one',
  'who repeats mystic words yes i think i see it now he said after some time brightening in a quite',
  'transitory manner well i do not mind telling you i have been at work upon this geometry of four dimensions',
  'for some time some of my results are curious for instance here is a portrait of a man at eight',
  'years old another at fifteen another at seventeen another at twenty three and so on all these are evidently sections'
]

const tokens: string[] = []
for (const line of CORPUS) for (const w of line.split(/\s+/)) if (w) tokens.push(w)

const n = ref(1)

const grams = computed(() => {
  const size = n.value
  const c = new Map<string, number>()
  for (let i = 0; i + size <= tokens.length; i++) {
    const g = tokens.slice(i, i + size).join(' ')
    c.set(g, (c.get(g) || 0) + 1)
  }
  return [...c.entries()].sort((a, b) => b[1] - a[1])
})

const fit = computed(() => {
  const pts = grams.value.map((g, i) => ({ x: Math.log10(i + 1), y: Math.log10(g[1]) }))
  const m = pts.length
  const mx = pts.reduce((s, p) => s + p.x, 0) / m
  const my = pts.reduce((s, p) => s + p.y, 0) / m
  let num = 0
  let den = 0
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
  }
  const a = den ? num / den : 0
  return { a, b: my - a * mx }
})

const once = computed(() => {
  const ones = grams.value.filter(g => g[1] === 1).length
  return grams.value.length ? ones / grams.value.length : 0
})

// 画布
const W = 600
const H = 240
const L = 44
const B = 30
const R = 12
const Tp = 12
const xmax = computed(() => Math.max(1, Math.log10(grams.value.length)))
const ymax = computed(() => Math.max(1, Math.log10(grams.value[0]?.[1] ?? 1)))
const px = (lx: number) => L + (lx / xmax.value) * (W - L - R)
const py = (ly: number) => H - B - (ly / ymax.value) * (H - B - Tp)

const dots = computed(() =>
  grams.value.map((g, i) => ({
    cx: px(Math.log10(i + 1)),
    cy: py(Math.log10(g[1])),
    key: i
  }))
)

const line = computed(() => {
  const y0 = py(fit.value.b)
  const y1 = py(fit.value.a * xmax.value + fit.value.b)
  return `M${px(0).toFixed(1)},${y0.toFixed(1)} L${px(xmax.value).toFixed(1)},${y1.toFixed(1)}`
})

const xTicks = computed(() => {
  const out: { v: number; x: number }[] = []
  for (const v of [1, 10, 100, 1000]) {
    if (Math.log10(v) <= xmax.value) out.push({ v, x: px(Math.log10(v)) })
  }
  return out
})
const yTicks = computed(() => {
  const out: { v: number; y: number }[] = []
  for (const v of [1, 10, 100]) {
    if (Math.log10(v) <= ymax.value) out.push({ v, y: py(Math.log10(v)) })
  }
  return out
})
</script>

<template>
  <Widget title="n 元语法：头部几个词吃掉一切，尾部几乎全是只出现一次的 n 元组">
    <p class="widget-note">
      语料是《时光机器》开头 800 个词。把语料切成 1 元、2 元、3 元组，按出现次数排序，画在双对数坐标上：横轴是名次，纵轴是频次。虚线是在双对数坐标里做的最小二乘拟合，斜率就是 −α。切不同的 n，看头有多尖、尾有多长。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button type="button" :class="{ on: n === 1 }" @click="n = 1">一元语法</button>
        <button type="button" :class="{ on: n === 2 }" @click="n = 2">二元语法</button>
        <button type="button" :class="{ on: n === 3 }" @click="n = 3">三元语法</button>
      </div>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;max-width:600px">
      <line :x1="L" :y1="H - B" :x2="W - R" :y2="H - B" style="stroke:var(--line)" />
      <line :x1="L" :y1="Tp" :x2="L" :y2="H - B" style="stroke:var(--line)" />
      <g v-for="t in xTicks" :key="'x' + t.v">
        <line :x1="t.x" :y1="H - B" :x2="t.x" :y2="H - B + 4" style="stroke:var(--line)" />
        <text :x="t.x" :y="H - B + 16" text-anchor="middle" style="fill:var(--ink-3);font-size:11">{{ t.v }}</text>
      </g>
      <g v-for="t in yTicks" :key="'y' + t.v">
        <line :x1="L - 4" :y1="t.y" :x2="L" :y2="t.y" style="stroke:var(--line)" />
        <text :x="L - 7" :y="t.y + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">{{ t.v }}</text>
      </g>
      <text :x="L - 30" :y="Tp - 2" style="fill:var(--ink-3);font-size:11">频次</text>
      <text :x="W - R" :y="H - 6" text-anchor="end" style="fill:var(--ink-3);font-size:11">名次（都是对数轴）</text>

      <circle v-for="d in dots" :key="d.key" :cx="d.cx" :cy="d.cy" r="1.9" style="fill:var(--accent);opacity:.6" />
      <path :d="line" style="stroke:var(--prin);stroke-width:1.6;fill:none;stroke-dasharray:5 4" />
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ tokens.length }}</b><span>语料词元总数</span></div>
      <div class="stat"><b>{{ grams.length }}</b><span>唯一的 {{ n }} 元组</span></div>
      <div class="stat"><b>{{ (-fit.a).toFixed(2) }}</b><span>拟合出的指数 α</span></div>
      <div class="stat"><b>{{ (once * 100).toFixed(0) }}%</b><span>只出现过一次的 {{ n }} 元组</span></div>
    </div>

    <table class="mini-table">
      <thead>
        <tr><th>名次</th><th>{{ n }} 元组</th><th>频次</th></tr>
      </thead>
      <tbody>
        <tr v-for="(g, i) in grams.slice(0, 6)" :key="g[0]">
          <td>{{ i + 1 }}</td>
          <td style="font-family:var(--vp-font-family-mono)">{{ g[0] }}</td>
          <td>{{ g[1] }}</td>
        </tr>
      </tbody>
    </table>

    <p class="widget-note" style="margin:10px 0 0">
      越往右名次越大、频次越低，散点沿一条斜向下的带子铺开，这就是齐普夫定律的粗略形状：n_i 大致正比于 1/i^α。n 从 1 增到 3，唯一 n 元组的数量从几百涨到接近语料长度，而「只出现一次」的比例一路升到 95% 以上——尾部全挤在频次 1 上，虚线也因此被拉平。注意这是 800 词的片段：原书用整本《时光机器》（32775 词）算出来，α 分别是 1.02、0.45、0.16，位置更高、线更陡，但「头部集中于 the/of/and 这类词、尾部一大片只出现一次」的结构完全一样。正因如此，靠计数加平滑去覆盖尾部不可行，才要转向能压缩表示的模型——也就是下一个演示里的 RNN。
    </p>
  </Widget>
</template>
