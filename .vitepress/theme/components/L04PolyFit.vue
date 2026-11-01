<script setup lang="ts">
import { ref, computed } from 'vue'

// 3 阶真函数：y = 5 + 1.2x − 3.4x²/2! + 5.6x³/3!
const truth = (x: number) => 5 + 1.2 * x - (3.4 * x * x) / 2 + (5.6 * x * x * x) / 6

const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453
  return s - Math.floor(s)
}

const N_TRAIN = 20
const XS = Array.from({ length: N_TRAIN }, (_, i) => -1.9 + (3.8 * i) / (N_TRAIN - 1) + (rnd(i + 3) - 0.5) * 0.05)
const YS = XS.map((x, i) => truth(x) + (rnd(i + 77) - 0.5) * 0.2)

const XT = Array.from({ length: 160 }, (_, i) => -2 + (4 * i) / 159)
const YT = XT.map((x, i) => truth(x) + (rnd(i + 301) - 0.5) * 0.2)

// 以 u = x/2 为自变量拟合，避免 x^k 的量级爆炸
const design = (x: number, d: number) => {
  const u = x / 2
  return Array.from({ length: d + 1 }, (_, k) => u ** k)
}

function lstsq(rows: number[][], y: number[], d: number): number[] {
  const n = rows.length
  const Q: number[][] = []
  const R: number[][] = Array.from({ length: d }, () => new Array(d).fill(0))
  for (let j = 0; j < d; j++) {
    const v = rows.map((r) => r[j])
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < j; k++) {
        const q = Q[k]
        let dot = 0
        for (let i = 0; i < n; i++) dot += v[i] * q[i]
        R[k][j] += dot
        for (let i = 0; i < n; i++) v[i] -= dot * q[i]
      }
    }
    let nrm = Math.sqrt(v.reduce((s, t) => s + t * t, 0))
    if (nrm < 1e-14) nrm = 1e-14
    Q.push(v.map((t) => t / nrm))
    R[j][j] = nrm
  }
  const qty = Q.map((q) => q.reduce((s, t, i) => s + t * y[i], 0))
  const c = new Array(d).fill(0)
  for (let i = d - 1; i >= 0; i--) {
    let acc = qty[i]
    for (let j = i + 1; j < d; j++) acc -= R[i][j] * c[j]
    c[i] = acc / (Math.abs(R[i][i]) < 1e-14 ? 1e-14 : R[i][i])
  }
  return c
}

const cache = new Map<number, { c: number[]; train: number; test: number; norm: number }>()

function fit(deg: number) {
  const hit = cache.get(deg)
  if (hit) return hit
  const d = deg + 1
  const rows = XS.map((x) => design(x, deg))
  const c = lstsq(rows, YS, d)
  const evalAt = (x: number) => design(x, deg).reduce((s, f, k) => s + f * c[k], 0)
  const train = XS.reduce((s, x, i) => s + (evalAt(x) - YS[i]) ** 2, 0) / XS.length
  const test = XT.reduce((s, x, i) => s + (evalAt(x) - YT[i]) ** 2, 0) / XT.length
  const norm = Math.sqrt(c.reduce((s, t) => s + t * t, 0))
  const res = { c, train, test, norm }
  cache.set(deg, res)
  return res
}

const DEGS = [1, 3, 9, 15]
const deg = ref(3)
const info = computed(() => fit(deg.value))

function curveOf(f: (x: number) => number, lo = -2, hi = 2): string {
  const W = 500, H = 260, PAD = 36
  const sx = (x: number) => PAD + ((x + lo) / (hi - lo)) * (W - PAD * 2)
  const sy = (y: number) => H - PAD - ((Math.max(-16, Math.min(12, y)) + 16) / 28) * (H - PAD * 2)
  const pts: string[] = []
  for (let i = 0; i <= 160; i++) {
    const x = lo + ((hi - lo) * i) / 160
    pts.push(`${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const WPX = 500
const HPX = 260
const PAD = 36
const sx = (x: number) => PAD + ((x + 2) / 4) * (WPX - PAD * 2)
const syv = (y: number) => HPX - PAD - ((Math.max(-16, Math.min(12, y)) + 16) / 28) * (HPX - PAD * 2)

const fittedCurve = computed(() => {
  const { c } = info.value
  return curveOf((x) => design(x, deg.value).reduce((s, f, k) => s + f * c[k], 0))
})
const trueCurve = curveOf(truth)

const verdict = computed(() => {
  const { train, test } = info.value
  if (train > 0.5) return { cls: 'bad', text: '训练损失本身就降不下来：模型太简单，欠拟合。' }
  if (test > Math.max(4 * train, 0.2)) return { cls: 'bad', text: '训练损失很小、测试损失很大：模型已经贴到噪声上了，过拟合。' }
  return { cls: 'ok', text: '训练与测试差不多，复杂度大致合适。' }
})

const fmt = (v: number) => (v >= 1000 ? v.toExponential(2) : v.toFixed(4))
</script>

<template>
  <Widget title="多项式阶数：欠拟合、正合适、过拟合">
    <p class="widget-note">
      灰色虚线是真正的三阶函数，蓝点是 20 个带噪声的训练样本。换阶数，看拟合曲线怎么变、训练/测试损失怎么分叉。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button v-for="d in DEGS" :key="d" type="button" :class="{ on: deg === d }" @click="deg = d">
          {{ d }} 阶
        </button>
      </div>
    </div>

    <svg :width="WPX" :height="HPX" :viewBox="`0 0 ${WPX} ${HPX}`" style="max-width: 100%">
      <line :x1="PAD" :y1="syv(0)" :x2="WPX - PAD" :y2="syv(0)" style="stroke: var(--line)" />
      <line :x1="sx(0)" :y1="PAD" :x2="sx(0)" :y2="HPX - PAD" style="stroke: var(--line)" />
      <path :d="trueCurve" style="stroke: var(--ink-3); stroke-width: 2; fill: none" stroke-dasharray="6 4" />
      <path :d="fittedCurve" style="stroke: var(--accent); stroke-width: 2.5; fill: none" />
      <circle v-for="(y, i) in YS" :key="i" :cx="sx(XS[i])" :cy="syv(y)" r="3.4" style="fill: var(--prin)" />
      <text :x="WPX - PAD" :y="syv(0) - 8" text-anchor="end" style="fill: var(--ink-3); font-size: 11">x</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ fmt(info.train) }}</b><span>训练 MSE</span></div>
      <div class="stat"><b>{{ fmt(info.test) }}</b><span>测试 MSE</span></div>
      <div class="stat"><b>{{ fmt(info.norm) }}</b><span>系数的 L2 范数</span></div>
      <div class="stat"><b>{{ deg }} 阶</b><span>模型复杂度</span></div>
    </div>

    <p class="widget-note" :class="verdict.cls === 'ok' ? 'ok-c' : 'bad-c'" style="margin-bottom: 0">
      {{ verdict.text }}
    </p>
  </Widget>
</template>
