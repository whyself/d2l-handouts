<script setup lang="ts">
import { ref, computed } from 'vue'

// 四个 XOR 样本：(0,0)->0, (0,1)->1, (1,0)->1, (1,1)->0
const PTS = [
  { x: 0, y: 0, t: 0 },
  { x: 0, y: 1, t: 1 },
  { x: 1, y: 0, t: 1 },
  { x: 1, y: 1, t: 0 },
]

const mode = ref<'linear' | 'hidden'>('linear')
const w1 = ref(1)
const w2 = ref(1)
const b = ref(-0.5)

const SIZE = 300
const PAD = 34
const s = (v: number) => PAD + v * (SIZE - PAD * 2)

// 用半平面裁剪多边形：只保留 f(p) >= 0 的部分
function clip(poly: [number, number][], f: (x: number, y: number) => number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const c = poly[(i + 1) % poly.length]
    const fa = f(a[0], a[1])
    const fc = f(c[0], c[1])
    if (fa >= 0) out.push(a)
    if (fa >= 0 !== fc >= 0) {
      const t = fa / (fa - fc)
      out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t])
    }
  }
  return out
}

const SQUARE: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
]

const toPath = (poly: [number, number][]) =>
  poly.length < 3
    ? ''
    : 'M' + poly.map((p) => `${s(p[0]).toFixed(1)},${s(p[1]).toFixed(1)}`).join(' L') + ' Z'

const posScore = (x: number, y: number) => w1.value * x + w2.value * y + b.value
// 两个隐藏单元：h1 阈 0.5、权重 1；h2 阈 1.5、权重 -5。
// 输出在 0.5 < x1+x2 < 1.75 时为正，恰好覆盖 XOR 的正类两个角。
const S_HI = 1.75
const hiddenScore = (x: number, y: number) => {
  const t = x + y
  return Math.max(t - 0.5, 0) - 5 * Math.max(t - 1.5, 0)
}

const posFill = computed(() => toPath(clip(SQUARE, posScore)))
const band = computed(() => {
  const p = clip(clip(SQUARE, (x, y) => x + y - 0.5), (x, y) => S_HI - (x + y))
  return toPath(p)
})
const lowFill = computed(() => toPath(clip(SQUARE, (x, y) => 0.5 - (x + y))))
const highFill = computed(() => toPath(clip(SQUARE, (x, y) => x + y - S_HI)))

const linePts = computed(() => {
  if (Math.abs(w2.value) < 0.05) return null
  return { y0: s(-b.value / w2.value), y1: s((-w1.value - b.value) / w2.value) }
})

const pred = (p: { x: number; y: number }) =>
  mode.value === 'linear' ? posScore(p.x, p.y) >= 0 : hiddenScore(p.x, p.y) > 0

const errors = computed(() => PTS.filter((p) => pred(p) !== (p.t === 1)).length)
const acts = computed(() => PTS.map((p) => hiddenScore(p.x, p.y)))
</script>

