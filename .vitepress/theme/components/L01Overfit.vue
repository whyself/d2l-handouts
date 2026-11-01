<script setup lang="ts">
import { ref, computed } from 'vue'

// 确定性伪随机，保证服务端渲染与客户端一致
const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453
  return s - Math.floor(s)
}

const truth = (x: number) => Math.sin(2 * Math.PI * x) * 0.4 + 0.55

const XS = Array.from({ length: 9 }, (_, i) => i / 8)
const YS = XS.map((x, i) => truth(x) + (rnd(i) - 0.5) * 0.34)

const XT = Array.from({ length: 15 }, (_, i) => (i + 0.5) / 15)
const YT = XT.map((x, i) => truth(x) + (rnd(i + 40) - 0.5) * 0.34)

function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]
    const piv = M[c][c] === 0 ? 1e-12 : M[c][c]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / piv
      if (!f) continue
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / (row[i] === 0 ? 1e-12 : row[i]))
}

function fit(deg: number): number[] {
  const d = deg + 1
  const A: number[][] = Array.from({ length: d }, () => new Array(d).fill(0))
  const rhs = new Array(d).fill(0)
  XS.forEach((x, i) => {
    const p = Array.from({ length: d }, (_, k) => x ** k)
    for (let r = 0; r < d; r++) {
      rhs[r] += p[r] * YS[i]
      for (let c = 0; c < d; c++) A[r][c] += p[r] * p[c]
    }
  })
  return solve(A, rhs)
}

const poly = (c: number[], x: number) => c.reduce((s, v, k) => s + v * x ** k, 0)

const DEGS = [1, 3, 9]
const fits = DEGS.map(fit)
const deg = ref(1)
const idx = computed(() => DEGS.indexOf(deg.value))

const trainErr = computed(() => {
  const c = fits[idx.value]
  return XS.reduce((s, x, i) => s + (poly(c, x) - YS[i]) ** 2, 0) / XS.length
})
const testErr = computed(() => {
  const c = fits[idx.value]
  return XT.reduce((s, x, i) => s + (poly(c, x) - YT[i]) ** 2, 0) / XT.length
})

const W = 470, H = 230, PAD = 30
const sx = (x: number) => PAD + x * (W - PAD * 2)
const sy = (y: number) => H - PAD - ((y + 0.2) / 1.6) * (H - PAD * 2)

const curve = computed(() => {
  const c = fits[idx.value]
  return Array.from({ length: 90 }, (_, i) => {
    const x = i / 89
    return `${i === 0 ? 'M' : 'L'}${sx(x)},${sy(poly(c, x))}`
  }).join(' ')
})

const verdict = computed(() => {
  const tr = trainErr.value, te = testErr.value
  if (te > tr * 3) return { cls: 'bad', text: '训练误差很低，测试误差却高出一大截：典型的过拟合。' }
  if (tr > 0.06) return { cls: 'warn', text: '训练误差本身就高：模型太简单，欠拟合。' }
  return { cls: 'ok', text: '训练与测试误差接近，复杂度大致合适。' }
})
</script>

<template>
  <Widget title="模拟考与期末考：训练集 / 测试集与过拟合">
    <p class="widget-note">
      蓝点是训练集（模型见过），方块是测试集（模型没见过）。提高多项式阶数会把训练集拟合得越来越好，但测试集未必跟着变好。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button v-for="d in DEGS" :key="d" type="button" :class="{ on: deg === d }" @click="deg = d">
          {{ d === 1 ? '直线（1 次）' : d === 3 ? '曲线（3 次）' : '复杂（9 次）' }}
        </button>
      </div>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
      <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="H - PAD" style="stroke:var(--line)" />
      <path :d="curve" style="stroke:var(--accent);stroke-width:2.5;fill:none" />
      <circle v-for="(y, i) in YS" :key="'tr' + i" :cx="sx(XS[i])" :cy="sy(y)" r="4" style="fill:var(--prin)" />
      <rect
        v-for="(y, i) in YT" :key="'te' + i"
        :x="sx(XT[i]) - 3.5" :y="sy(y) - 3.5" width="7" height="7"
        style="fill:none;stroke:var(--ex);stroke-width:1.6"
      />
      <text :x="W - PAD" :y="sy(0) - 6" text-anchor="end" style="fill:var(--ink-3);font-size:11">x</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ trainErr.toFixed(3) }}</b><span>训练误差（蓝点）</span></div>
      <div class="stat"><b>{{ testErr.toFixed(3) }}</b><span>测试误差（方块）</span></div>
      <div class="stat"><b>{{ deg }} 次</b><span>模型复杂度</span></div>
    </div>

    <p class="widget-note" :class="verdict.cls === 'ok' ? 'ok-c' : verdict.cls === 'bad' ? 'bad-c' : ''" style="margin-bottom:0">
      {{ verdict.text }}
    </p>
  </Widget>
</template>
