<script setup lang="ts">
import { ref, computed } from 'vue'

// 固定数据集：40 个样本，y = 1.6x + 1.0 + 噪声
const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453
  return s - Math.floor(s)
}
const N = 40
const xs = Array.from({ length: N }, (_, i) => (i + 0.5) / N)
const ys = xs.map((x, i) => 1.6 * x + 1.0 + (rnd(i) - 0.5) * 0.5)

// 当前参数：故意选在离最优解较远的地方，梯度信号更明显
const w0 = 0.3, b0 = 2.6

const gradOf = (idx: number[]) => {
  let gw = 0, gb = 0
  for (const i of idx) {
    const e = w0 * xs[i] + b0 - ys[i]
    gw += 2 * e * xs[i]
    gb += 2 * e
  }
  return { gw: gw / idx.length, gb: gb / idx.length }
}
const full = gradOf(Array.from({ length: N }, (_, i) => i))

const batchSize = ref(8)
const seed = ref(1)

function shuffled(s: number) {
  const a = Array.from({ length: N }, (_, i) => i)
  let t = s * 2654435761 % 4294967296
  const next = () => {
    t = (t * 1664525 + 1013904223) % 4294967296
    return t / 4294967296
  }
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const batches = computed(() => {
  const order = shuffled(seed.value)
  const B = batchSize.value
  const out: { gw: number; gb: number }[] = []
  for (let i = 0; i < N; i += B) out.push(gradOf(order.slice(i, i + B)))
  return out
})

const updatesPerEpoch = computed(() => Math.ceil(N / batchSize.value))

const spread = computed(() => {
  const g = full
  const gl = Math.hypot(g.gw, g.gb)
  let ang = 0, mags: number[] = []
  for (const b of batches.value) {
    const bl = Math.hypot(b.gw, b.gb)
    const cos = (b.gw * g.gw + b.gb * g.gb) / (bl * gl || 1)
    ang += Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
    mags.push(bl)
  }
  const mean = mags.reduce((s, v) => s + v, 0) / mags.length
  const sd = Math.sqrt(mags.reduce((s, v) => s + (v - mean) ** 2, 0) / mags.length)
  return { angle: ang / batches.value.length, cv: sd / (mean || 1) }
})

// 箭头坐标：以当前参数点为原点
const CX = 218, CY = 142
const scale = 55 / Math.hypot(full.gw, full.gb)
const tip = (g: { gw: number; gb: number }) => ({ x: CX + g.gw * scale, y: CY - g.gb * scale })
const fullTip = tip(full)
</script>

<template>
  <Widget title="小批量：用几个样本估出整批的梯度">
    <p class="widget-note">
      原点是一组固定的参数 (w, b)。深色粗箭头是全量梯度（用全部 40 个样本算），彩色细箭头是各个小批量的梯度估计，它们的平均就是全量梯度。批量越小，估计越散；但一次更新只需要算 B 个样本。
    </p>

    <div class="ctrl">
      <span class="seg">
        <button v-for="b in [1, 4, 8, 20, 40]" :key="b" type="button" :class="{ on: batchSize === b }" @click="batchSize = b">
          B = {{ b }}
        </button>
      </span>
      <button class="btn" type="button" @click="seed++">换一批</button>
    </div>

    <svg width="440" height="284" viewBox="0 0 440 284" style="max-width:100%">
      <line :x1="20" :y1="CY" :x2="420" :y2="CY" style="stroke:var(--line);stroke-dasharray:4 4" />
      <line :x1="CX" :y1="16" :x2="CX" :y2="268" style="stroke:var(--line);stroke-dasharray:4 4" />
      <line
        v-for="(g, i) in batches" :key="'b' + i"
        :x1="CX" :y1="CY" :x2="tip(g).x" :y2="tip(g).y"
        style="stroke:var(--accent);stroke-width:1.2;opacity:.45"
      />
      <circle v-for="(g, i) in batches" :key="'d' + i" :cx="tip(g).x" :cy="tip(g).y" r="2.6" style="fill:var(--accent);opacity:.75" />
      <line
        :x1="CX" :y1="CY" :x2="CX + full.gw * scale" :y2="CY - full.gb * scale"
        style="stroke:var(--ink);stroke-width:3"
      />
      <circle :cx="fullTip.x" :cy="fullTip.y" r="4" style="fill:var(--ink)" />
      <circle :cx="CX" :cy="CY" r="4" style="fill:var(--warn)" />
      <text :x="CX + 8" :y="CY + 16" style="fill:var(--ink-3);font-size:11">当前 (w, b)</text>
      <text :x="fullTip.x + 6" :y="fullTip.y - 4" style="fill:var(--ink);font-size:11">全量梯度</text>
      <text :x="CX + 8" :y="24" style="fill:var(--ink-3);font-size:11">Δb ↑</text>
      <text :x="408" :y="CY - 6" text-anchor="end" style="fill:var(--ink-3);font-size:11">Δw →</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ batchSize }}</b><span>每次更新的样本数</span></div>
      <div class="stat"><b>{{ updatesPerEpoch }}</b><span>每个 epoch 更新次数</span></div>
      <div class="stat"><b>{{ spread.angle.toFixed(1) }}°</b><span>方向平均偏差</span></div>
      <div class="stat"><b>{{ (spread.cv * 100).toFixed(0) }}%</b><span>幅度变异系数</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      把 B 调到 40，所有彩色箭头会与深色箭头重合：全量梯度是它的特例。把 B 调到 1，箭头四散——单样本梯度噪声极大，但因为每个 epoch 能更新 40 次，前期损失往往掉得更快。这就是「方差换步数」的取舍。
    </p>
  </Widget>
</template>
