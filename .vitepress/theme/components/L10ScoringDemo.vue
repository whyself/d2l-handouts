<script setup lang="ts">
import { ref, computed } from 'vue'

// 确定性伪随机数：同一个种子永远得到同一组向量
const prng = (seed: number) => {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const M = 8          // 键－值对的个数
const H = 6          // 加性注意力的隐藏单元数

const dq = ref(4)
const dk = ref(4)
const seed = ref(7)

// 查询、键、以及加性注意力的三组参数
const data = computed(() => {
  const r = prng(seed.value * 131 + dq.value * 17 + dk.value * 7 + 1)
  const g = () => {
    let u = 0, v = 0
    while (u === 0) u = r()
    while (v === 0) v = r()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const q = Array.from({ length: dq.value }, g)
  const K = Array.from({ length: M }, () => Array.from({ length: dk.value }, g))
  const Wq = Array.from({ length: H }, () => Array.from({ length: dq.value }, () => g() * 0.6))
  const Wk = Array.from({ length: H }, () => Array.from({ length: dk.value }, () => g() * 0.6))
  const wv = Array.from({ length: H }, () => g() * 0.8)

  // 加性：w_v · tanh(W_q q + W_k k)
  const addScores = K.map(k => {
    let s = 0
    for (let h = 0; h < H; h++) {
      let acc = 0
      for (let j = 0; j < dq.value; j++) acc += Wq[h][j] * q[j]
      for (let j = 0; j < dk.value; j++) acc += Wk[h][j] * k[j]
      s += wv[h] * Math.tanh(acc)
    }
    return s
  })

  // 点积：q · k（要求两边的维度相同）
  const dotScores = dq.value === dk.value
    ? K.map(k => q.reduce((a, qj, j) => a + qj * k[j], 0))
    : null

  const softmax = (xs: number[]) => {
    const m = Math.max(...xs)
    const e = xs.map(v => Math.exp(v - m))
    const s = e.reduce((a, b) => a + b, 0)
    return e.map(v => v / s)
  }

  return {
    addScores,
    addW: softmax(addScores),
    dotScores,
    dotW: dotScores ? softmax(dotScores) : null
  }
})

const addW = computed(() => data.value.addW)
const dotW = computed(() => data.value.dotW)

const argmax = (ws: number[] | null) => {
  if (!ws) return -1
  let k = 0
  ws.forEach((v, i) => { if (v > ws[k]) k = i })
  return k
}

const addTop = computed(() => argmax(addW.value))
const dotTop = computed(() => argmax(dotW.value))

const gap = computed(() => {
  const a = addW.value, d = dotW.value
  if (!d) return NaN
  return a.reduce((s, v, i) => s + Math.abs(v - d[i]), 0) / 2
})

const reseed = () => { seed.value = (seed.value * 7 + 13) % 997 + 3 }

// 画布：左右两块条形图
const W = 470, ROW = 21, TOPY = 30
const BAR = 148
const rowY = (i: number) => TOPY + i * ROW
</script>

<template>
  <Widget title="加性注意力 vs 缩放点积注意力：同一个查询，两种打分的形状">
    <p class="widget-note">
      8 个键－值对，横条是该键分到的注意力权重。左边是加性注意力 <code>w_v · tanh(W_q q + W_k k)</code>（查询和键的长度可以不同），右边是点积 <code>q · k</code>（要求两边长度相同）。
      调一调 d_q 和 d_k：一旦两者不等，点积就直接没法算了。
    </p>

    <div class="ctrl">
      <label>查询长度 d_q <input v-model.number="dq" type="range" min="2" max="8" step="1"><b>{{ dq }}</b></label>
      <label>键长度 d_k <input v-model.number="dk" type="range" min="2" max="8" step="1"><b>{{ dk }}</b></label>
      <button class="btn" type="button" @click="reseed">换一组向量</button>
    </div>

    <svg :width="W" :height="TOPY + M * ROW + 8" :viewBox="`0 0 ${W} ${TOPY + M * ROW + 8}`" style="max-width:100%">
      <text x="8" :y="16" style="fill:var(--accent);font-size:12;font-weight:700">加性注意力（可不同维度）</text>
      <text x="248" :y="16" style="fill:var(--prin);font-size:12;font-weight:700">点积注意力（须同维度）</text>

      <!-- 左：加性 -->
      <g v-for="(w, i) in addW" :key="'a' + i">
        <text x="8" :y="rowY(i) + 12" style="fill:var(--ink-3);font-size:10">k{{ i + 1 }}</text>
        <rect x="26" :y="rowY(i) + 2" :width="BAR" height="13" rx="2"
              style="fill:var(--line);opacity:.45" />
        <rect x="26" :y="rowY(i) + 2" :width="Math.max(1, BAR * w)" height="13" rx="2"
              :style="`fill:var(--accent);opacity:${i === addTop ? 1 : 0.55}`" />
        <text :x="26 + BAR + 6" :y="rowY(i) + 12" style="fill:var(--ink-2);font-size:10">
          {{ (w * 100).toFixed(0) }}%
        </text>
      </g>

      <!-- 右：点积 -->
      <g v-if="dotW">
        <g v-for="(w, i) in dotW" :key="'d' + i">
          <text x="248" :y="rowY(i) + 12" style="fill:var(--ink-3);font-size:10">k{{ i + 1 }}</text>
          <rect x="266" :y="rowY(i) + 2" :width="BAR" height="13" rx="2"
                style="fill:var(--line);opacity:.45" />
          <rect x="266" :y="rowY(i) + 2" :width="Math.max(1, BAR * w)" height="13" rx="2"
                :style="`fill:var(--prin);opacity:${i === dotTop ? 1 : 0.55}`" />
          <text :x="266 + BAR + 6" :y="rowY(i) + 12" style="fill:var(--ink-2);font-size:10">
            {{ (w * 100).toFixed(0) }}%
          </text>
        </g>
      </g>
      <g v-else>
        <rect x="248" :y="TOPY + 6" width="214" :height="M * ROW - 12" rx="8"
              style="fill:var(--warn-bg);stroke:var(--warn);stroke-dasharray:4 4" />
        <text x="355" :y="TOPY + M * ROW / 2 - 4" text-anchor="middle"
              style="fill:var(--warn);font-size:12;font-weight:700">点积要求 d_q = d_k</text>
        <text x="355" :y="TOPY + M * ROW / 2 + 14" text-anchor="middle"
              style="fill:var(--ink-3);font-size:11">当前 {{ dq }} ≠ {{ dk }}，算不了</text>
      </g>
    </svg>

    <div class="stats">
      <div class="stat"><b>k{{ addTop + 1 }}</b><span>加性注意力的赢家</span></div>
      <div class="stat"><b>{{ dotW ? 'k' + (dotTop + 1) : '—' }}</b><span>点积注意力的赢家</span></div>
      <div class="stat"><b>{{ dotW ? (gap * 100).toFixed(1) + '%' : '—' }}</b><span>两种分布的差异（总变差）</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      把两边维度调成一样再看：两个赢家未必是同一个键，权重形状也不同——但它们都是「把一个向量对压成一个标量，再 softmax」。
      加性注意力的代价是多一个隐藏维 h = {{ H }} 的 MLP；点积的代价是强制两边同维，换来的是可以写成一次矩阵乘法。
    </p>
  </Widget>
</template>
