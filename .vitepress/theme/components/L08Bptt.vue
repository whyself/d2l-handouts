<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const T = ref(12)
const tau = ref(4)
const rho = ref(0.9)
const mode = ref<'trunc' | 'full'>('trunc')
const cursor = ref(12)
const timer = ref<ReturnType<typeof setInterval> | null>(null)

watch(T, v => { cursor.value = v; stop() })
watch([tau, rho, mode], () => stop())

const winFrom = computed(() => (mode.value === 'full' ? 1 : Math.max(1, cursor.value - tau.value + 1)))
const winLen = computed(() => cursor.value - winFrom.value + 1)

const bars = computed(() => {
  const t = cursor.value
  const out: { i: number; c: number; reached: boolean; included: boolean }[] = []
  for (let i = 1; i <= T.value; i++) {
    const reached = i <= t
    out.push({
      i,
      c: reached ? Math.pow(rho.value, t - i) : 0,
      reached,
      included: reached && i >= winFrom.value
    })
  }
  return out
})

const sumGrad = computed(() => {
  let s = 0
  for (let i = winFrom.value; i <= cursor.value; i++) s += Math.pow(rho.value, cursor.value - i)
  return s
})

const scale = (c: number) => {
  if (c <= 0) return 0
  const v = (Math.log10(c) + 6) / 7
  return Math.max(0, Math.min(1, v))
}

// 画布
const W = 600
const H = 150
const PADL = 34
const cellW = computed(() => (W - PADL - 8) / T.value)
const cx = (i: number) => PADL + (i - 0.5) * cellW.value
const BAR_BASE = 100
const BAR_MAX = 86

function step() { if (cursor.value > 1) cursor.value-- }
function run() {
  if (timer.value) { stop(); return }
  timer.value = setInterval(() => {
    if (cursor.value <= 1) { stop(); return }
    cursor.value--
  }, 170)
}
function stop() {
  if (timer.value) { clearInterval(timer.value); timer.value = null }
}
function reset() { stop(); cursor.value = T.value }
onUnmounted(stop)
</script>

<template>
  <Widget title="梯度沿时间反向累加：ρ 决定它消失还是爆炸">
    <p class="widget-note">
      计算 ∂L/∂h_t 时，越早的时间步要乘越多个 W_hh 转置。这里把谱半径 ρ 抽出来当作那个连乘的放大倍数：第 i 步的贡献是 ρ^(t-i)。点「反向一步」，从 t=T 往回走，深色柱是本次截断窗口真正累加进来的那几步。
    </p>

    <div class="ctrl">
      <label>序列长度 T
        <input v-model.number="T" type="range" min="4" max="24" step="1">
        <b>{{ T }}</b>
      </label>
      <label>截断窗口 τ
        <input v-model.number="tau" type="range" min="1" max="12" step="1">
        <b>{{ tau }}</b>
      </label>
      <label>谱半径 ρ
        <input v-model.number="rho" type="range" min="0.5" max="1.25" step="0.05">
        <b>{{ rho.toFixed(2) }}</b>
      </label>
      <div class="seg">
        <button type="button" :class="{ on: mode === 'trunc' }" @click="mode = 'trunc'">截断</button>
        <button type="button" :class="{ on: mode === 'full' }" @click="mode = 'full'">完全计算</button>
      </div>
    </div>

    <div class="ctrl" style="margin-top:0">
      <button class="btn primary" type="button" @click="step">反向一步</button>
      <button class="btn" type="button" @click="run">{{ timer ? '暂停' : '自动倒着走' }}</button>
      <button class="btn" type="button" @click="reset">重置到 t = T</button>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;max-width:600px">
      <line :x1="PADL" :y1="BAR_BASE" :x2="W - 8" :y2="BAR_BASE" style="stroke:var(--line)" />
      <text :x="4" :y="20" style="fill:var(--ink-3);font-size:10">1</text>
      <text :x="4" :y="BAR_BASE" style="fill:var(--ink-3);font-size:10">小</text>

      <g v-for="b in bars" :key="b.i">
        <rect
          :x="cx(b.i) - cellW * 0.32" :y="BAR_BASE - scale(b.c) * BAR_MAX"
          :width="cellW * 0.64" :height="Math.max(1, scale(b.c) * BAR_MAX)"
          :style="{
            fill: b.included ? 'var(--accent)' : b.reached ? 'var(--line)' : 'transparent',
            opacity: b.reached ? (b.included ? 0.9 : 0.7) : 0.15
          }"
        />
        <text
          v-if="T <= 16 || b.i % 2 === 1"
          :x="cx(b.i)" :y="BAR_BASE + 13" text-anchor="middle"
          :style="{ fill: b.i === cursor ? 'var(--accent)' : 'var(--ink-3)', fontSize: '10px' }"
        >{{ b.i }}</text>
      </g>

      <line :x1="cx(cursor) + cellW * 0.45" :y1="6" :x2="cx(cursor) + cellW * 0.45" :y2="BAR_BASE"
            style="stroke:var(--accent);stroke-width:1;stroke-dasharray:2 3" />
      <text :x="Math.min(cx(cursor) + cellW * 0.45 + 3, W - 26)" :y="14"
            style="fill:var(--accent);font-size:10">t = {{ cursor }}</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ cursor }}</b><span>正在算 ∂L/∂h_t</span></div>
      <div class="stat"><b>{{ winLen }}</b><span>窗口内累加的步数</span></div>
      <div class="stat"><b>{{ Math.pow(rho, cursor - 1).toExponential(1) }}</b><span>走了 t-1 步后的缩放</span></div>
      <div class="stat"><b>{{ sumGrad.toFixed(2) }}</b><span>窗口内梯度的相对总和</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      <template v-if="rho < 1">
        ρ = {{ rho.toFixed(2) }} 时，每往回一步就乘一次 {{ rho.toFixed(2) }}：t-1 步之后只剩 {{ (Math.pow(rho, cursor - 1) * 100).toFixed(2) }}%。这就是<b>梯度消失</b>——离得远的那些时间步对参数的贡献几乎为零，模型学不到长依赖。
      </template>
      <template v-else-if="rho > 1">
        ρ = {{ rho.toFixed(2) }} 时每往回一步就乘一次 {{ rho.toFixed(2) }}：t-1 步之后放大到 {{ Math.pow(rho, cursor - 1).toExponential(1) }} 倍。这就是<b>梯度爆炸</b>，也是 RNN 训练必须做梯度裁剪的原因。
      </template>
      <template v-else>
        ρ = 1.00 时连乘不长不消，梯度完全靠各步自身的大小累加；真实网络里它通常被扰动到大于或小于 1，于是要么爆要么消。
      </template>
      把 τ 调小、切到「完全计算」对比：τ 越小窗口越短，塔尖越平，梯度越稳，但远处那几十步的信息也就彻底不看了——这正是原书说的「截断带来轻度正则化」。随机截断（概率性地停）不在这里画，它只是把同一次截断的边界随机化。
    </p>
  </Widget>
</template>
