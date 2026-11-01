<script setup lang="ts">
import { ref, computed } from 'vue'

// 标量版 GRU：只保留一个隐藏单元，权重固定，方便手算。
// 目的：看“更新门 z 接近 1”时，隐状态与梯度如何原样穿过很多时间步。
const z = ref(0.85)   // 更新门
const r = ref(0.6)    // 重置门
const T = 12
const Wx = 1.0        // 输入权重
const Wh = 0.5        // 循环权重

type Sim = { gru: number[]; rnn: number[]; gruGrad: number; rnnGrad: number; last: number }

const sim = computed<Sim>(() => {
  const gru: number[] = [0]
  const rnn: number[] = [0]
  let hg = 0
  let hr = 0
  let gg = 1 // 梯度保留因子，从 dH_0/dH_0 = 1 起连乘
  let gr = 1
  for (let t = 1; t <= T; t++) {
    // 候选状态：重置门先过滤旧隐状态
    const tilde = Math.tanh(Wx * 1 + r.value * hg * Wh)
    // 更新门做凸组合
    hg = z.value * hg + (1 - z.value) * tilde
    // 普通循环单元做对照
    hr = Math.tanh(Wx * 1 + hr * Wh)
    // 该步的雅可比：dH_t / dH_{t-1}
    gg *= z.value + (1 - z.value) * r.value * Wh * (1 - tilde * tilde)
    gr *= Wh * (1 - hr * hr)
    gru.push(hg)
    rnn.push(hr)
  }
  return { gru, rnn, gruGrad: gg, rnnGrad: gr, last: hg }
})

const W = 470
const H = 190
const PAD = 34
const sx = (i: number) => PAD + (i / T) * (W - PAD * 2)
const sy = (v: number) => H - PAD - ((v + 0.2) / 1.3) * (H - PAD * 2)

const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(v)}`).join(' ')

const state = computed(() => {
  if (z.value > 0.95) return '更新门几乎常开：隐状态基本冻结，第 1 步的信息被完整带到第 12 步。'
  if (z.value < 0.2) return '更新门几乎关闭：每步都换成候选状态，行为和普通 RNN 差不多。'
  return '更新门部分打开：旧信息被缓慢稀释，既能记一段，又允许更新。'
})

const fmt = (v: number) => (v >= 0.001 ? v.toFixed(3) : v.toExponential(1))
</script>

<template>
  <Widget title="两道门如何决定“记忆能走多远”">
    <p class="widget-note">
      一个隐藏单元、12 个时间步的小实验。拖动两个滑块，看隐状态曲线怎么变；右下角的“梯度保留”是该步雅可比连乘的结果——它决定了梯度能不能传到第 1 步。
    </p>

    <div class="ctrl">
      <label>更新门 z
        <input v-model.number="z" type="range" min="0" max="1" step="0.01">
        <b>{{ z.toFixed(2) }}</b>
      </label>
      <label>重置门 r
        <input v-model.number="r" type="range" min="0" max="1" step="0.01">
        <b>{{ r.toFixed(2) }}</b>
      </label>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
      <line :x1="PAD" :y1="sy(1)" :x2="W - PAD" :y2="sy(1)" style="stroke:var(--line);stroke-dasharray:3 4" />
      <text :x="PAD - 6" :y="sy(1) + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">1</text>
      <text :x="PAD - 6" :y="sy(0) + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">0</text>
      <path :d="path(sim.rnn)" style="stroke:var(--ink-3);stroke-width:2;fill:none;stroke-dasharray:5 4" />
      <path :d="path(sim.gru)" style="stroke:var(--accent);stroke-width:2.6;fill:none" />
      <circle :cx="sx(T)" :cy="sy(sim.last)" r="4" style="fill:var(--accent)" />
      <text :x="PAD" :y="18" style="fill:var(--accent);font-size:12">— GRU 隐状态 H_t</text>
      <text :x="PAD + 150" :y="18" style="fill:var(--ink-3);font-size:12">-- 普通 RNN 隐状态</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ fmt(sim.gruGrad) }}</b><span>GRU 梯度保留（12 步连乘）</span></div>
      <div class="stat"><b>{{ fmt(sim.rnnGrad) }}</b><span>普通 RNN 梯度保留</span></div>
      <div class="stat"><b>{{ sim.last.toFixed(3) }}</b><span>H_12</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">{{ state }}</p>
  </Widget>
</template>
