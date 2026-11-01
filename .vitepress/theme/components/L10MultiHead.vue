<script setup lang="ts">
import { ref, computed } from 'vue'

const TOKENS = ['小猫', '坐', '在', '垫子', '上', '。']
const N = TOKENS.length

// 四个头各自学到的「偏好」：中心位置（相对当前查询）+ 展宽
const HEADS = [
  { label: '头 1 · 看前一个词', center: (i: number) => Math.max(0, i - 1), sigma: 0.9, color: 'var(--accent)' },
  { label: '头 2 · 看自己', center: (i: number) => i, sigma: 0.55, color: 'var(--prin)' },
  { label: '头 3 · 看句首', center: () => 0, sigma: 4.2, color: 'var(--ex)' },
  { label: '头 4 · 看句尾', center: () => N - 1, sigma: 1.4, color: 'var(--warn)' }
]

const D = 100          // 模型隐层维度 p_o
const heads = ref(4)
const q = ref(3)

const softmax = (xs: number[]) => {
  const m = Math.max(...xs)
  const e = xs.map(v => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map(v => v / s)
}

const rows = computed(() =>
  HEADS.slice(0, heads.value).map(h => {
    const c = h.center(q.value)
    const sc = Array.from({ length: N }, (_, j) => -((j - c) ** 2) / (2 * h.sigma ** 2))
    const w = softmax(sc)
    let top = 0
    w.forEach((v, i) => { if (v > w[top]) top = i })
    return { ...h, w, top }
  })
)

// 布局
const CW = 46, CH = 30, X0 = 118, Y0 = 26, RH = 42
const cx = (j: number) => X0 + j * CW
const cy = (i: number) => Y0 + i * RH

const perHead = computed(() => D / heads.value)
</script>

<template>
  <Widget title="多头注意力：同一组查询键值，切出几种不同的「看哪里」">
    <p class="widget-note">
      句子有 6 个词元，同样的查询、键、值送进 4 个平行的头；每个头用自己的一组线性投影，于是学到不同的关注范围（前一个词 / 自己 / 句首 / 句尾）。
      切换头数、点选查询位置，看看「分工」是怎么来的。
    </p>

    <div class="ctrl">
      <label>查询位置 <input v-model.number="q" type="range" min="0" max="5" step="1"><b>{{ TOKENS[q] }}</b></label>
      <div class="seg">
        <button v-for="h in [1, 2, 4]" :key="h" type="button" :class="{ on: heads === h }" @click="heads = h">
          {{ h }} 个头
        </button>
      </div>
    </div>

    <svg :width="470" :height="Y0 + heads * RH + 92" :viewBox="`0 0 470 ${Y0 + heads * RH + 92}`" style="max-width:100%">
      <!-- 列标签 -->
      <text v-for="(t, j) in TOKENS" :key="'t' + j" :x="cx(j) + CW / 2" :y="Y0 - 8"
            text-anchor="middle"
            :style="`fill:${j === q ? 'var(--warn)' : 'var(--ink-3)'};font-size:11;font-weight:${j === q ? 700 : 400}`">
        {{ t }}
      </text>

      <!-- 每个头一行 -->
      <g v-for="(r, i) in rows" :key="'h' + i">
        <text x="8" :y="cy(i) + CH / 2 + 3" :style="`fill:${r.color};font-size:10.5;font-weight:700`">{{ r.label }}</text>
        <g v-for="(w, j) in r.w" :key="'c' + i + '-' + j">
          <rect :x="cx(j) + 1.5" :y="cy(i) + 1" :width="CW - 3" :height="CH - 2" rx="4"
                :style="`fill:${r.color};opacity:${(0.05 + 0.9 * w).toFixed(2)}`" />
          <text :x="cx(j) + CW / 2" :y="cy(i) + CH / 2 + 4" text-anchor="middle"
                :style="`fill:${w > 0.45 ? '#fff' : 'var(--ink-2)'};font-size:10`">
            {{ (w * 100).toFixed(0) }}
          </text>
        </g>
        <text :x="cx(N) + 6" :y="cy(i) + CH / 2 + 4" style="fill:var(--ink-3);font-size:10">
          → {{ TOKENS[r.top] }}
        </text>
      </g>

      <!-- 拼接 —> W_o -->
      <g :transform="`translate(8, ${Y0 + heads * RH + 10})`">
        <text x="0" y="10" style="fill:var(--ink-3);font-size:10">
          拼接 {{ heads }} 个头（每个 {{ perHead.toFixed(0) }} 维）→ 乘 W_o → {{ D }} 维输出
        </text>
        <g v-for="(r, i) in rows" :key="'seg' + i">
          <rect :x="i * (400 / heads)" y="18" :width="400 / heads - 2" height="18" rx="3"
                :style="`fill:${r.color};opacity:.55`" />
          <text :x="i * (400 / heads) + (400 / heads - 2) / 2" y="31" text-anchor="middle"
                style="fill:var(--ink);font-size:10">h{{ i + 1 }}</text>
        </g>
        <rect x="0" y="40" width="400" height="18" rx="3" style="fill:var(--accent);opacity:.18" />
        <text x="200" y="53" text-anchor="middle" style="fill:var(--accent);font-size:10;font-weight:700">
          最终输出 p_o = {{ D }} 维
        </text>
      </g>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ heads }}</b><span>头数 h</span></div>
      <div class="stat"><b>{{ perHead.toFixed(0) }}</b><span>每个头的维度 p_q=p_k=p_v</span></div>
      <div class="stat"><b>{{ (4 * D * D).toLocaleString() }}</b><span>参数量（与单头相同）</span></div>
      <div class="stat"><b>{{ TOKENS[q] }}</b><span>当前查询</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      注意参数量：4 个头并不是把 4 个 100 维注意力拼起来（那会是 4 倍的参数），而是把同一个 100 维切成 4 份、每份 25 维各算一次，再把 4 段 25 维拼回 100 维。
      所以「多头」买到的是<strong>多种视角</strong>，不是更多的参数。
    </p>
  </Widget>
</template>
