<script setup lang="ts">
import { ref, computed } from 'vue'

// 固定的“噪声”：用确定性哈希代替 Math.random，保证 SSR 与客户端一致
const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

// 16 个训练点，x 均匀排布，y = 2sin(x) + x^0.8 + 噪声
const N = 16
const XS = Array.from({ length: N }, (_, i) => 0.15 + i * 0.3)
const YS = XS.map((x, i) => 2 * Math.sin(x) + Math.pow(x, 0.8) + (rnd(i) - 0.5) * 1.2)

const truth = (x: number) => 2 * Math.sin(x) + Math.pow(Math.max(x, 0), 0.8)

const q = ref(2.6)
const sharp = ref(3)
const mode = ref('nw')

// 高斯核 + softmax：权重 = softmax(-½((x - x_i)·w)²)
const weights = computed(() => {
  if (mode.value === 'avg') return XS.map(() => 1 / N)
  const raw = XS.map(x => -0.5 * ((q.value - x) * sharp.value) ** 2)
  const m = Math.max(...raw)
  const e = raw.map(v => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map(v => v / s)
})

const yhat = computed(() => weights.value.reduce((a, wi, i) => a + wi * YS[i], 0))

// 有效键数 = exp(熵)，直观看“注意力摊给了几个点”
const nEff = computed(() => {
  const h = -weights.value.reduce((a, wi) => a + (wi > 0 ? wi * Math.log(wi) : 0), 0)
  return Math.exp(h)
})

const topIdx = computed(() => {
  let k = 0
  weights.value.forEach((v, i) => { if (v > weights.value[k]) k = i })
  return k
})

const maxW = computed(() => Math.max(...weights.value))

const reset = () => { q.value = 2.6; sharp.value = 3; mode.value = 'nw' }

// 几何：上面是核回归曲线，下面是权重条
const W = 470, H = 300, PAD = 34
const TOP = 10, BOT = 238, BASE = 296, BARH = 40
const sx = (x: number) => PAD + (x / 5) * (W - PAD * 2)
const sy = (y: number) => BOT - ((y + 1.2) / 6) * (BOT - TOP)

const curve = computed(() => {
  const pts = Array.from({ length: 101 }, (_, i) => {
    const x = (i / 100) * 5
    return `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(truth(x)).toFixed(1)}`
  })
  return pts.join(' ')
})
</script>

<template>
  <Widget title="Nadaraya-Watson：拖动查询点，看注意力权重怎么分配">
    <p class="widget-note">
      蓝色曲线是真实的 f(x)，圆点是含噪训练样本（键值对）。红色大点是你拖动的<strong>查询</strong>：它按高斯核给每个键打分，softmax 之后把分数变成权重，再对值加权求和得到预测。
      把「核宽 w」调小，权重摊平，预测退化成<strong>平均汇聚</strong>；调大，注意力只落在最近的几个点上。
    </p>

    <div class="ctrl">
      <label>查询 x <input v-model.number="q" type="range" min="0" max="5" step="0.02"><b>{{ q.toFixed(2) }}</b></label>
      <label>核宽 w <input v-model.number="sharp" type="range" min="0.2" max="6" step="0.05" :disabled="mode === 'avg'"><b>{{ sharp.toFixed(2) }}</b></label>
      <div class="seg">
        <button type="button" :class="{ on: mode === 'nw' }" @click="mode = 'nw'">核回归</button>
        <button type="button" :class="{ on: mode === 'avg' }" @click="mode = 'avg'">平均汇聚</button>
      </div>
      <button class="btn" type="button" @click="reset">重置</button>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <!-- 坐标轴 -->
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
      <line :x1="PAD" :y1="TOP" :x2="PAD" :y2="BOT" style="stroke:var(--line)" />

      <!-- 真实函数 -->
      <path :d="curve" style="stroke:var(--prin);stroke-width:2;fill:none;opacity:.65" />

      <!-- 查询位置的竖线 -->
      <line :x1="sx(q)" :y1="TOP" :x2="sx(q)" :y2="BASE"
            style="stroke:var(--warn);stroke-width:1;stroke-dasharray:3 4;opacity:.7" />

      <!-- 训练点 -->
      <circle v-for="(y, i) in YS" :key="'p' + i" :cx="sx(XS[i])" :cy="sy(y)" r="3.6"
              style="fill:var(--ink-3);opacity:.8" />

      <!-- 预测点与到各点的“注意力连线” -->
      <line v-for="(wi, i) in weights" :key="'l' + i"
            :x1="sx(q)" :y1="sy(yhat)" :x2="sx(XS[i])" :y2="sy(YS[i])"
            :style="`stroke:var(--accent);stroke-width:${(0.4 + 2.6 * (wi / maxW)).toFixed(2)};opacity:${(0.1 + 0.55 * (wi / maxW)).toFixed(2)}`" />

      <circle :cx="sx(q)" :cy="sy(yhat)" r="6" style="fill:var(--warn)" />
      <text :x="sx(q) + 9" :y="sy(yhat) - 8" style="fill:var(--warn);font-size:11">
        f(x) = {{ yhat.toFixed(2) }}
      </text>

      <!-- 权重条 -->
      <text :x="PAD" :y="BASE - 50" style="fill:var(--ink-3);font-size:10">
        注意力权重 α(x, xᵢ)
      </text>
      <line :x1="PAD" :y1="BASE" :x2="W - PAD" :y2="BASE" style="stroke:var(--line)" />
      <rect v-for="(wi, i) in weights" :key="'b' + i"
            :x="sx(XS[i]) - 5.5" :y="BASE - (4 + BARH * (wi / maxW))" width="11"
            :height="4 + BARH * (wi / maxW)" rx="2"
            :style="`fill:var(--accent);opacity:${(0.25 + 0.7 * (wi / maxW)).toFixed(2)}`" />
      <circle v-for="(wi, i) in weights" :key="'k' + i" :cx="sx(XS[i])" :cy="BASE"
              r="2" style="fill:var(--ink-3)" />
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ yhat.toFixed(2) }}</b><span>预测 f(x)</span></div>
      <div class="stat"><b>{{ (maxW * 100).toFixed(0) }}%</b><span>最大权重（键 x = {{ XS[topIdx].toFixed(2) }}）</span></div>
      <div class="stat"><b>{{ nEff.toFixed(1) }}</b><span>有效键数 exp(熵)</span></div>
      <div class="stat"><b>{{ weights[topIdx] > 0.5 ? '集中' : nEff > 12 ? '接近平均' : '分散' }}</b><span>当前分布形态</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      设「平均汇聚」再拖动查询点：预测值一动不动——它根本没看 x。切回「核回归」，权重立刻跟着查询滑走，预测线也随 x 变化。
    </p>
  </Widget>
</template>
