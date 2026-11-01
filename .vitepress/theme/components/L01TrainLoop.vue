<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// 固定数据集：y ≈ 1.8x + 2，带一点噪声
const xs = [0.3, 0.8, 1.4, 1.9, 2.5, 3.0, 3.6, 4.1, 4.7, 5.2]
const ys = [2.7, 3.4, 4.6, 5.5, 6.3, 7.6, 8.3, 9.7, 10.2, 11.6]

const w = ref(0)
const b = ref(0)
const steps = ref(0)
const history = ref<number[]>([])
const running = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const lr = 0.02
const loss = computed(() => xs.reduce((s, x, i) => s + (w.value * x + b.value - ys[i]) ** 2, 0) / xs.length)

function grad() {
  let gw = 0, gb = 0
  xs.forEach((x, i) => {
    const e = w.value * x + b.value - ys[i]
    gw += 2 * e * x
    gb += 2 * e
  })
  return { gw: gw / xs.length, gb: gb / xs.length }
}

function step() {
  const { gw, gb } = grad()
  w.value -= lr * gw
  b.value -= lr * gb
  steps.value++
  history.value = [...history.value.slice(-59), loss.value]
}

function reset() {
  stop()
  w.value = 0
  b.value = 0
  steps.value = 0
  history.value = [loss.value]
}

function start() {
  if (running.value) return stop()
  running.value = true
  timer = setInterval(step, 220)
}

function stop() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}

onUnmounted(stop)
reset()

// 画布
const W = 470, H = 200, PAD = 28
const sx = (x: number) => PAD + (x / 6) * (W - PAD * 2)
const sy = (y: number) => H - PAD - (y / 14) * (H - PAD * 2)
const linePath = computed(() => `M${sx(0)},${sy(b.value)} L${sx(6)},${sy(w.value * 6 + b.value)}`)

// 损失曲线
const LW = 180, LH = 70
const lossPath = computed(() => {
  const h = history.value
  if (h.length < 2) return ''
  const max = Math.max(...h, 1)
  return h.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (h.length - 1)) * LW},${LH - (v / max) * (LH - 8) - 4}`).join(' ')
})

const phase = computed(() => {
  if (steps.value === 0) return '① 随机初始化：模型基本没有「智能」'
  if (steps.value < 4) return '② 取一批数据样本，算损失'
  return '③ 沿负梯度方向调整参数　→　④ 重复'
})
</script>

<template>
  <Widget title="训练循环：采样 → 算损失 → 调参数 → 重复">
    <p class="widget-note">
      一开始参数全是 0，直线是平的。每按一次「走一步」，算法就算出当前损失往哪个方向下降，然后把 w 和 b 挪一小步。这就是图 1.1.2 的四个步骤。
    </p>

    <div class="ctrl">
      <button class="btn primary" type="button" @click="step">走一步</button>
      <button class="btn" type="button" @click="start">{{ running ? '暂停' : '自动训练' }}</button>
      <button class="btn" type="button" @click="reset">重新初始化</button>
      <span class="muted" style="font-size:13px">学习率 {{ lr }}</span>
    </div>

    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="flex:1 1 320px;max-width:100%">
        <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
        <line :x1="sx(0)" :y1="PAD" :x2="sx(0)" :y2="H - PAD" style="stroke:var(--line)" />
        <line
          v-for="(y, i) in ys" :key="i"
          :x1="sx(xs[i])" :y1="sy(y)" :x2="sx(xs[i])" :y2="sy(w * xs[i] + b)"
          style="stroke:var(--warn);stroke-width:1;stroke-dasharray:2 3;opacity:.55"
        />
        <circle v-for="(y, i) in ys" :key="'p' + i" :cx="sx(xs[i])" :cy="sy(y)" r="4" style="fill:var(--prin)" />
        <path :d="linePath" style="stroke:var(--accent);stroke-width:2.5;fill:none" />
      </svg>

      <div>
        <svg :width="LW" :height="LH" :viewBox="`0 0 ${LW} ${LH}`">
          <rect x="0" y="0" :width="LW" :height="LH" rx="6" style="fill:var(--vp-c-bg);stroke:var(--line)" />
          <line :x1="4" :y1="LH - 4" :x2="LW - 4" :y2="LH - 4" style="stroke:var(--line)" />
          <path :d="lossPath" style="stroke:var(--ex);stroke-width:2;fill:none" />
          <text
            v-if="history.length < 2" :x="LW / 2" :y="LH / 2 + 4" text-anchor="middle"
            style="fill:var(--ink-3);font-size:11"
          >点「走一步」开始记录</text>
        </svg>
        <p class="widget-note" style="margin:4px 0 0">损失曲线（最近 60 步）</p>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><b>{{ loss.toFixed(2) }}</b><span>当前损失</span></div>
      <div class="stat"><b>{{ w.toFixed(2) }}, {{ b.toFixed(2) }}</b><span>w, b</span></div>
      <div class="stat"><b>{{ steps }}</b><span>已走步数</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">{{ phase }}</p>
  </Widget>
</template>
