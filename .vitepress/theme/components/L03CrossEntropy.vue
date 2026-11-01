<script setup lang="ts">
import { ref, computed } from 'vue'

// p = 模型分给「正确类别」的概率
const p = ref(0.1)

const loss = computed(() => -Math.log(p.value))
const grad = computed(() => p.value - 1)
const bits = computed(() => -Math.log2(p.value))

const W = 460, H = 250, PAD = 38
const sx = (v: number) => PAD + v * (W - PAD * 2)
const sy = (l: number) => H - PAD - (Math.min(l, 5) / 5) * (H - PAD * 2)

const cePath = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const v = 0.002 + (i / 120) * 0.998
    pts.push(`${i === 0 ? 'M' : 'L'}${sx(v).toFixed(1)},${sy(-Math.log(v)).toFixed(1)}`)
  }
  return pts.join(' ')
})
const msePath = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const v = i / 120
    pts.push(`${i === 0 ? 'M' : 'L'}${sx(v).toFixed(1)},${sy((1 - v) ** 2).toFixed(1)}`)
  }
  return pts.join(' ')
})
const cx = computed(() => sx(p.value))
const cy = computed(() => sy(loss.value))
</script>

<template>
  <Widget title="交叉熵：错得越离谱，罚得越狠">
    <p class="widget-note">
      横轴是模型分给正确类别的概率 p，纵轴是损失。交叉熵是 −log p，平方损失是 (1 − p)²。拖动滑块，看两种损失在「自信地答错」时分别是多少。
    </p>

    <div class="ctrl">
      <label>正确类别的概率 p <input v-model.number="p" type="range" min="0.01" max="0.999" step="0.001"><b>{{ p.toFixed(3) }}</b></label>
      <button class="btn" type="button" @click="p = 0.1">p = 0.1</button>
      <button class="btn" type="button" @click="p = 0.5">p = 0.5</button>
      <button class="btn" type="button" @click="p = 0.9">p = 0.9</button>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" style="stroke:var(--line)" />
      <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="sy(0)" style="stroke:var(--line)" />
      <path :d="msePath" style="fill:none;stroke:var(--prin);stroke-width:2;stroke-dasharray:5 4" />
      <path :d="cePath" style="fill:none;stroke:var(--accent);stroke-width:2.6" />
      <line :x1="cx" :y1="sy(0)" :x2="cx" :y2="cy" style="stroke:var(--warn);stroke-width:1;stroke-dasharray:3 3" />
      <circle :cx="cx" :cy="cy" r="5" style="fill:var(--warn)" />
      <text :x="cx + 8" :y="cy - 6" style="fill:var(--warn);font-size:12">p = {{ p.toFixed(3) }}，损失 = {{ loss.toFixed(3) }}</text>
      <text :x="W - PAD" :y="sy(0) + 16" text-anchor="end" style="fill:var(--ink-3);font-size:11">正确类别的概率 p →</text>
      <text :x="PAD - 8" :y="PAD - 6" text-anchor="end" style="fill:var(--ink-3);font-size:11">损失 ↑</text>
      <text x="70" y="60" style="fill:var(--accent);font-size:11">交叉熵 −log p</text>
      <text x="70" y="78" style="fill:var(--prin);font-size:11">平方损失 (1−p)²</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ loss.toFixed(3) }}</b><span>交叉熵损失</span></div>
      <div class="stat"><b>{{ (p * 100).toFixed(1) }}%</b><span>正确类别概率</span></div>
      <div class="stat"><b>{{ grad.toFixed(3) }}</b><span>对 logit 的梯度 p − 1</span></div>
      <div class="stat"><b>{{ bits.toFixed(2) }}</b><span>相当于多少比特</span></div>
    </div>

    <div class="out prose" style="margin-top:12px">
      l = −log({{ p.toFixed(3) }}) = <b>{{ loss.toFixed(3) }}</b>　　
      ∂l/∂o<sub>正确类</sub> = softmax(o)<sub>正确类</sub> − 1 = <b>{{ grad.toFixed(3) }}</b>
    </div>

    <p class="widget-note" style="margin-top:10px;margin-bottom:0">
      p = 0.9 时损失只有 {{ (-Math.log(0.9)).toFixed(3) }}；p = 0.1 时涨到 {{ (-Math.log(0.1)).toFixed(3) }}。平方损失在同样两点分别是 0.01 和 0.81——它对「自信答错」几乎没有惩罚，而交叉熵会一路冲到无穷。这也是分类任务用交叉熵而不用平方损失的原因。
    </p>
  </Widget>
</template>
