<script setup lang="ts">
import { ref, computed } from 'vue'

// 单隐藏层 + L2 正则的标量例子
const X = 2
const W1 = 3
const W2 = 0.5
const Y = 1
const LAM = 0.1
const Z = W1 * X
const h = Math.max(Z, 0)
const O = W2 * h
const L = 0.5 * (O - Y) ** 2
const S = (LAM / 2) * (W1 * W1 + W2 * W2)
const J = L + S

const dJ_dO = O - Y
const dJ_dW2 = dJ_dO * h + LAM * W2
const dJ_dh = W2 * dJ_dO
const dJ_dz = dJ_dh * (Z > 0 ? 1 : 0)
const dJ_dW1 = dJ_dz * X + LAM * W1

const STEPS = [
  {
    title: '从目标函数开始：J = L + s',
    body: '先对目标函数求导。J 是损失项 L 与正则项 s 之和，两者对 J 的偏导都等于 1。',
    hl: ['J'],
    formula: '∂J/∂L = 1，∂J/∂s = 1',
  },
  {
    title: '第一步：输出层变量 o',
    body: 'L = ½(o − y)²，所以 ∂L/∂o = o − y。把它与 ∂J/∂L 相乘，得到目标函数对 o 的梯度。',
    hl: ['o'],
    formula: `∂J/∂o = ∂J/∂L · ∂L/∂o = 1 × (${O} − ${Y}) = ${dJ_dO}`,
  },
  {
    title: '第二步：正则项分别对两个权重求导',
    body: 's = λ/2·(‖W¹‖² + ‖W²‖²)，对 W¹、W² 求导各自得到 λW。',
    hl: ['s', 'W1', 'W2'],
    formula: `∂s/∂W¹ = λW¹ = ${(LAM * W1).toFixed(2)}，∂s/∂W² = λW² = ${(LAM * W2).toFixed(2)}`,
  },
  {
    title: '第三步：最靠近输出的参数 W²',
    body: 'o = W²h，所以 ∂o/∂W² = h。链式法则给出第一项，再加上正则项的贡献。',
    hl: ['W2'],
    formula: `∂J/∂W² = ∂J/∂o · h + λW² = ${dJ_dO} × ${h} + ${(LAM * W2).toFixed(2)} = ${dJ_dW2.toFixed(2)}`,
  },
  {
    title: '第四步：继续往回走，到隐藏层输出 h',
    body: 'o = W²h，所以 ∂o/∂h = W²。这是反向传播“把梯度传回上一层”的那一步。',
    hl: ['h'],
    formula: `∂J/∂h = W² · ∂J/∂o = ${W2} × ${dJ_dO} = ${dJ_dh}`,
  },
  {
    title: '第五步：穿过激活函数',
    body: 'h = φ(z)，φ 按元素作用，所以要把梯度与 φ′(z) 逐元素相乘。这里 ReLU 在 z > 0 处的导数是 1。',
    hl: ['z'],
    formula: `∂J/∂z = ∂J/∂h ⊙ φ′(z) = ${dJ_dh} × 1 = ${dJ_dz}`,
  },
  {
    title: '第六步：最靠近输入的参数 W¹',
    body: 'z = W¹x，所以 ∂z/∂W¹ = x。与正则项的梯度相加，反向传播到此结束。',
    hl: ['W1'],
    formula: `∂J/∂W¹ = ∂J/∂z · x + λW¹ = ${dJ_dz} × ${X} + ${(LAM * W1).toFixed(2)} = ${dJ_dW1.toFixed(2)}`,
  },
]

const step = ref(0)
const cur = computed(() => STEPS[step.value])
const active = (id: string) => cur.value.hl.includes(id)
const ring = (id: string) => (active(id) ? 'var(--accent)' : 'var(--line)')
const fillOf = (id: string) => (active(id) ? 'var(--accent-soft)' : 'var(--paper)')

const NODES = [
  { id: 'x', cx: 60, cy: 230, label: 'x', val: '2' },
  { id: 'W1', cx: 60, cy: 150, label: 'W¹', val: '3' },
  { id: 'z', cx: 185, cy: 190, label: 'z', val: '6' },
  { id: 'h', cx: 300, cy: 190, label: 'h', val: '6' },
  { id: 'W2', cx: 300, cy: 95, label: 'W²', val: '0.5' },
  { id: 'o', cx: 430, cy: 190, label: 'o', val: '3' },
  { id: 'L', cx: 545, cy: 190, label: 'L', val: '2' },
  { id: 'y', cx: 545, cy: 95, label: 'y', val: '1' },
  { id: 's', cx: 185, cy: 80, label: 's', val: '0.46' },
  { id: 'J', cx: 430, cy: 40, label: 'J', val: '2.46' },
]

