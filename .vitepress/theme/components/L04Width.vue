<script setup lang="ts">
import { ref, computed } from 'vue'

// 确定性伪随机：服务端渲染与客户端一致
const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453
  return s - Math.floor(s)
}
const gauss = (i: number) => {
  const u = Math.max(rnd(i), 1e-9)
  const v = rnd(i + 0.5)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const N = 120
const DATA = Array.from({ length: N }, (_, i) => {
  const x1 = rnd(i * 3 + 1) * 2 - 1
  const x2 = rnd(i * 3 + 2) * 2 - 1
  const y = x1 * x1 + x2 * x2 < 0.64 ? 1 : 0
  return { x1, x2, y }
})

const HMAX = 64
const W1 = Array.from({ length: 2 * HMAX }, (_, i) => gauss(i + 11) * 2)
const B1 = Array.from({ length: HMAX }, (_, i) => -rnd(i + 501))

function solve(A: number[][], rhs: number[]): number[] {
  const n = rhs.length
  const M = A.map((row, i) => [...row, rhs[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    const tmp = M[c]
    M[c] = M[p]
    M[p] = tmp
    const piv = Math.abs(M[c][c]) < 1e-12 ? 1e-12 : M[c][c]
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / piv
      if (!f) continue
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  const x = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let acc = M[r][n]
    for (let k = r + 1; k < n; k++) acc -= M[r][k] * x[k]
    x[r] = acc / (Math.abs(M[r][r]) < 1e-12 ? 1e-12 : M[r][r])
  }
  return x
}

const feats = (x1: number, x2: number, h: number) => {
  const f: number[] = [1]
  for (let j = 0; j < h; j++) f.push(Math.max(x1 * W1[2 * j] + x2 * W1[2 * j + 1] + B1[j], 0))
  return f
}

const cache = new Map<number, { w: number[]; acc: number }>()

function fit(h: number) {
  const hit = cache.get(h)
  if (hit) return hit
  const d = h + 1
  const A = Array.from({ length: d }, () => new Array(d).fill(0))
  const rhs = new Array(d).fill(0)
  for (const p of DATA) {
    const f = feats(p.x1, p.x2, h)
    for (let i = 0; i < d; i++) {
      rhs[i] += f[i] * p.y
      for (let j = 0; j < d; j++) A[i][j] += f[i] * f[j]
    }
  }
  for (let i = 1; i < d; i++) A[i][i] += 1e-4
  const w = solve(A, rhs)
  let correct = 0
  for (const p of DATA) {
    const f = feats(p.x1, p.x2, h)
    let sc = 0
    for (let j = 0; j < d; j++) sc += f[j] * w[j]
    if ((sc >= 0.5 ? 1 : 0) === p.y) correct++
  }
  const res = { w, acc: correct / DATA.length }
  cache.set(h, res)
  return res
}

function score(h: number, x1: number, x2: number): number {
  const { w } = fit(h)
  const f = feats(x1, x2, h)
  let sc = 0
  for (let j = 0; j < f.length; j++) sc += f[j] * w[j]
  return sc
}

const SIZE = 300
const PAD = 22
const sx = (v: number) => PAD + ((v + 1) / 2) * (SIZE - PAD * 2)
const sy = (v: number) => SIZE - PAD - ((v + 1) / 2) * (SIZE - PAD * 2)

const G = 52
function contour(h: number): string {
  const step = 2 / (G - 1)
  const grid: number[][] = []
  for (let i = 0; i < G; i++) {
    const row: number[] = []
    for (let j = 0; j < G; j++) row.push(score(h, -1 + j * step, -1 + i * step) - 0.5)
    grid.push(row)
  }
  const segs: string[] = []
  const at = (i: number, j: number): [number, number] => [-1 + j * step, -1 + i * step]
  const mix = (va: number, vb: number, pa: [number, number], pb: [number, number]): [number, number] => {
    const t = va / (va - vb)
    return [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]
  }
  for (let i = 0; i < G - 1; i++) {
    for (let j = 0; j < G - 1; j++) {
      const v00 = grid[i][j]
      const v01 = grid[i][j + 1]
      const v10 = grid[i + 1][j]
      const v11 = grid[i + 1][j + 1]
      const p00 = at(i, j)
      const p01 = at(i, j + 1)
      const p10 = at(i + 1, j)
      const p11 = at(i + 1, j + 1)
      const pts: [number, number][] = []
      if (v00 >= 0 !== v01 >= 0) pts.push(mix(v00, v01, p00, p01))
      if (v01 >= 0 !== v11 >= 0) pts.push(mix(v01, v11, p01, p11))
      if (v10 >= 0 !== v11 >= 0) pts.push(mix(v10, v11, p10, p11))
      if (v00 >= 0 !== v10 >= 0) pts.push(mix(v00, v10, p00, p10))
      for (let k = 0; k + 1 < pts.length; k += 2) {
        segs.push(
          `M${sx(pts[k][0]).toFixed(1)},${sy(pts[k][1]).toFixed(1)}L${sx(pts[k + 1][0]).toFixed(1)},${sy(
            pts[k + 1][1]
          ).toFixed(1)}`
        )
      }
    }
  }
  return segs.join(' ')
}

const HS = [1, 2, 4, 8, 16, 64]
const h = ref(2)
const info = computed(() => fit(h.value))
const pathFor = computed(() => contour(h.value))

const verdict = computed(() => {
  const c = h.value
  if (c === 1) return '一个隐藏单元只能贡献一条直线边界：圆盘是弯的，它只能斜着切一刀。'
  if (c === 2) return '两个单元拼出一个折角，能框住圆的一部分，还远不是闭合的曲线。'
  if (c === 4) return '四个单元拼出四条边，轮廓开始围起来，但棱角分明。'
  if (c === 8) return '八个单元已经把这个圆画得相当圆滑，训练点基本分对。'
  if (c === 16) return '十六个单元继续加细，边界更贴数据——也更容易开始描噪声。'
  return '六十四个单元可以把边界拉成任意形状：容量足够时，要担心的就不再是欠拟合。'
})
</script>

<template>
  <Widget title="隐藏层宽度决定决策边界能有多弯">
    <p class="widget-note">
      样本是一个圆盘：落在半径 0.8 以内的为正类。隐藏层的每个单元贡献一条折线，宽度就是可用的折线段数。为了即时响应，这里不跑梯度下降，而是固定隐藏层的随机权重、只解输出层的线性最小二乘（随机特征法）——形状反映的道理与真训练一致。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button v-for="k in HS" :key="k" type="button" :class="{ on: h === k }" @click="h = k">
          {{ k }} 个单元
        </button>
      </div>
    </div>

    <svg :width="SIZE" :height="SIZE" :viewBox="`0 0 ${SIZE} ${SIZE}`" style="max-width: 100%">
      <rect :x="PAD" :y="PAD" :width="SIZE - PAD * 2" :height="SIZE - PAD * 2" style="fill: var(--vp-c-bg)" />
      <circle
        :cx="sx(0)" :cy="sy(0)" :r="(0.8 / 2) * (SIZE - PAD * 2)"
        style="fill: none; stroke: var(--line); stroke-dasharray: 3 4"
      />
      <circle
        v-for="(d, i) in DATA" :key="i"
        :cx="sx(d.x1)" :cy="sy(d.x2)" r="2.4"
        :style="`fill:${d.y === 1 ? 'var(--accent)' : 'var(--prin)'};opacity:.72`"
      />
      <path :d="pathFor" style="stroke: var(--ink); stroke-width: 2; fill: none; stroke-linecap: round" />
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ h }}</b><span>隐藏单元数</span></div>
      <div class="stat"><b>{{ (info.acc * 100).toFixed(1) }}%</b><span>训练集准确率</span></div>
      <div class="stat"><b>{{ 3 * h + 1 }}</b><span>可调参数个数</span></div>
    </div>

    <p class="widget-note" style="margin-bottom: 0">{{ verdict }}</p>
  </Widget>
</template>
