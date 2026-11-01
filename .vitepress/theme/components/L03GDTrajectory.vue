<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// 与上一个演示同一组数据：y ≈ 1.5x + 2.0
const xs = [0.10, 0.18, 0.27, 0.35, 0.44, 0.52, 0.61, 0.69, 0.78, 0.86, 0.95]
const ys = [2.25, 2.19, 2.46, 2.47, 2.75, 2.74, 2.97, 2.95, 3.22, 3.26, 3.50]
const n = xs.length

// L(w,b) = A w² + 2B wb + C b² - 2D w - 2E b + F
const A = xs.reduce((s, x) => s + x * x, 0) / n
const B = xs.reduce((s, x) => s + x, 0) / n
const C = 1
const D = xs.reduce((s, x, i) => s + x * ys[i], 0) / n
const E = ys.reduce((s, y) => s + y, 0) / n
const F = ys.reduce((s, y) => s + y * y, 0) / n
const det = A * C - B * B
const wStar = (C * D - B * E) / det
const bStar = (A * E - B * D) / det
const Lmin = F - (D * wStar + E * bStar)

// 损失面的主轴与条件数
const diff = A - C
const disc = Math.sqrt(diff * diff + 4 * B * B)
const lam1 = (A + C + disc) / 2
const lam2 = (A + C - disc) / 2
const theta = 0.5 * Math.atan2(2 * B, diff)
const cond = (lam1 / lam2).toFixed(1)

const lossAt = (w: number, b: number) =>
  A * w * w + 2 * B * w * b + C * b * b - 2 * D * w - 2 * E * b + F

const lr = ref(0.2)
const path = ref<number[][]>([[0, 0]])
const running = ref(false)
const diverged = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const cur = computed(() => path.value[path.value.length - 1])
const curLoss = computed(() => lossAt(cur.value[0], cur.value[1]))

function step(times = 1) {
  if (diverged.value) return
  for (let k = 0; k < times; k++) {
    const [w, b] = path.value[path.value.length - 1]
    const gw = 2 * (A * w + B * b - D)
    const gb = 2 * (B * w + C * b - E)
    const nw = w - lr.value * gw
    const nb = b - lr.value * gb
    path.value = [...path.value, [nw, nb]]
    if (path.value.length > 600) path.value = path.value.slice(-600)
    if (!Number.isFinite(nw) || Math.abs(nw) > 20 || Math.abs(nb) > 20) {
      diverged.value = true
      stop()
      return
    }
    if (lossAt(nw, nb) - Lmin < 1e-5) stop()
  }
}
function reset() {
  stop()
  path.value = [[0, 0]]
  diverged.value = false
}
function toggle() {
  if (running.value) return stop()
  running.value = true
  timer = setInterval(() => step(1), 150)
}
function stop() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}
onUnmounted(stop)

const W = 460, H = 280, PAD = 36
const wmin = -0.6, wmax = 3.2, bmin = -1.4, bmax = 6.0
const sx = (w: number) => PAD + ((w - wmin) / (wmax - wmin)) * (W - PAD * 2)
const sy = (b: number) => H - PAD - ((b - bmin) / (bmax - bmin)) * (H - PAD * 2)

// 等高线：中心 + 特征方向上的椭圆
const contour = (t: number) => {
  const a = Math.sqrt(t / lam1), c = Math.sqrt(t / lam2)
  const ux = Math.cos(theta), uy = Math.sin(theta)
  const vx = -Math.sin(theta), vy = Math.cos(theta)
  const pts: string[] = []
  for (let i = 0; i <= 72; i++) {
    const p = (i / 72) * Math.PI * 2
    const w = wStar + a * Math.cos(p) * ux + c * Math.sin(p) * vx
    const b = bStar + a * Math.cos(p) * uy + c * Math.sin(p) * vy
    pts.push(`${i === 0 ? 'M' : 'L'}${sx(w).toFixed(1)},${sy(b).toFixed(1)}`)
  }
  return pts.join(' ')
}
const levels = [0.05, 0.15, 0.4, 1, 2, 4, 7].map(contour)