<template>
  <Widget title="单层感知机跨不过 XOR，加一层隐藏层就跨过去了">
    <p class="widget-note">
      四个点摆成正方形，对角同色。这就是异或问题：一条直线永远分不开它，但两条直线拼出来的折带可以。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button type="button" :class="{ on: mode === 'linear' }" @click="mode = 'linear'">单层（一条直线）</button>
        <button type="button" :class="{ on: mode === 'hidden' }" @click="mode = 'hidden'">加隐藏层（两条直线）</button>
      </div>
      <button
        v-if="mode === 'linear'"
        class="btn"
        type="button"
        @click="((w1 = 1), (w2 = 1), (b = -0.5))"
      >
        试“最好”的那组
      </button>
    </div>

    <div v-if="mode === 'linear'" class="ctrl">
      <label>w₁ <input v-model.number="w1" type="range" min="-3" max="3" step="0.1" /> {{ w1.toFixed(1) }}</label>
      <label>w₂ <input v-model.number="w2" type="range" min="-3" max="3" step="0.1" /> {{ w2.toFixed(1) }}</label>
      <label>b <input v-model.number="b" type="range" min="-2" max="2" step="0.1" /> {{ b.toFixed(1) }}</label>
    </div>

    <svg :width="SIZE" :height="SIZE" :viewBox="`0 0 ${SIZE} ${SIZE}`" style="max-width: 100%">
      <defs>
        <clipPath id="l04-xor-box">
          <rect :x="PAD" :y="PAD" :width="SIZE - PAD * 2" :height="SIZE - PAD * 2" />
        </clipPath>
      </defs>

      <rect :x="PAD" :y="PAD" :width="SIZE - PAD * 2" :height="SIZE - PAD * 2" style="fill: var(--vp-c-bg)" />

      <g clip-path="url(#l04-xor-box)">
        <template v-if="mode === 'linear'">
          <path :d="posFill" style="fill: var(--accent); opacity: 0.14" />
          <line
            v-if="linePts"
            :x1="s(0)" :y1="linePts.y0" :x2="s(1)" :y2="linePts.y1"
            style="stroke: var(--accent); stroke-width: 2"
          />
        </template>
        <template v-else>
          <path :d="lowFill" style="fill: var(--prin); opacity: 0.14" />
          <path :d="band" style="fill: var(--accent); opacity: 0.16" />
          <path :d="highFill" style="fill: var(--prin); opacity: 0.14" />
          <line :x1="s(0)" :y1="s(0.5)" :x2="s(1)" :y2="s(-0.5)" style="stroke: var(--accent); stroke-width: 2" />
          <line :x1="s(0)" :y1="s(S_HI)" :x2="s(1)" :y2="s(S_HI - 1)" style="stroke: var(--accent); stroke-width: 2" />
        </template>
      </g>

      <line :x1="PAD" :y1="SIZE - PAD" :x2="SIZE - PAD" :y2="SIZE - PAD" style="stroke: var(--line)" />
      <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="SIZE - PAD" style="stroke: var(--line)" />
      <text :x="SIZE - PAD" :y="SIZE - PAD + 17" text-anchor="end" style="fill: var(--ink-3); font-size: 11">x₁</text>
      <text :x="PAD - 8" :y="PAD + 4" text-anchor="end" style="fill: var(--ink-3); font-size: 11">x₂</text>

      <g v-for="(p, i) in PTS" :key="i">
        <circle
          :cx="s(p.x)" :cy="s(p.y)" r="7"
          :style="`fill:${p.t === 1 ? 'var(--accent)' : 'var(--prin)'};stroke:${pred(p) === (p.t === 1) ? 'none' : 'var(--warn)'};stroke-width:3`"
        />
        <text :x="s(p.x) + 11" :y="s(p.y) - 9" style="fill: var(--ink-3); font-size: 11">
          {{ p.t }}{{ pred(p) === (p.t === 1) ? '' : ' ✗' }}
        </text>
      </g>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ errors }} / 4</b><span>分错的点</span></div>
      <div class="stat"><b>{{ mode === 'linear' ? '1 条线' : '2 个隐藏单元' }}</b><span>决策边界</span></div>
      <div class="stat"><b>{{ mode === 'linear' ? '≥ 1' : '0' }}</b><span>最少错几个</span></div>
      <div v-if="mode === 'hidden'" class="stat">
        <b>{{ acts.map((a) => a.toFixed(1)).join(' / ') }}</b><span>四点的输出值</span>
      </div>
    </div>

    <p class="widget-note" :class="errors === 0 ? 'ok-c' : 'bad-c'" style="margin-bottom: 0">
      {{
        errors === 0
          ? '两条边界把平面切成三块，正中间那条带子就是 XOR 的“真”区域：四个点全对。'
          : '单层感知机只有一个仿射变换，决策边界是一条直线。四个点最多只能对三个——多一个隐藏单元，就多一条可用的直线。'
      }}
    </p>
  </Widget>
</template>
