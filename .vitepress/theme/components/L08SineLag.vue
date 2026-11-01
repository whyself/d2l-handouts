<script setup lang="ts">
import { ref, computed } from 'vue'

const T = 1000
const START = 604 // n_train + tau，观测到此为止

const frac = (v: number) => v - Math.floor(v)
const noise = (t: number) => (frac(Math.sin(t * 12.9898) * 43758.5453) - 0.5) * 0.4

// 原书的数据生成方式：x = sin(0.01 t) + 噪声，t = 1 … 1000
const x: number[] = []
for (let t = 1; t <= T; t++) x.push(Math.sin(0.01 * t) + noise(t))

function solve(M: number[][], v: number[]): number[] {
  const n = v.length
  const A = M.map((r, i) => [...r, v[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    const tmp = A[c]; A[c] = A[p]; A[p] = tmp
    const d = A[c][c] || 1e-9
    for (let j = c; j <= n; j++) A[c][j] /= d
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = A[r][c]
      if (!f) continue
      for (let j = c; j <= n; j++) A[r][j] -= f * A[c][j]
    }
  }
  return A.map(r => r[n])
}

// 用前 600 个「特征－标签」对拟合一个线性自回归模型（最小二乘 + 极小岭项）
function fitAR(tau: number): number[] {
  const d = tau + 1
  const M: number[][] = Array.from({ length: d }, () => new Array(d).fill(0))
  const b = new Array(d).fill(0)
  const n = 600 + tau
  for (let i = tau; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < tau; j++) row.push(x[i - tau + j])
    row.push(1)
    for (let a = 0; a < d; a++) {
      b[a] += row[a] * x[i]
      for (let c = 0; c < d; c++) M[a][c] += row[a] * row[c]
    }
  }
  for (let a = 0; a < d; a++) M[a][a] += 1e-6
  return solve(M, b)
}

const tau = ref(4)
const k = ref(12)
const zoom = ref(true)

const w = computed(() => fitAR(tau.value))

const oneStep = computed(() => {
  const t0 = tau.value
  const out: number[] = []
  for (let i = t0; i < T; i++) {
    let s = w.value[t0]
    for (let j = 0; j < t0; j++) s += w.value[j] * x[i - t0 + j]
    out.push(s)
  }
  return out
})

// 多步预测：从 START 起，把自己上一步的输出喂回去
const rollout = computed(() => {
  const t0 = tau.value
  const buf = x.slice(0, START)
  const out: number[] = []
  for (let i = 0; i < k.value; i++) {
    let s = w.value[t0]
    for (let j = 0; j < t0; j++) s += w.value[j] * buf[buf.length - t0 + j]
    buf.push(s)
    out.push(s)
  }
  return out
})

const oneStepRmse = computed(() => {
  const o = oneStep.value
  let s = 0
  let n = 0
  for (let i = START; i < T; i++) {
    const d = o[i - tau.value] - x[i]
    s += d * d
    n++
  }
  return Math.sqrt(s / n)
})

const kthError = computed(() => {
  const idx = Math.min(rollout.value.length, k.value) - 1
  return Math.abs(rollout.value[idx] - x[START + idx])
})

const ampRatio = computed(() => {
  const seg = x.slice(START, START + k.value)
  const amp = Math.max(...seg) - Math.min(...seg) || 1
  const p = rollout.value
  return (Math.max(...p) - Math.min(...p)) / amp
})

// 画布
const W = 620
const H = 232
const PAD = 30
const xmin = computed(() => (zoom.value ? Math.max(1, START - 40) : 1))
const xmax = computed(() => (zoom.value ? Math.min(T, START + k.value + 16) : T))
const ymin = -1.7
const ymax = 1.7
const sx = (t: number) => PAD + ((t - xmin.value) / (xmax.value - xmin.value)) * (W - PAD * 2)
const sy = (v: number) => H - PAD - ((v - ymin) / (ymax - ymin)) * (H - PAD * 2)

function path(vals: number[], from: number) {
  const out: string[] = []
  for (let i = 0; i < vals.length; i++) {
    const t = from + i
    if (t < xmin.value || t > xmax.value) continue
    out.push(`${out.length ? 'L' : 'M'}${sx(t).toFixed(1)},${sy(vals[i]).toFixed(1)}`)
  }
  return out.join(' ')
}

const dataPath = computed(() => path(x, 1))
const onePath = computed(() => path(oneStep.value, tau.value + 1))
const rollPath = computed(() => path(rollout.value, START + 1))
const xminLabel = computed(() => Math.round(xmin.value))
const xmaxLabel = computed(() => Math.round(xmax.value))
</script>

<template>
  <Widget title="正弦波：一步预测几乎贴住，滚动预测越走越偏">
    <p class="widget-note">
      用和原书一样的方式造数据：x(t) = sin(0.01 t) 加噪声。拿前 600 个「最近 τ 步 → 下一步」的样本拟一个线性自回归模型，再让它自己预测自己地往前滚。灰线是数据，蓝线是一步预测，红虚线是多步滚动预测。
    </p>

    <div class="ctrl">
      <label>历史窗口 τ
        <input v-model.number="tau" type="range" min="2" max="6" step="1">
        <b>{{ tau }}</b>
      </label>
      <label>滚动步数 k
        <input v-model.number="k" type="range" min="1" max="64" step="1">
        <b>{{ k }}</b>
      </label>
      <div class="seg">
        <button type="button" :class="{ on: zoom }" @click="zoom = true">放大起点</button>
        <button type="button" :class="{ on: !zoom }" @click="zoom = false">看全序列</button>
      </div>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;max-width:620px">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
      <text :x="PAD" :y="H - 8" style="fill:var(--ink-3);font-size:11">t = {{ xminLabel }}</text>
      <text :x="W - PAD" :y="H - 8" text-anchor="end" style="fill:var(--ink-3);font-size:11">t = {{ xmaxLabel }}</text>

      <line
        :x1="sx(START + 1)" :y1="PAD - 8" :x2="sx(START + 1)" :y2="H - PAD"
        style="stroke:var(--warn);stroke-width:1;stroke-dasharray:3 4;opacity:.6"
      />
      <text :x="sx(START + 1) + 5" :y="PAD + 2" style="fill:var(--warn);font-size:11">观测到此为止</text>

      <path :d="dataPath" style="stroke:var(--ink-3);stroke-width:1.2;fill:none;opacity:.75" />
      <path :d="onePath" style="stroke:var(--accent);stroke-width:1.8;fill:none" />
      <path :d="rollPath" style="stroke:var(--warn);stroke-width:2.4;fill:none;stroke-dasharray:5 4" />
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ oneStepRmse.toFixed(3) }}</b><span>测试段一步预测 RMSE</span></div>
      <div class="stat"><b>{{ kthError.toFixed(3) }}</b><span>第 {{ k }} 步的误差</span></div>
      <div class="stat"><b>{{ (ampRatio * 100).toFixed(0) }}%</b><span>滚动预测还剩多少振幅</span></div>
      <div class="stat"><b>{{ tau }} 步 → 1 步</b><span>每次喂入 / 每次输出</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      单步预测只要求「看一眼最近几步、估下一小截斜率」，噪声让它差一点但整体贴合。可一旦把预测值喂回输入，误差就按 ε₂ = ε̄ + cε₁ 的次序累积：红线先是幅度变小，接着相位越来越落后，最后衰减到常数附近——这正是原书里「几个预测步骤之后结果很快衰减到一个常数」的过程。默认窗口就停在观测终点附近，点「看全序列」可以看它在整条正弦上的位置。
    </p>
  </Widget>
</template>