const polyline = computed(() =>
  path.value.map(([w, b], i) => `${i === 0 ? 'M' : 'L'}${sx(w).toFixed(1)},${sy(b).toFixed(1)}`).join(' ')
)
const status = computed(() => {
  if (diverged.value || curLoss.value > 60) return { text: '发散了：参数冲出了画面，损失越走越大。', cls: 'bad-c' }
  if (curLoss.value - Lmin < 0.005) return { text: '已收敛到谷底附近。', cls: 'ok-c' }
  return { text: '还在下降——注意路径的「之」字形。', cls: '' }
})
</script>

<template>
  <Widget title="学习率怎么影响轨迹：在损失平面上走一遍">
    <p class="widget-note">
      每个点是一组参数 (w, b)，颜色圈是损失等高线，越靠中心损失越小。梯度下降每次沿负梯度走一步，步长由学习率决定。这个损失面很狭长（条件数约 {{ cond }}），所以合法的学习率窗口并不宽。
    </p>

    <div class="ctrl">
      <span class="seg">
        <button v-for="v in [0.05, 0.2, 0.5, 0.8]" :key="v" type="button" :class="{ on: lr === v }" @click="lr = v; reset()">
          lr = {{ v }}
        </button>
      </span>
      <button class="btn primary" type="button" @click="step(1)">走一步</button>
      <button class="btn" type="button" @click="step(5)">走五步</button>
      <button class="btn" type="button" @click="toggle">{{ running ? '暂停' : '自动' }}</button>
      <button class="btn" type="button" @click="reset">重置</button>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
      <line :x1="sx(0)" :y1="PAD" :x2="sx(0)" :y2="H - PAD" style="stroke:var(--line)" />
      <path v-for="(d, i) in levels" :key="'c' + i" :d="d" style="fill:none;stroke:var(--line);stroke-width:1" />
      <path :d="polyline" style="fill:none;stroke:var(--accent);stroke-width:1.8;opacity:.85" />
      <circle v-for="([w, b], i) in path" :key="'p' + i" :cx="sx(w)" :cy="sy(b)" r="2" style="fill:var(--accent)" />
      <line :x1="sx(wStar) - 5" :y1="sy(bStar)" :x2="sx(wStar) + 5" :y2="sy(bStar)" style="stroke:var(--ex);stroke-width:2" />
      <line :x1="sx(wStar)" :y1="sy(bStar) - 5" :x2="sx(wStar)" :y2="sy(bStar) + 5" style="stroke:var(--ex);stroke-width:2" />
      <circle :cx="sx(cur[0])" :cy="sy(cur[1])" r="4.5" style="fill:var(--warn)" />
      <text :x="W - PAD" :y="sy(0) + 16" text-anchor="end" style="fill:var(--ink-3);font-size:11">w →</text>
      <text :x="sx(0) + 8" :y="PAD - 6" style="fill:var(--ink-3);font-size:11">b ↑</text>
      <text :x="sx(wStar) + 8" :y="sy(bStar) - 8" style="fill:var(--ex);font-size:11">最优 (w*, b*)</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ curLoss.toFixed(3) }}</b><span>当前损失</span></div>
      <div class="stat"><b>{{ cur[0].toFixed(2) }}, {{ cur[1].toFixed(2) }}</b><span>当前 (w, b)</span></div>
      <div class="stat"><b>{{ path.length - 1 }}</b><span>已走步数</span></div>
      <div class="stat"><b>{{ cond }}</b><span>损失面条件数</span></div>
    </div>

    <p class="widget-note" :class="status.cls" style="margin-bottom:0">
      {{ status.text }}
      试试 lr = 0.8：理论上稳定上界是 2/λ<sub>max</sub> ≈ 0.78，越过它，轨迹就会沿陡峭方向来回放大，几步之后飞出画面。把 lr 调小到 0.05，方向不会错，但要走很多步才到谷底。
    </p>
  </Widget>
</template>
