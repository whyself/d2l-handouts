<script setup lang="ts">
import { ref, computed } from 'vue'

// 一个「英→法」的短句对。对齐矩阵是按原书图 10.4.1 训练后权重的典型形状
// 手工构造的示意值，不是真实训练结果。
const SRC = ['he', "'s", 'calm', '.']
const TGT = ['il', 'est', 'calme', '.']

const A: number[][] = [
  [0.85, 0.10, 0.03, 0.02],
  [0.05, 0.62, 0.30, 0.03],
  [0.02, 0.18, 0.78, 0.02],
  [0.02, 0.03, 0.10, 0.85]
]

const mode = ref('attn')
const row = ref(0)
const uniform = SRC.map(() => 1 / SRC.length)

const weights = computed(() => (mode.value === 'attn' ? A[row.value] : uniform))

const topIdx = computed(() => {
  let k = 0
  weights.value.forEach((v, i) => { if (v > weights.value[k]) k = i })
  return k
})

const ent = computed(() => -weights.value.reduce((a, w) => a + (w > 0 ? w * Math.log(w) : 0), 0))

// 网格
const X0 = 92, Y0 = 40, CW = 86, CH = 38
const cx = (j: number) => X0 + j * CW
const cy = (i: number) => Y0 + i * CH

// 下方条形图
const BY = 236, BH = 22
const barY = (i: number) => BY + i * BH
</script>

<template>
  <Widget title="Bahdanau 注意力：每个解码步单独算一次对齐">
    <p class="widget-note">
      源句 <code>he 's calm .</code>，目标句 <code>il est calme .</code>。矩阵第 i 行是「生成第 i 个法语词时，注意力分给 4 个英语词的权重」。
      点任意一行换成那个解码步；切到「固定上下文」，所有行变成同一个均匀分布——那就是没有注意力的 seq2seq。
      <span class="muted">（矩阵是按原书训练后对齐形状构造的示意值。）</span>
    </p>

    <div class="ctrl">
      <div class="seg">
        <button type="button" :class="{ on: mode === 'attn' }" @click="mode = 'attn'">Bahdanau 注意力</button>
        <button type="button" :class="{ on: mode === 'fixed' }" @click="mode = 'fixed'">固定上下文（seq2seq）</button>
      </div>
      <span class="muted" style="font-size:13px">点热图的行＝选择解码步</span>
    </div>

    <svg :width="470" :height="320" viewBox="0 0 470 320" style="max-width:100%">
      <!-- 列标签：源词 -->
      <text v-for="(s, j) in SRC" :key="'c' + j" :x="cx(j) + CW / 2" :y="Y0 - 10"
            text-anchor="middle" style="fill:var(--prin);font-size:12;font-weight:700">{{ s }}</text>
      <text :x="X0 + 2 * CW" :y="16" text-anchor="middle" style="fill:var(--ink-3);font-size:10">键 / 值：编码器隐状态 h_t</text>

      <!-- 行标签：目标词 -->
      <text v-for="(t, i) in TGT" :key="'r' + i" :x="X0 - 10" :y="cy(i) + CH / 2 + 4"
            text-anchor="end" :style="`fill:${i === row ? 'var(--accent)' : 'var(--ink-3)'};font-size:12;font-weight:${i === row ? 700 : 400}`">
        {{ t }}
      </text>
      <text x="8" :y="Y0 - 10" style="fill:var(--ink-3);font-size:10">查询：s_t′₋₁</text>

      <!-- 热图 -->
      <g v-for="(tr, i) in A" :key="'row' + i">
        <g v-for="(w, j) in (mode === 'attn' ? tr : uniform)" :key="'cell' + i + '-' + j">
          <rect :x="cx(j) + 1" :y="cy(i) + 1" :width="CW - 2" :height="CH - 2" rx="4"
                :style="`fill:${i === row ? 'var(--accent)' : 'var(--line)'};opacity:${(0.06 + 0.9 * w).toFixed(2)}`"
                @click="row = i" style="cursor:pointer" />
          <text :x="cx(j) + CW / 2" :y="cy(i) + CH / 2 + 4" text-anchor="middle"
                :style="`fill:${w > 0.45 ? '#fff' : 'var(--ink-2)'};font-size:11;pointer-events:none`">
            {{ (w * 100).toFixed(0) }}
          </text>
        </g>
      </g>

      <!-- 选中行的框 -->
      <rect :x="X0" :y="cy(row)" :width="4 * CW" :height="CH" rx="4"
            style="fill:none;stroke:var(--accent);stroke-width:2" />

      <!-- 下方：该解码步的上下文向量由哪些值加权得到 -->
      <text x="10" :y="BY - 16" style="fill:var(--ink-3);font-size:10">
        生成「{{ TGT[row] }}」时的上下文向量 c = Σ α · h
      </text>
      <g v-for="(s, j) in SRC" :key="'bar' + j">
        <text x="10" :y="barY(j) + 15" style="fill:var(--prin);font-size:11">{{ s }}</text>
        <rect x="48" :y="barY(j) + 4" width="330" height="13" rx="2" style="fill:var(--line);opacity:.4" />
        <rect x="48" :y="barY(j) + 4" :width="Math.max(1, 330 * weights[j])" height="13" rx="2"
              :style="`fill:var(--accent);opacity:${j === topIdx ? 1 : 0.55}`" />
        <text :x="384" :y="barY(j) + 15" style="fill:var(--ink-2);font-size:10">
          {{ (weights[j] * 100).toFixed(0) }}%
        </text>
      </g>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ TGT[row] }}</b><span>当前解码步</span></div>
      <div class="stat"><b>{{ SRC[topIdx] }}</b><span>最关注的源词</span></div>
      <div class="stat"><b>{{ (weights[topIdx] * 100).toFixed(0) }}%</b><span>该词的权重</span></div>
      <div class="stat"><b>{{ ent.toFixed(2) }}</b><span>对齐熵（ln 4 = 1.39 为全均匀）</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      切到「固定上下文」：四行一模一样，熵正好 1.39——解码器每一步拿到的都是同一个 c，这正是 9.7 节的瓶颈。
      Bahdanau 的做法只是把 c 换成 c_t′，但「按需对齐」这件事让长句翻译一下子变好了。
    </p>
  </Widget>
</template>
