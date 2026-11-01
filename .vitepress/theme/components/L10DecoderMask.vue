<script setup lang="ts">
import { ref, computed } from 'vue'

const N = 6          // 解码步数 / 词元数

const prng = (seed: number) => {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const seed = ref(5)
const masked = ref(true)
const row = ref(4)

const softmax = (xs: number[]) => {
  const m = Math.max(...xs)
  const e = xs.map(v => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map(v => v / s)
}

// 6×6 的原始分数（确定性伪随机）
const scores = computed(() => {
  const r = prng(seed.value * 733 + 17)
  return Array.from({ length: N }, () => Array.from({ length: N }, () => (r() - 0.5) * 5))
})

// 掩蔽后：j > i 的位置用 -1e6 顶掉，正是 masked_softmax 的做法
const W = computed(() => {
  const out: number[][] = []
  for (let i = 0; i < N; i++) {
    const sc = scores.value[i].map((v, j) => (masked.value && j > i ? -1e6 : v))
    out.push(softmax(sc))
  }
  return out
})

const rawW = computed(() => scores.value.map(softmax))

const weights = computed(() => W.value[row.value])
const sum = computed(() => weights.value.reduce((a, b) => a + b, 0))
const maxW = computed(() => Math.max(...weights.value))
const maxRaw = computed(() => Math.max(...rawW.value[row.value]))
const visible = computed(() => (masked.value ? row.value + 1 : N))

const reseed = () => { seed.value = (seed.value * 3 + 7) % 97 + 2 }

// 网格
const CW = 54, CH = 34, X0 = 66, Y0 = 44
const cx = (jv: number) => X0 + jv * CW
const cy = (iv: number) => Y0 + iv * CH
</script>

<template>
  <Widget title="解码器的掩码：预测第 i 个词时，只能看前 i 个">
    <p class="widget-note">
      6×6 的注意力权重，行是查询（解码步），列是键（已生成的词）。打开掩蔽后，第 i 行只保留前 i+1 格——对角线上方被 <code>masked_softmax</code> 用 −1e6 顶成 0，剩下的权重要重新归一化。
      点任意一格选中它所在的行。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button type="button" :class="{ on: masked }" @click="masked = true">掩蔽（训练）</button>
        <button type="button" :class="{ on: !masked }" @click="masked = false">不掩蔽</button>
      </div>
      <button class="btn" type="button" @click="reseed">换一组分数</button>
      <span class="muted" style="font-size:13px">行 = 查询位置 i</span>
    </div>

    <svg :width="470" :height="Y0 + N * CH + 16" :viewBox="`0 0 470 ${Y0 + N * CH + 16}`" style="max-width:100%">
      <text v-for="jc in N" :key="'cl' + jc" :x="cx(jc - 1) + CW / 2" :y="Y0 - 14"
            text-anchor="middle" style="fill:var(--ink-3);font-size:10">k{{ jc - 1 }}</text>
      <text :x="X0 + (N * CW) / 2" :y="16" text-anchor="middle" style="fill:var(--ink-3);font-size:10">
        键：已经生成的词元
      </text>

      <text v-for="ir in N" :key="'rl' + ir" :x="X0 - 8" :y="cy(ir - 1) + CH / 2 + 4"
            text-anchor="end"
            :style="`fill:${ir - 1 === row ? 'var(--accent)' : 'var(--ink-3)'};font-size:10;font-weight:${ir - 1 === row ? 700 : 400}`">
        q{{ ir - 1 }}
      </text>

      <g v-for="i in N" :key="'row' + i">
        <g v-for="jv in N" :key="'c' + i + '-' + jv">
          <rect :x="cx(jv - 1) + 1.5" :y="cy(i - 1) + 1.5" :width="CW - 3" :height="CH - 3" rx="4"
                :style="`fill:${masked && jv - 1 > i - 1 ? 'var(--line)' : 'var(--accent)'};opacity:${masked && jv - 1 > i - 1 ? 0.35 : (0.05 + 0.85 * W[i - 1][jv - 1]).toFixed(2)};cursor:pointer`"
                @click="row = i - 1" />
          <text :x="cx(jv - 1) + CW / 2" :y="cy(i - 1) + CH / 2 + 4" text-anchor="middle"
                :style="`fill:${masked && jv - 1 > i - 1 ? 'var(--ink-3)' : (W[i - 1][jv - 1] > 0.4 ? '#fff' : 'var(--ink-2)')};font-size:10;pointer-events:none`">
            {{ masked && jv - 1 > i - 1 ? '—' : (W[i - 1][jv - 1] * 100).toFixed(0) }}
          </text>
        </g>
      </g>

      <rect :x="X0" :y="cy(row)" :width="N * CW" :height="CH" rx="5"
            style="fill:none;stroke:var(--accent);stroke-width:2" />
    </svg>

    <div class="stats">
      <div class="stat"><b>q{{ row }}</b><span>当前查询</span></div>
      <div class="stat"><b>{{ visible }}</b><span>可见键数（共 {{ N }}）</span></div>
      <div class="stat"><b>{{ sum.toFixed(3) }}</b><span>权重和（应为 1）</span></div>
      <div class="stat"><b>{{ (maxW * 100).toFixed(0) }}% / {{ (maxRaw * 100).toFixed(0) }}%</b><span>最大权重：掩蔽后 / 不掩蔽</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      选 q{{ N - 1 }} 这一行：掩蔽后它能看到全部 6 个位置；选 q0 就只剩 1 个。掩蔽与不掩蔽的「最大权重」一比就知道——被顶掉的概率质量并没有消失，它被重新分给了可见的位置。
      这就是自回归：预测下一个词时，模型只被允许看已经写出来的部分。
    </p>
  </Widget>
</template>
