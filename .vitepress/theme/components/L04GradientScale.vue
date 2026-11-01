<script setup lang="ts">
import { ref, computed } from 'vue'

const gain = ref(0.6)
const depth = ref(30)

const W = 520
const H = 240
const PAD = 40
const LMAX = 60

const sx = (l: number) => PAD + (l / LMAX) * (W - PAD * 2)
const sy = (v: number) => H - PAD - ((Math.max(-40, Math.min(40, v)) + 40) / 80) * (H - PAD * 2)

function pathOf(f: (l: number) => number, upto: number) {
  const pts: string[] = []
  for (let l = 0; l <= upto; l++) pts.push(`${l === 0 ? 'M' : 'L'}${sx(l).toFixed(1)},${sy(f(l)).toFixed(1)}`)
  return pts.join(' ')
}

const mainCurve = computed(() => pathOf((l) => l * Math.log10(gain.value), depth.value))
const sigCurve = pathOf((l) => l * Math.log10(0.25), LMAX)

const finalLog = computed(() => depth.value * Math.log10(gain.value))
const finalVal = computed(() => Math.pow(gain.value, depth.value))
const status = computed(() => {
  const s = finalLog.value
  if (s < -8) return { cls: 'bad', text: '梯度消失：反向传到输入层时几乎变成 0，参数几乎不再更新。' }
  if (s > 8) return { cls: 'bad', text: '梯度爆炸：几步更新就把权重推到发散，训练直接崩掉。' }
  return { cls: 'ok', text: '尺度还在可控范围：每层增益接近 1 时，梯度能穿过较深的网络。' }
})

const fmt = (v: number) => {
  if (!isFinite(v)) return v > 0 ? '溢出' : '0'
  if (v === 0) return '下溢为 0'
  if (v >= 1e4 || v < 1e-3) return v.toExponential(2)
  return v.toFixed(3)
}
</script>

<template>
  <Widget title="梯度穿过 30 层之后会变成什么样">
    <p class="widget-note">
      把每层雅可比矩阵的“典型尺度”记作 g，穿越 L 层的梯度量级大约是 g<sup>L</sup>（纵轴取以 10 为底的对数）。拖动两个滑块，看这条线怎样掉下去或冲上去。
    </p>

    <div class="ctrl">
      <label>
        每层增益 g
        <input v-model.number="gain" type="range" min="0.2" max="2" step="0.05" />
        <b>{{ gain.toFixed(2) }}</b>
      </label>
      <label>
        深度 L
        <input v-model.number="depth" type="range" min="1" max="60" step="1" />
        <b>{{ depth }}</b>
      </label>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width: 100%">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke: var(--line)" />
      <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="H - PAD" style="stroke: var(--line)" />
      <text :x="PAD - 6" :y="sy(0) + 4" text-anchor="end" style="fill: var(--ink-3); font-size: 11">10⁰</text>
      <text :x="PAD - 6" :y="sy(20) + 4" text-anchor="end" style="fill: var(--ink-3); font-size: 11">10²⁰</text>
      <text :x="PAD - 6" :y="sy(-20) + 4" text-anchor="end" style="fill: var(--ink-3); font-size: 11">10⁻²⁰</text>
      <text :x="W - PAD" :y="H - PAD + 16" text-anchor="end" style="fill: var(--ink-3); font-size: 11">层数</text>

      <path :d="sigCurve" style="stroke: var(--ink-3); stroke-width: 1.6; fill: none" stroke-dasharray="4 4" />
      <path :d="mainCurve" style="stroke: var(--accent); stroke-width: 2.6; fill: none" />
      <circle :cx="sx(depth)" :cy="sy(finalLog)" r="4.5" style="fill: var(--accent)" />
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ fmt(finalVal) }}</b><span>g<sup>L</sup> 的数值</span></div>
      <div class="stat"><b>{{ finalLog.toFixed(1) }}</b><span>log₁₀ 尺度</span></div>
      <div class="stat"><b>{{ gain.toFixed(2) }}</b><span>每层增益</span></div>
      <div class="stat"><b>0.25<sup>L</sup></b><span>虚线的 sigmoid 参考</span></div>
    </div>

    <p class="widget-note" :class="status.cls === 'ok' ? 'ok-c' : 'bad-c'" style="margin-bottom: 0">
      {{ status.text }}
      <span class="muted">（虚线是 sigmoid 导数最大只有 0.25 时的情形：30 层就是 0.25³⁰ ≈ 8.7 × 10⁻¹⁹。）</span>
    </p>
  </Widget>
</template>
