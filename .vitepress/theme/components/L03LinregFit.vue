<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// 固定数据集：y ≈ 1.55x + 2.1，带一点噪声
const xs = [0.10, 0.18, 0.27, 0.35, 0.44, 0.52, 0.61, 0.69, 0.78, 0.86, 0.95]
const ys = [2.25, 2.19, 2.46, 2.47, 2.75, 2.74, 2.97, 2.95, 3.22, 3.26, 3.50]
const n = xs.length

// 解析解：w* = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)²，b* = ȳ - w* x̄
const mx = xs.reduce((s, x) => s + x, 0) / n
const my = ys.reduce((s, y) => s + y, 0) / n
const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
const wStar = sxy / sxx
const bStar = my - wStar * mx

const w = ref(0)
const b = ref(0)
const steps = ref(0)
const running = ref(false)
const lr = ref(0.2)
const blown = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const loss = computed(() => {
  const s = xs.reduce((acc, x, i) => acc + (w.value * x + b.value - ys[i]) ** 2, 0)
  return s / n
})
const gap = computed(() => Math.abs(w.value - wStar) + Math.abs(b.value - bStar))

function step(times = 1) {
  if (blown.value) return
  for (let k = 0; k < times; k++) {
    let gw = 0, gb = 0
    for (let i = 0; i < n; i++) {
      const e = w.value * xs[i] + b.value - ys[i]
      gw += 2 * e * xs[i]
      gb += 2 * e
    }
    w.value -= lr.value * (gw / n)
    b.value -= lr.value * (gb / n)
    steps.value++
    if (!Number.isFinite(w.value) || Math.abs(w.value) > 1e4) { blown.value = true; stop(); return }
  }
}
function reset() {
  stop()
  w.value = 0; b.value = 0; steps.value = 0; blown.value = false
}
function toggle() {
  if (running.value) return stop()
  running.value = true
  timer = setInterval(() => step(1), 160)
}
function stop() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}
onUnmounted(stop)

const W = 460, H = 250, PAD = 36
const sx = (x: number) => PAD + (x / 1.05) * (W - PAD * 2)
const sy = (y: number) => H - PAD - (y / 4.0) * (H - PAD * 2)
const line = computed(() => `M${sx(0)},${sy(b.value)} L${sx(1.0)},${sy(w.value * 1.0 + b.value)}`)
const starLine = `M${sx(0)},${sy(bStar)} L${sx(1.0)},${sy(wStar + bStar)}`
</script>

<template>
  <Widget title="解析解 vs 梯度下降：两条路走到同一条直线">
    <p class="widget-note">
      虚线是解析解 (XᵀX)⁻¹Xᵀy 一步算出的最优直线，实线是梯度下降从 w = 0、b = 0 出发一步步逼近的结果。散点是 11 个带噪声的样本。
    </p>

    <div class="ctrl">
      <span class="seg">
        <button v-for="v in [0.05, 0.2, 0.5, 0.7]" :key="v" type="button" :class="{ on: lr === v }" @click="lr = v; reset()">
          lr = {{ v }}
        </button>
      </span>
      <button class="btn primary" type="button" @click="step(1)">走一步</button>
      <button class="btn" type="button" @click="step(10)">走十步</button>
      <button class="btn" type="button" @click="toggle">{{ running ? '暂停' : '自动' }}</button>
      <button class="btn" type="button" @click="reset">重置</button>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
      <line :x1="sx(0)" :y1="PAD" :x2="sx(0)" :y2="H - PAD" style="stroke:var(--line)" />
      <line
        v-for="(y, i) in ys" :key="'r' + i"
        :x1="sx(xs[i])" :y1="sy(y)" :x2="sx(xs[i])" :y2="sy(w * xs[i] + b)"
        style="stroke:var(--warn);stroke-width:1;stroke-dasharray:2 3;opacity:.45"
      />
      <path :d="starLine" style="stroke:var(--ex);stroke-width:2;fill:none;stroke-dasharray:6 5" />
      <circle v-for="(y, i) in ys" :key="i" :cx="sx(xs[i])" :cy="sy(y)" r="4" style="fill:var(--prin)" />
      <path :d="line" style="stroke:var(--accent);stroke-width:2.6;fill:none" />
      <text :x="W - PAD" :y="sy(0) + 16" text-anchor="end" style="fill:var(--ink-3);font-size:11">面积 →</text>
      <text :x="sx(0) - 6" :y="PAD - 8" text-anchor="end" style="fill:var(--ink-3);font-size:11">价格 ↑</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ loss.toFixed(3) }}</b><span>当前训练损失</span></div>
      <div class="stat"><b>{{ w.toFixed(2) }}, {{ b.toFixed(2) }}</b><span>当前 w, b</span></div>
      <div class="stat"><b>{{ wStar.toFixed(2) }}, {{ bStar.toFixed(2) }}</b><span>解析解 w*, b*</span></div>
      <div class="stat"><b>{{ steps }}</b><span>已走步数</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      当前参数与解析解的曼哈顿距离：<b>{{ gap.toFixed(3) }}</b>。学习率越大，逼近越快；但把它调到 0.7 再按「自动」，你会看到直线在最优解两侧来回弹——这就是第 3.1.1.4 节说的「步长不能太大」。
    </p>
  </Widget>
</template>
