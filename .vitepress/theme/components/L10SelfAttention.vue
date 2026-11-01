<script setup lang="ts">
import { ref, computed } from 'vue'

const TOK = ['小猫', '坐', '在', '垫子', '上', '，', '它', '很', '困']
const N = TOK.length

// 每个词元一个 4 维「嵌入」：动物性 / 处所性 / 虚词性 / 代词性
const X: number[][] = [
  [1, 0, 0, 0],
  [0.2, 0, 0.9, 0],
  [0, 0.2, 1, 0],
  [0, 1, 0, 0],
  [0, 0.8, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
  [0, 0, 1, 0],
  [0.1, 0, 0.8, 0]
]

// 查询投影 W_q：把「代词」这一维并到「动物性」维上（相当于模型学出来的对齐方式）。
// 再整体放大 8 倍，起到可学习温度的作用，让分布看得清。
const Wq = [
  [1, 0, 0, 1],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 0]
]
const SCALE = 8
const D = 4

const q = ref(6)
const masked = ref(false)

const softmax = (xs: number[]) => {
  const m = Math.max(...xs)
  const e = xs.map(v => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map(v => v / s)
}

const weights = computed(() => {
  const qv = Wq.map(row => row.reduce((a, v, k) => a + v * X[q.value][k], 0))
  const scores = X.map(x => {
    const dot = x.reduce((a, xk, k) => a + xk * qv[k], 0)
    return (dot * SCALE) / Math.sqrt(D)
  })
  // 因果掩蔽：查询之后的位置权重置 0（相当于分数设为 -1e6）
  const maskedScores = scores.map((s, j) => (masked.value && j > q.value ? -1e6 : s))
  return softmax(maskedScores)
})

const topIdx = computed(() => {
  let k = 0
  weights.value.forEach((v, i) => { if (v > weights.value[k]) k = i })
  return k
})

const nEff = computed(() => {
  const h = -weights.value.reduce((a, w) => a + (w > 0 ? w * Math.log(w) : 0), 0)
  return Math.exp(h)
})

// 布局
const CW = 48, X0 = 12, Y0 = 38
const BASE = 126
const cx = (i: number) => X0 + i * CW
const barH = (w: number) => Math.max(1, w * 50)
</script>

<template>
  <Widget title="自注意力：要预测「它」，该把注意力放在谁身上">
    <p class="widget-note">
      句子里的词元既是查询也是键和值。点任意一个词，它就成为<strong>查询</strong>：用自己的嵌入乘上 W_q，去和所有词的键做点积、除 √d、softmax。
      「它」的查询向量把代词维并到了动物性维上，于是最像「小猫」——这就是一次指代消解。
      打开因果掩蔽，查询右边（还没生成）的位置立刻被抹成 0。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button type="button" :class="{ on: !masked }" @click="masked = false">双向（编码器）</button>
        <button type="button" :class="{ on: masked }" @click="masked = true">因果掩蔽（解码器）</button>
      </div>
      <span class="muted" style="font-size:13px">点词元切换查询</span>
    </div>

    <svg :width="470" :height="170" viewBox="0 0 470 170" style="max-width:100%">
      <g v-for="(t, i) in TOK" :key="'tk' + i">
        <!-- 词元 -->
        <rect :x="cx(i) + 2" :y="Y0" :width="CW - 6" height="32" rx="6"
              :style="`fill:${i === q ? 'var(--accent)' : 'var(--vp-c-bg)'};stroke:${i === q ? 'var(--accent)' : 'var(--line)'};stroke-width:1.5;cursor:pointer;opacity:${masked && i > q ? 0.35 : 1}`"
              @click="q = i" />
        <text :x="cx(i) + CW / 2 - 1" :y="Y0 + 21" text-anchor="middle"
              :style="`fill:${i === q ? '#fff' : 'var(--ink)'};font-size:11;pointer-events:none;opacity:${masked && i > q ? 0.5 : 1}`">
          {{ t }}
        </text>

        <!-- 权重条 -->
        <rect :x="cx(i) + 12" :y="BASE - barH(weights[i])" :width="CW - 24"
              :height="barH(weights[i])" rx="3"
              :style="`fill:${i === topIdx && weights[i] > 0.05 ? 'var(--warn)' : 'var(--accent)'};opacity:${i === q ? 1 : (0.35 + 0.6 * weights[i] / Math.max(0.01, weights[topIdx]))}`" />
        <text :x="cx(i) + CW / 2 - 1" :y="BASE + 13" text-anchor="middle"
              style="fill:var(--ink-3);font-size:9">
          {{ (weights[i] * 100).toFixed(0) }}
        </text>
      </g>

      <!-- 基线 -->
      <line :x1="X0" :y1="BASE" :x2="X0 + N * CW - 6" :y2="BASE" style="stroke:var(--line)" />

      <!-- 掩蔽区域提示 -->
      <g v-if="masked && q < N - 1">
        <line :x1="cx(q + 1)" :y1="Y0 - 8" :x2="cx(q + 1)" :y2="BASE + 18"
              style="stroke:var(--warn);stroke-width:1;stroke-dasharray:3 3;opacity:.7" />
        <text :x="cx(q + 1) + 4" :y="Y0 - 12" style="fill:var(--warn);font-size:9">掩蔽边界</text>
      </g>

      <text :x="X0" :y="BASE + 34" style="fill:var(--ink-3);font-size:10">
        每个词元分到的注意力权重 α（%）
      </text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ TOK[q] }}</b><span>当前查询</span></div>
      <div class="stat"><b>{{ TOK[topIdx] }}</b><span>最关注（{{ (weights[topIdx] * 100).toFixed(0) }}%）</span></div>
      <div class="stat"><b>{{ masked ? q + 1 : N }}</b><span>可见键数</span></div>
      <div class="stat"><b>{{ nEff.toFixed(1) }}</b><span>有效键数 exp(熵)</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      点「它」看指代消解：小猫 ≈ 85%，其余词几乎为 0。再点「垫子」——查询换成处所维，注意力就跑到「垫子」自己和「上」上去了。
      切到因果掩蔽后选「困」：它只能看左边 8 个词，这正是解码器预测下一个词时的处境。
    </p>
  </Widget>
</template>
