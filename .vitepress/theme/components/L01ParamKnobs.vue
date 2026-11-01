<script setup lang="ts">
import { ref, computed } from 'vue'

// 一组固定的样本点，真实关系约为 y = 2x + 1
const xs = [0.5, 1.2, 1.9, 2.6, 3.3, 4.0, 4.7, 5.4]
const ys = [1.9, 3.7, 5.0, 6.2, 7.3, 8.9, 10.4, 11.8]

const w = ref(0.4)
const b = ref(6)

const predict = (x: number) => w.value * x + b.value
const mse = computed(() => {
  const s = xs.reduce((acc, x, i) => acc + (predict(x) - ys[i]) ** 2, 0)
  return s / xs.length
})

// 主画布
const W = 470, H = 230, PAD = 30
const sx = (x: number) => PAD + (x / 6) * (W - PAD * 2)
const sy = (y: number) => H - PAD - (y / 14) * (H - PAD * 2)
const fitPath = computed(() => `M${sx(0)},${sy(predict(0))} L${sx(6)},${sy(predict(6))}`)

// 参数平面：每个点就是一个模型
const PW = 132
const pw = (v: number) => 8 + ((v + 1) / 5) * (PW - 16)
const pb = (v: number) => PW - 8 - ((v + 4) / 16) * (PW - 16)

const reset = () => { w.value = 0.4; b.value = 6 }
</script>

<template>
  <Widget title="参数就是旋钮：在一个模型族里挑一个模型">
    <p class="widget-note">
      直线的斜率和截距就是两个参数。转动它们，你就换了一个模型；右侧参数平面里的那个点，就是这个模型在「模型族」中的位置。
    </p>

    <div class="ctrl">
      <label>斜率 w <input v-model.number="w" type="range" min="-1" max="4" step="0.05"><b>{{ w.toFixed(2) }}</b></label>
      <label>截距 b <input v-model.number="b" type="range" min="-4" max="12" step="0.1"><b>{{ b.toFixed(1) }}</b></label>
      <button class="btn" type="button" @click="reset">回到初值</button>
    </div>

    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">
      <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="flex:1 1 320px;max-width:100%">
        <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
        <line :x1="sx(0)" :y1="PAD" :x2="sx(0)" :y2="H - PAD" style="stroke:var(--line)" />
        <circle
          v-for="(y, i) in ys" :key="i"
          :cx="sx(xs[i])" :cy="sy(y)" r="4"
          style="fill:var(--prin)"
        />
        <path :d="fitPath" style="stroke:var(--accent);stroke-width:2.5;fill:none" />
        <text :x="W - PAD" :y="sy(0) - 6" text-anchor="end" style="fill:var(--ink-3);font-size:11">x</text>
        <text :x="sx(0) + 6" :y="PAD + 4" style="fill:var(--ink-3);font-size:11">y</text>
      </svg>

      <div style="flex:0 0 auto">
        <svg :width="PW" :height="PW" :viewBox="`0 0 ${PW} ${PW}`">
          <rect x="0" y="0" :width="PW" :height="PW" rx="8" style="fill:var(--vp-c-bg);stroke:var(--line)" />
          <circle :cx="pw(w)" :cy="pb(b)" r="5.5" style="fill:var(--accent)" />
          <text :x="PW / 2" :y="PW - 2" text-anchor="middle" style="fill:var(--ink-3);font-size:10">w →</text>
          <text x="6" :y="10" style="fill:var(--ink-3);font-size:10">b ↑</text>
        </svg>
        <p class="widget-note" style="text-align:center;margin:4px 0 0">模型族中的一个点</p>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><b>{{ mse.toFixed(1) }}</b><span>训练集均方误差</span></div>
      <div class="stat"><b>{{ predict(3).toFixed(2) }}</b><span>x = 3 时的预测</span></div>
      <div class="stat"><b>{{ w.toFixed(2) }}, {{ b.toFixed(1) }}</b><span>当前参数</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      把直线调到大致穿过蓝点（约 w = 2、b = 1），误差最小。再想想：只有这两个旋钮，能拟合一条弯的曲线吗？
    </p>
  </Widget>
</template>