const EDGES: [string, string][] = [
  ['x', 'z'],
  ['W1', 'z'],
  ['z', 'h'],
  ['h', 'o'],
  ['W2', 'o'],
  ['o', 'L'],
  ['y', 'L'],
  ['L', 'J'],
  ['s', 'J'],
  ['W1', 's'],
  ['W2', 's'],
]

const node = (id: string) => NODES.find((n) => n.id === id)!
function edgeLine(a: string, b: string) {
  const p = node(a)
  const q = node(b)
  const dx = q.cx - p.cx
  const dy = q.cy - p.cy
  const len = Math.hypot(dx, dy) || 1
  const r = 27
  return {
    x1: p.cx + (dx / len) * r,
    y1: p.cy + (dy / len) * r,
    x2: q.cx - (dx / len) * r,
    y2: q.cy - (dy / len) * r,
  }
}
</script>

<template>
  <Widget title="一点点走完计算图上的反向传播">
    <p class="widget-note">
      一个标量化的单隐藏层网络：x = 2，W¹ = 3，φ = ReLU，W² = 0.5，y = 1，λ = 0.1。点“下一步”，沿与前向相反的方向逐个求出梯度。
    </p>

    <div class="ctrl">
      <button class="btn primary" type="button" :disabled="step >= STEPS.length - 1" @click="step++">下一步</button>
      <button class="btn" type="button" @click="step = 0">重置</button>
      <span class="muted" style="font-size: 13px">第 {{ step + 1 }} / {{ STEPS.length }} 步</span>
    </div>

    <svg width="600" height="280" viewBox="0 0 600 280" style="max-width: 100%">
      <defs>
        <marker id="l04-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" style="fill: var(--ink-3)" />
        </marker>
      </defs>

      <line
        v-for="(e, i) in EDGES" :key="i"
        :x1="edgeLine(e[0], e[1]).x1" :y1="edgeLine(e[0], e[1]).y1"
        :x2="edgeLine(e[0], e[1]).x2" :y2="edgeLine(e[0], e[1]).y2"
        style="stroke: var(--ink-3); stroke-width: 1.4" marker-end="url(#l04-arrow)"
      />

      <g v-for="n in NODES" :key="n.id">
        <rect
          :x="n.cx - 27" :y="n.cy - 21" width="54" height="42" rx="8"
          :style="`fill:${fillOf(n.id)};stroke:${ring(n.id)};stroke-width:${active(n.id) ? 2.4 : 1.2}`"
        />
        <text :x="n.cx" :y="n.cy - 2" text-anchor="middle" :style="`fill:${active(n.id) ? 'var(--accent)' : 'var(--ink)'};font-size:13px;font-weight:700`">
          {{ n.label }}
        </text>
        <text :x="n.cx" :y="n.cy + 13" text-anchor="middle" style="fill: var(--ink-3); font-size: 11px">
          {{ n.val }}
        </text>
      </g>
    </svg>

    <div class="out prose" style="border-left: 3px solid var(--accent)">
      <b>{{ cur.title }}</b><br />
      {{ cur.body }}<br />
      <span style="font-family: var(--vp-font-family-mono); color: var(--accent)">{{ cur.formula }}</span>
    </div>

    <div v-if="step === STEPS.length - 1" class="stats">
      <div class="stat"><b>{{ dJ_dW1.toFixed(2) }}</b><span>∂J/∂W¹</span></div>
      <div class="stat"><b>{{ dJ_dW2.toFixed(2) }}</b><span>∂J/∂W²</span></div>
      <div class="stat"><b>{{ J.toFixed(3) }}</b><span>前向得到的 J = L + s</span></div>
    </div>

    <p class="widget-note" style="margin-bottom: 0">
      这七个量就是优化器需要的全部信息。框架做的就是把这条路自动走一遍：前向时把 h、z、o 存下来，反向时按相反顺序乘回去——所以反向传播必须复用前向的中间值，也是训练比预测更吃内存的原因。
    </p>
  </Widget>
</template>
