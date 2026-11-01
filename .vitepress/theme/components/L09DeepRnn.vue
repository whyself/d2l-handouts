<script setup lang="ts">
import { ref, computed } from 'vue'

// 6 个时间步、最多 3 层的小网络，值由固定公式算出（无随机）
const T = 6
const MAXL = 3
const X = [0.9, -0.6, 0.3, 0.8, -0.4, 0.2]

const grid: number[][] = []
for (let l = 0; l < MAXL; l++) {
  grid[l] = []
  for (let t = 0; t < T; t++) {
    const fromBelow = l === 0 ? X[t] : grid[l - 1][t]
    const fromLeft = t === 0 ? 0 : grid[l][t - 1]
    grid[l][t] = Math.tanh(0.7 * fromBelow + 0.5 * fromLeft)
  }
}

const layers = ref(2)
const sel = ref<{ l: number; t: number }>({ l: 1, t: 3 })

const cells = computed(() => {
  const out: { l: number; t: number; v: number }[] = []
  for (let l = 0; l < layers.value; l++) {
    for (let t = 0; t < T; t++) out.push({ l, t, v: grid[l][t] })
  }
  return out
})

// 依赖锥：H[l][t] 受所有 l'<=l 且 t'<=t 的单元影响（矩形）
const isAncestor = (l: number, t: number) => l <= sel.value.l && t <= sel.value.t
const isSel = (l: number, t: number) => l === sel.value.l && t === sel.value.t

const CW = 52
const CH = 44
const GX = 14
const GY = 30
const OX = 46
const OY = 16
const W = OX + T * (CW + GX) + 10
const H = OY + MAXL * (CH + GY) + 26

const px = (t: number) => OX + t * (CW + GX)
const py = (l: number) => OY + (MAXL - 1 - l) * (CH + GY)

const stats = computed(() => {
  const l = sel.value.l + 1
  const t = sel.value.t + 1
  return {
    anc: l * t,
    path: l + t - 1,
    total: layers.value * T
  }
})

const shade = (v: number) => 0.18 + Math.abs(v) * 0.62
</script>

<template>
  <Widget title="深度 RNN：每个格子都有两个上家">
    <p class="widget-note">
      纵轴是层（第 1 层在最下），横轴是时间。点任意一个格子，高亮它依赖的全部单元——这就是“同层左侧 + 下层同期”两条边递推出来的依赖锥。
    </p>

    <div class="ctrl">
      <label>隐藏层数 L</label>
      <div class="seg">
        <button v-for="n in 3" :key="n" type="button" :class="{ on: layers === n }" @click="layers = n">{{ n }}</button>
      </div>
      <span class="muted" style="font-size:13px">点格子看依赖</span>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <text v-for="t in T" :key="'c' + t" :x="px(t - 1) + CW / 2" :y="OY - 4" text-anchor="middle"
            style="fill:var(--ink-3);font-size:11">t={{ t }}</text>

      <text v-for="l in layers" :key="'r' + l" :x="OX - 8" :y="py(l - 1) + CH / 2 + 4" text-anchor="end"
            style="fill:var(--ink-2);font-size:12">H⁽{{ l }}⁾</text>

      <g v-for="c in cells" :key="c.l + '-' + c.t">
        <rect :x="px(c.t)" :y="py(c.l)" :width="CW" :height="CH" rx="7"
              :style="{
                fill: isAncestor(c.l, c.t) ? 'var(--accent)' : 'var(--paper)',
                fillOpacity: isAncestor(c.l, c.t) ? String(shade(c.v)) : '1',
                stroke: isSel(c.l, c.t) ? 'var(--warn)' : 'var(--line)',
                strokeWidth: isSel(c.l, c.t) ? '2.5' : '1',
                cursor: 'pointer'
              }"
              @click="sel = { l: c.l, t: c.t }" />
        <text :x="px(c.t) + CW / 2" :y="py(c.l) + CH / 2 + 4" text-anchor="middle"
              :style="{ fill: isAncestor(c.l, c.t) && Math.abs(c.v) > 0.55 ? '#fff' : 'var(--ink-2)', fontSize: '11.5px', pointerEvents: 'none' }">
          {{ c.v.toFixed(2) }}
        </text>
      </g>

      <g v-for="t in T - 1" :key="'ax' + t">
        <line :x1="px(t - 1) + CW" :y1="py(0) + CH / 2" :x2="px(t) - 4" :y2="py(0) + CH / 2"
              style="stroke:var(--line-2);stroke-width:1.5" />
      </g>
      <text :x="OX" :y="H - 6" style="fill:var(--ink-3);font-size:11">每层的输入来自上一层同一时刻（↓），循环来自本层上一时刻（→）</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ stats.anc }} / {{ stats.total }}</b><span>影响该格的单元数</span></div>
      <div class="stat"><b>{{ stats.path }}</b><span>关键路径长度（步）</span></div>
      <div class="stat"><b>{{ sel.l + 1 }}, {{ sel.t + 1 }}</b><span>当前格子 (层, 时刻)</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      层数越多，单个输出能“看到”的输入范围越广，但同一条从输入到输出的路径也越长——这正是深度 RNN 难训的原因：关键路径每加一层就多一个必须连乘的雅可比。
    </p>
  </Widget>
</template>
