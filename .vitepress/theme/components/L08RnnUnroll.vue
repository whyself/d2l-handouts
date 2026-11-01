<script setup lang="ts">
import { ref, computed } from 'vue'

const CHARS = ['m', 'a', 'c', 'h', 'i', 'n', 'e']
const V = CHARS.length
const H = 3
const INPUT = 'machin'
const LABEL = 'achine'

const frac = (x: number) => x - Math.floor(x)
const rnd = (i: number) => frac(Math.sin(i * 12.9898 + 3.7) * 43758.5453) * 2 - 1

// 固定（未经训练）的权重，让每次打开看到同样的数
const W_xh: number[][] = []
const W_hh: number[][] = []
const W_hq: number[][] = []
let c = 0
for (let v = 0; v < V; v++) {
  const row: number[] = []
  for (let h = 0; h < H; h++) row.push(rnd(c++) * 0.9)
  W_xh.push(row)
}
for (let a = 0; a < H; a++) {
  const row: number[] = []
  for (let b = 0; b < H; b++) row.push(rnd(c++) * 0.9)
  W_hh.push(row)
}
for (let a = 0; a < H; a++) {
  const row: number[] = []
  for (let v = 0; v < V; v++) row.push(rnd(c++) * 1.3)
  W_hq.push(row)
}

type Step = {
  input: string
  label: string
  hPrev: number[]
  fromX: number[]
  fromH: number[]
  h: number[]
  pred: string
  p: number
}

const steps = computed<Step[]>(() => {
  let h = [0, 0, 0]
  const out: Step[] = []
  for (let t = 0; t < INPUT.length; t++) {
    const xi = CHARS.indexOf(INPUT[t])
    const fromX = [0, 0, 0]
    const fromH = [0, 0, 0]
    for (let k = 0; k < H; k++) {
      fromX[k] = W_xh[xi][k]
      fromH[k] = h[0] * W_hh[0][k] + h[1] * W_hh[1][k] + h[2] * W_hh[2][k]
    }
    const nh = [0, 1, 2].map(k => Math.tanh(fromX[k] + fromH[k]))
    const o: number[] = []
    for (let v = 0; v < V; v++) o.push(nh[0] * W_hq[0][v] + nh[1] * W_hq[1][v] + nh[2] * W_hq[2][v])
    const mx = Math.max(...o)
    const ex = o.map(v => Math.exp(v - mx))
    const sum = ex.reduce((a, b) => a + b, 0)
    const probs = ex.map(v => v / sum)
    let arg = 0
    for (let v = 1; v < V; v++) if (probs[v] > probs[arg]) arg = v
    out.push({
      input: INPUT[t],
      label: LABEL[t],
      hPrev: [...h],
      fromX,
      fromH,
      h: nh,
      pred: CHARS[arg],
      p: probs[arg]
    })
    h = nh
  }
  return out
})

const cursor = ref(0)
const total = computed(() => steps.value.length)
const cur = computed(() => (cursor.value > 0 ? steps.value[cursor.value - 1] : null))
const newInfo = computed(() => (cur.value ? Math.hypot(...cur.value.fromX) : 0))
const oldInfo = computed(() => (cur.value ? Math.hypot(...cur.value.fromH) : 0))

function step() { if (cursor.value < total.value) cursor.value++ }
function back() { if (cursor.value > 0) cursor.value-- }
function reset() { cursor.value = 0 }
function all() { cursor.value = total.value }
</script>

<template>
  <Widget title="把 “machine” 一步步喂进去：看隐状态怎么攒住历史">
    <p class="widget-note">
      这就是图 8.4.2 的字符级语言模型，只不过把 512 维隐状态缩成 3 维、把 28 项词表缩成 7 个字符，好让数字看得见。点「走一步」，每一步都算 h_t = tanh(W_xh·x_t + W_hh·h_(t-1) + b_h)，再由 h_t 算出下一个字符的概率。权重是随机初始化的，所以预测大多不对——重点看 h 里混进了什么。
    </p>

    <div class="ctrl">
      <button class="btn primary" type="button" @click="step">走一步</button>
      <button class="btn" type="button" @click="back">上一步</button>
      <button class="btn" type="button" @click="all">全部展开</button>
      <button class="btn" type="button" @click="reset">重置</button>
      <span class="muted" style="font-size:13px">{{ cursor }} / {{ total }} 步</span>
    </div>

    <div class="chain">
      <template v-for="(s, i) in steps" :key="i">
        <div class="cellbox" :class="{ on: i === cursor - 1, done: i < cursor - 1 }">
          <div class="hd"><b>{{ s.input }}</b><small>t={{ i + 1 }}</small></div>
          <div class="hb">
            <i v-for="(v, j) in s.h" :key="j" :style="{ width: (Math.abs(v) * 100).toFixed(0) + '%' }" />
          </div>
          <div class="nums">{{ s.h.map(v => v.toFixed(2)).join(' ') }}</div>
          <div class="pred">→ {{ s.pred }}</div>
        </div>
        <span v-if="i < steps.length - 1" class="arrow">→</span>
      </template>
    </div>

    <div class="stats">
      <div class="stat"><b>{{ cur ? cur.input : '—' }}</b><span>本步输入 x_t</span></div>
      <div class="stat"><b>{{ cur ? cur.pred : '—' }}</b><span>预测字符（标签是 {{ cur ? cur.label : '—' }}）</span></div>
      <div class="stat"><b>{{ (cur ? cur.p * 100 : 0).toFixed(0) }}%</b><span>预测字符的概率</span></div>
      <div class="stat"><b>{{ oldInfo.toFixed(2) }} / {{ newInfo.toFixed(2) }}</b><span>旧信息 / 新输入的量级</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      <template v-if="cursor === 0">还没开始：h₀ 全是 0，模型对「m 之后该是什么」一无所知。</template>
      <template v-else-if="cursor === 1">第一步只有当前字符 m 可用，h₁ 完全由 W_xh 决定；此时它还谈不上「记忆」。</template>
      <template v-else>注意最后一格：h 里同时装着「刚输入的 {{ cur ? cur.input : '' }}」和「前面所有字符经过 W_hh 滚下来的东西」。同一组 W_xh、W_hh、W_hq 在 6 个时间步里被重复使用，参数量一点没变；而 h_t 逐格变化，历史就这么被压进了一个固定维度的向量。这就是 RNN 用「循环」换掉 n 元语法那张 |V|^n 大表的全部把戏。</template>
    </p>
  </Widget>
</template>

<style scoped>
.chain { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px 0 10px; }
.cellbox {
  width: 76px; padding: 6px 7px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--vp-c-bg); transition: border-color .2s, background .2s, transform .2s, opacity .2s;
}
.cellbox.done { border-color: var(--prin); background: var(--prin-bg); }
.cellbox.on { border-color: var(--accent); background: var(--accent-soft); transform: translateY(-2px); }
.hd { display: flex; justify-content: space-between; align-items: baseline; }
.hd b { font-family: var(--vp-font-family-mono); font-size: 16px; }
.hd small { font-size: 10px; color: var(--ink-3); }
.hb { display: flex; flex-direction: column; gap: 2px; margin: 4px 0; }
.hb i { display: block; height: 3px; background: var(--accent); border-radius: 2px; min-width: 1px; }
.nums { font: 10px/1.4 var(--vp-font-family-mono); color: var(--ink-2); font-variant-numeric: tabular-nums; }
.pred { font: 12px/1.5 var(--vp-font-family-mono); color: var(--ink-3); }
.arrow { color: var(--ink-3); font-size: 12px; }
</style>
