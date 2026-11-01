<script setup lang="ts">
import { ref, computed } from 'vue'

const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453
  return s - Math.floor(s)
}

// 20 个权重各自“无正则时的最优解”
const W_HAT = Array.from({ length: 20 }, (_, i) => (rnd(i + 9) - 0.5) * 3)

const lam = ref(0.5)
const shrink = computed(() => 1 / (1 + lam.value))
const wStar = computed(() => shrink.value)
const after = computed(() => W_HAT.map((w) => w * shrink.value))

const normBefore = Math.sqrt(W_HAT.reduce((s, w) => s + w * w, 0))
const normAfter = computed(() => Math.sqrt(after.value.reduce((s, w) => s + w * w, 0)))

// 目标曲线：L(w) + λw²，其中 L(w) = (w − 1)²
const obj = (w: number) => (w - 1) ** 2 + lam.value * w * w
const dataLoss = (w: number) => (w - 1) ** 2

const W = 500
const H = 220
const PAD = 34
const sx = (w: number) => PAD + ((w + 0.5) / 2) * (W - PAD * 2)
const sy = (v: number) => H - PAD - (Math.min(v, 3) / 3) * (H - PAD * 2)

function pathOf(f: (w: number) => number) {
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const w = -0.5 + (2 * i) / 120
    pts.push(`${i === 0 ? 'M' : 'L'}${sx(w).toFixed(1)},${sy(f(w)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const totalCurve = computed(() => pathOf(obj))
const lossCurve = pathOf(dataLoss)

// 权重条：上排＝无衰减，下排＝衰减后
const BW = 480
const BH = 190
const BARW = BW / 20
const yMid = 100
const yScale = 42
</script>

<template>
  <Widget title="权重衰减做了什么：把每个权重按同一比例往回拉">
    <p class="widget-note">
      只考虑惩罚项时，最小化 L(w) + λ‖w‖² 会让最优解从 ŵ 收缩到 ŵ/(1+λ)。下面把 20 个权重的 ŵ（灰）和衰减后的值（橙）并排画出来：每一个都被乘上了同一个比例。
    </p>

    <div class="ctrl">
      <label>
        λ
        <input v-model.number="lam" type="range" min="0" max="4" step="0.25" />
        <b>{{ lam.toFixed(2) }}</b>
      </label>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width: 100%">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke: var(--line)" />
      <path :d="lossCurve" style="stroke: var(--ink-3); stroke-width: 2; fill: none" stroke-dasharray="6 4" />
      <path :d="totalCurve" style="stroke: var(--accent); stroke-width: 2.5; fill: none" />
      <line
        :x1="sx(wStar)" :y1="PAD" :x2="sx(wStar)" :y2="H - PAD"
        style="stroke: var(--ex); stroke-dasharray: 3 4"
      />
      <circle :cx="sx(wStar)" :cy="sy(obj(wStar))" r="4.5" style="fill: var(--ex)" />
      <text :x="sx(wStar) + 8" :y="sy(obj(wStar)) - 8" style="fill: var(--ink-2); font-size: 11">
        w* = {{ wStar.toFixed(3) }}
      </text>
      <text :x="PAD" :y="PAD - 10" style="fill: var(--ink-3); font-size: 11">虚线＝原始损失 L(w)；实线＝加惩罚后的总目标</text>
    </svg>

    <svg :width="BW" :height="BH" :viewBox="`0 0 ${BW} ${BH}`" style="max-width: 100%; margin-top: 6px">
      <text x="2" y="10" style="fill: var(--ink-3); font-size: 11">每个权重的 ŵ（灰）与衰减后的值（橙）</text>
      <line :x1="0" :y1="yMid" :x2="BW" :y2="yMid" style="stroke: var(--line)" />
      <g v-for="(w, i) in W_HAT" :key="'a' + i">
        <rect
          :x="i * BARW + 2" :y="w >= 0 ? yMid - w * yScale : yMid"
          :width="BARW / 2 - 3" :height="Math.abs(w) * yScale"
          style="fill: var(--ink-3); opacity: 0.45"
        />
      </g>
      <g v-for="(w, i) in after" :key="'b' + i">
        <rect
          :x="i * BARW + BARW / 2" :y="w >= 0 ? yMid - w * yScale : yMid"
          :width="BARW / 2 - 3" :height="Math.abs(w) * yScale"
          style="fill: var(--accent)"
        />
      </g>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ wStar.toFixed(3) }}</b><span>标量情形的最优解 w*</span></div>
      <div class="stat"><b>{{ ((1 - shrink) * 100).toFixed(0) }}%</b><span>收缩掉的比例</span></div>
      <div class="stat"><b>{{ normAfter.toFixed(2) }}</b><span>衰减后 ‖w‖（原来 {{ normBefore.toFixed(2) }}）</span></div>
    </div>

    <p class="widget-note" style="margin-bottom: 0">
      换成梯度下降就更直观：更新式变成 w ← (1 − ηλ)w − η∇L。多出来的因子 (1 − ηλ) 每一步都把 w 往零拖一点，这就是“权重衰减”这个名字的来历。λ 越大拖得越狠，但不是把权重直接砍成零——它是连续的收缩，因此比“少用几个特征”更精细。
    </p>
  </Widget>
</template>
