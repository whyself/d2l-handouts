<script setup lang="ts">
import { ref, computed } from 'vue'

// 标量版 LSTM：输入固定，候选记忆元 C~ = tanh(1) ≈ 0.7616 每步都一样。
const f = ref(0.9)
const i = ref(0.6)
const o = ref(1)
const T = 12
const CT = Math.tanh(1)

const sim = computed(() => {
  const cs: number[] = [0]
  const hs: number[] = [0]
  let c = 0
  for (let t = 1; t <= T; t++) {
    c = f.value * c + i.value * CT
    cs.push(c)
    hs.push(o.value * Math.tanh(c))
  }
  return { cs, hs, c, h: o.value * Math.tanh(c), keep: Math.pow(f.value, T) }
})

const W = 460
const H = 300
const PAD = 40
const sx = (k: number) => PAD + (k / T) * (W - PAD * 2)

// 上半幅画记忆元 C（自动定标），下半幅画隐状态 H（固定 0~1）
const maxC = computed(() => Math.max(1, ...sim.value.cs) * 1.08)
const top = (v: number) => 138 - (v / maxC.value) * 100
const bot = (v: number) => 284 - ((v + 1) / 2) * 100

const line = (arr: number[], y: (v: number) => number) =>
  arr.map((v, k) => `${k === 0 ? 'M' : 'L'}${sx(k)},${y(v)}`).join(' ')

function preset(kind: 'hold' | 'write' | 'clear') {
  if (kind === 'hold') { f.value = 1; i.value = 0.12; o.value = 1 }
  if (kind === 'write') { f.value = 0.98; i.value = 0.7; o.value = 1 }
  if (kind === 'clear') { f.value = 0; i.value = 0.8; o.value = 1 }
}

const note = computed(() => {
  if (i.value === 0 && f.value === 1) return '遗忘门 = 1、输入门 = 0：记忆元一动不动，C_t 永远是 0——这就是“信息原样滑过去”的极限情形。'
  if (f.value === 1) return '遗忘门 = 1：旧记忆一个都不丢，C_t 随写入量线性累加，越走越大。'
  if (f.value === 0) return '遗忘门 = 0：每一步都把旧记忆清空，C_t 只由当前输入决定，等价于没有记忆。'
  return '遗忘门在打折旧记忆：C_t 会收敛到 i·C̃/(1−f) 附近，既保留历史又不会无限膨胀。'
})
</script>

<template>
  <Widget title="记忆元是传送带，隐状态只是取景窗">
    <p class="widget-note">
      上幅是记忆元 C（纵轴自动缩放，注意它没有上界），下幅是隐状态 H（始终在 −1 到 1 之间）。候选记忆元固定为 tanh(1) ≈ 0.762，每个时间步都往传送带上放一份。
    </p>

    <div class="ctrl">
      <button class="btn" type="button" @click="preset('hold')">只加不忘</button>
      <button class="btn" type="button" @click="preset('write')">边记边忘</button>
      <button class="btn" type="button" @click="preset('clear')">每步清空</button>
    </div>

    <div class="ctrl">
      <label>遗忘门 f
        <input v-model.number="f" type="range" min="0" max="1" step="0.01"><b>{{ f.toFixed(2) }}</b>
      </label>
      <label>输入门 i
        <input v-model.number="i" type="range" min="0" max="1" step="0.01"><b>{{ i.toFixed(2) }}</b>
      </label>
      <label>输出门 o
        <input v-model.number="o" type="range" min="0" max="1" step="0.01"><b>{{ o.toFixed(2) }}</b>
      </label>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <text :x="12" :y="26" style="fill:var(--ex);font-size:12;font-weight:600">记忆元 C_t（加性更新，无上界）</text>
      <line :x1="PAD" :y1="top(0)" :x2="W - PAD" :y2="top(0)" style="stroke:var(--line)" />
      <text :x="PAD - 6" :y="top(0) + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">0</text>
      <text :x="PAD - 6" :y="top(maxC / 1.08) + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">{{ (maxC / 1.08).toFixed(1) }}</text>
      <path :d="line(sim.cs, top)" style="stroke:var(--ex);stroke-width:2.6;fill:none" />

      <text :x="12" :y="168" style="fill:var(--accent);font-size:12;font-weight:600">隐状态 H_t = o · tanh(C_t)（被压回 −1 ~ 1）</text>
      <line :x1="PAD" :y1="bot(0)" :x2="W - PAD" :y2="bot(0)" style="stroke:var(--line)" />
      <line :x1="PAD" :y1="bot(1)" :x2="W - PAD" :y2="bot(1)" style="stroke:var(--line);stroke-dasharray:3 4" />
      <line :x1="PAD" :y1="bot(-1)" :x2="W - PAD" :y2="bot(-1)" style="stroke:var(--line);stroke-dasharray:3 4" />
      <text :x="PAD - 6" :y="bot(1) + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">1</text>
      <text :x="PAD - 6" :y="bot(0) + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">0</text>
      <text :x="PAD - 6" :y="bot(-1) + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">−1</text>
      <path :d="line(sim.hs, bot)" style="stroke:var(--accent);stroke-width:2.6;fill:none" />
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ sim.c.toFixed(2) }}</b><span>C_12（记忆元）</span></div>
      <div class="stat"><b>{{ sim.h.toFixed(3) }}</b><span>H_12（隐状态）</span></div>
      <div class="stat"><b>{{ sim.keep.toFixed(3) }}</b><span>梯度保留 f^12</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">{{ note }}</p>
  </Widget>
</template>
