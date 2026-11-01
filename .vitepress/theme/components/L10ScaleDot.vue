<script setup lang="ts">
import { ref, computed } from 'vue'

const prng = (seed: number) => {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const gaussFrom = (r: () => number) => {
  let u = 0, v = 0
  while (u === 0) u = r()
  while (v === 0) v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const softmax = (xs: number[]) => {
  const m = Math.max(...xs)
  const e = xs.map(v => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map(v => v / s)
}

const entropy = (ws: number[]) => -ws.reduce((a, w) => a + (w > 0 ? w * Math.log(w) : 0), 0)

const d = ref(16)
const seed = ref(0)
const M = 400      // 采样次数
const BINS = 25
const NK = 10      // softmax 演示用的键个数

// 10 个键的「标准化分数」。固定不变，于是 softmax(z) 与 d 无关——
// 这正好用来对比：未缩放时分数被放大 √d 倍，缩放后纹丝不动。
const Z = [-1.55, -1.1, -0.75, -0.45, -0.2, 0.05, 0.35, 0.7, 1.15, 1.8]

const stat = computed(() => {
  const r = prng(seed.value * 977 + d.value * 13 + 5)
  const dots: number[] = []
  for (let t = 0; t < M; t++) {
    let acc = 0
    for (let j = 0; j < d.value; j++) acc += gaussFrom(r) * gaussFrom(r)
    dots.push(acc)
  }
  const mean = dots.reduce((a, b) => a + b, 0) / M
  const sd = Math.sqrt(dots.reduce((a, b) => a + (b - mean) ** 2, 0) / M)

  // 未缩放的点积分数随 √d 一起放大；除以 √d 之后回到原来的 z
  const z = Z.map((_, i) => Z[(i + seed.value) % NK])
  const wRaw = softmax(z.map(v => v * Math.sqrt(d.value)))
  const wSc = softmax(z)

  // 直方图
  const span = 4 * Math.sqrt(d.value)
  const binW = (2 * span) / BINS
  const counts = new Array(BINS).fill(0)
  dots.forEach(v => {
    const k = Math.floor((v + span) / binW)
    if (k >= 0 && k < BINS) counts[k]++
  })

  return {
    dots, sd, mean, wRaw, wSc,
    counts, span, binW,
    maxRaw: Math.max(...wRaw),
    maxSc: Math.max(...wSc),
    hRaw: entropy(wRaw),
    hSc: entropy(wSc)
  }
})

const reseed = () => { seed.value = (seed.value * 5 + 11) % 991 + 2 }

// 画布
const W = 470
const HW = 150, HY = 22           // 直方图区域
const hx = (v: number) => 30 + ((v + stat.value.span) / (2 * stat.value.span)) * (W - 40)
const maxCount = computed(() => Math.max(1, ...stat.value.counts))
const hy = (c: number) => HY + HW - (c / maxCount.value) * (HW - 16)

// 拟合曲线 N(0, d) 的期望计数
const fitPath = computed(() => {
  const s = stat.value
  const sd = Math.sqrt(d.value)
  const pts: string[] = []
  for (let i = 0; i <= 80; i++) {
    const v = -s.span + (i / 80) * 2 * s.span
    const pdf = Math.exp(-(v * v) / (2 * d.value)) / (sd * Math.sqrt(2 * Math.PI))
    const c = pdf * s.binW * M
    pts.push(`${i === 0 ? 'M' : 'L'}${hx(v).toFixed(1)},${hy(Math.min(c, maxCount.value)).toFixed(1)}`)
  }
  return pts.join(' ')
})

// 下方 softmax 条形图
const SY = 210, SH = 56
const barX = (i: number) => 34 + i * 20
const barX2 = (i: number) => 264 + i * 20
const sy = (w: number) => SY + SH - w * SH
</script>

<template>
  <Widget title="为什么要除以 √d：点积的方差是 d，softmax 会饱和">
    <p class="widget-note">
      上方直方图是 400 次「两个独立标准正态向量做点积」的结果，蓝线是按 N(0, d) 画的拟合曲线。拖动 d：分布越摊越宽，标准差 ≈ √d。
      下方是 10 个键的注意力权重：这 10 个分数是固定的，未缩放时正比于 √d——d 一大，softmax 就把几乎全部权重压给一个键；除以 √d 的那一排则纹丝不动。
    </p>

    <div class="ctrl">
      <label>向量长度 d <input v-model.number="d" type="range" min="1" max="128" step="1"><b>{{ d }}</b></label>
      <button class="btn" type="button" @click="reseed">重新采样</button>
      <span class="muted" style="font-size:13px">√d = {{ Math.sqrt(d).toFixed(2) }}</span>
    </div>

    <svg :width="W" :height="292" :viewBox="`0 0 ${W} 292`" style="max-width:100%">
      <!-- 直方图 -->
      <line :x1="30" :y1="HY + HW" :x2="W - 10" :y2="HY + HW" style="stroke:var(--line)" />
      <rect v-for="(c, i) in stat.counts" :key="'h' + i"
            :x="hx(-stat.span + i * stat.binW) + 0.6"
            :y="hy(c)" :width="Math.max(1, (W - 40) / 25 - 1.2)"
            :height="Math.max(0, HY + HW - hy(c))"
            style="fill:var(--accent);opacity:.42" />
      <path :d="fitPath" style="stroke:var(--prin);stroke-width:2;fill:none" />

      <text :x="30" :y="HY + HW + 14" style="fill:var(--ink-3);font-size:10">
        点积值 qᵀk（范围 ±{{ stat.span.toFixed(1) }}）
      </text>
      <text :x="W - 12" :y="HY + 12" text-anchor="end" style="fill:var(--prin);font-size:10">
        拟合 N(0, d)
      </text>

      <!-- 分隔 -->
      <line :x1="10" :y1="196" :x2="W - 10" :y2="196" style="stroke:var(--line-2)" />
      <text x="10" y="208" style="fill:var(--ink-3);font-size:10">10 个键的 softmax 权重</text>

      <!-- 未缩放 -->
      <g>
        <rect v-for="(w, i) in stat.wRaw" :key="'r' + i"
              :x="barX(i)" :y="sy(w)" width="15" :height="w * SH" rx="2"
              :style="`fill:var(--warn);opacity:${(0.28 + 0.72 * (w / stat.maxRaw)).toFixed(2)}`" />
        <line :x1="34" :y1="SY + SH" :x2="234" :y2="SY + SH" style="stroke:var(--line)" />
        <text x="34" :y="SY + SH + 13" style="fill:var(--warn);font-size:10;font-weight:700">未缩放</text>
      </g>

      <!-- 缩放后 -->
      <g>
        <rect v-for="(w, i) in stat.wSc" :key="'s' + i"
              :x="barX2(i)" :y="sy(w)" width="15" :height="w * SH" rx="2"
              :style="`fill:var(--prin);opacity:${(0.28 + 0.72 * (w / stat.maxSc)).toFixed(2)}`" />
        <line :x1="264" :y1="SY + SH" :x2="464" :y2="SY + SH" style="stroke:var(--line)" />
        <text x="264" :y="SY + SH + 13" style="fill:var(--prin);font-size:10;font-weight:700">除以 √d</text>
      </g>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ stat.sd.toFixed(2) }}</b><span>实测标准差</span></div>
      <div class="stat"><b>{{ (stat.sd / Math.sqrt(d)).toFixed(2) }}</b><span>标准差 ÷ √d（应≈1）</span></div>
      <div class="stat"><b>{{ (stat.maxRaw * 100).toFixed(0) }}%</b><span>未缩放时的最大权重</span></div>
      <div class="stat"><b>{{ (stat.maxSc * 100).toFixed(0) }}%</b><span>缩放后的最大权重</span></div>
      <div class="stat"><b>{{ stat.hRaw.toFixed(2) }} → {{ stat.hSc.toFixed(2) }}</b><span>熵（越小越“独裁”）</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      把 d 拉到 1：两排完全一样（√1 = 1），缩放因子等于没做。拉到 128：未缩放的最大权重几乎到 100%，熵趋近 0，梯度也跟着趋近 0；右边那排却一直保持 d = 1 时的形状——这正是我们希望 softmax 看到的输入。
    </p>
  </Widget>
</template>
