<script setup lang="ts">
import { ref, computed } from 'vue'

type Fn = (x: number) => number
const sig = (x: number) => 1 / (1 + Math.exp(-x))

const FUNCS: Record<string, { label: string; f: Fn; d: Fn; range: string }> = {
  relu: {
    label: 'ReLU',
    f: (x) => Math.max(x, 0),
    d: (x) => (x > 0 ? 1 : 0),
    range: '[0, +∞)',
  },
  sigmoid: {
    label: 'sigmoid',
    f: (x) => sig(x),
    d: (x) => sig(x) * (1 - sig(x)),
    range: '(0, 1)',
  },
  tanh: {
    label: 'tanh',
    f: (x) => Math.tanh(x),
    d: (x) => 1 - Math.tanh(x) * Math.tanh(x),
    range: '(−1, 1)',
  },
}

const KEY = ref('relu')
const cur = computed(() => FUNCS[KEY.value])
const showGrad = ref(true)
const probe = ref(0.8)

const W = 520
const H = 250
const PAD = 34
const XMIN = -5
const XMAX = 5
const YMIN = -1.5
const YMAX = 3

const sx = (x: number) => PAD + ((x - XMIN) / (XMAX - XMIN)) * (W - PAD * 2)
const sy = (y: number) => H - PAD - ((y - YMIN) / (YMAX - YMIN)) * (H - PAD * 2)

function pathOf(f: Fn): string {
  const pts: string[] = []
  for (let i = 0; i <= 140; i++) {
    const x = XMIN + ((XMAX - XMIN) * i) / 140
    const y = Math.max(YMIN, Math.min(YMAX, f(x)))
    pts.push(`${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
  }
  return pts.join(' ')
}

const curve = computed(() => pathOf(cur.value.f))
const dcurve = computed(() => pathOf(cur.value.d))

const px = computed(() => sx(probe.value))
const py = computed(() => sy(Math.max(YMIN, Math.min(YMAX, cur.value.f(probe.value)))))

const v = computed(() => cur.value.f(probe.value))
const g = computed(() => cur.value.d(probe.value))
</script>

<template>
  <Widget title="三种激活函数：形状、值与导数">
    <p class="widget-note">
      横轴从 −5 到 5。实线是激活函数本身，虚线是它的导数。拖动滑块，看某一点的取值和梯度——反向传播乘的就是这个导数。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button v-for="(f, k) in FUNCS" :key="k" type="button" :class="{ on: KEY === k }" @click="KEY = k">
          {{ f.label }}
        </button>
      </div>
      <label>
        <input v-model="showGrad" type="checkbox" />
        显示导数
      </label>
      <label>
        试探点 x
        <input v-model.number="probe" type="range" min="-5" max="5" step="0.05" />
      </label>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width: 100%">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke: var(--line)" />
      <line :x1="sx(0)" :y1="PAD" :x2="sx(0)" :y2="H - PAD" style="stroke: var(--line)" />
      <text :x="W - PAD" :y="sy(0) - 8" text-anchor="end" style="fill: var(--ink-3); font-size: 11">x</text>

      <path v-if="showGrad" :d="dcurve" style="stroke: var(--ex); stroke-width: 2; fill: none" stroke-dasharray="5 4" />
      <path :d="curve" style="stroke: var(--accent); stroke-width: 2.5; fill: none" />

      <line :x1="px" :y1="PAD" :x2="px" :y2="H - PAD" style="stroke: var(--ink-3); stroke-dasharray: 2 4" />
      <circle :cx="px" :cy="py" r="4.5" style="fill: var(--accent)" />
      <text :x="px + 8" :y="py - 8" style="fill: var(--ink-2); font-size: 11">
        f({{ probe.toFixed(2) }}) = {{ v.toFixed(3) }}
      </text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ cur.label }}</b><span>当前函数</span></div>
      <div class="stat"><b>{{ v.toFixed(3) }}</b><span>f(x) 在 x = {{ probe.toFixed(2) }}</span></div>
      <div class="stat"><b>{{ g.toFixed(3) }}</b><span>f′(x)</span></div>
      <div class="stat"><b>{{ cur.range }}</b><span>输出范围</span></div>
    </div>

    <p class="widget-note" style="margin-bottom: 0">
      ReLU 的导数只有 0 和 1 两种取值，梯度要么原样通过要么被切断；sigmoid 的导数最大只有 0.25，多层相乘就趋近于零；tanh 的导数最大为 1，但两端同样会饱和。
    </p>
  </Widget>
</template>
