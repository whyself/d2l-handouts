<script setup lang="ts">
import { ref, computed } from 'vue'

// 固定字母表，模拟「离散词元」的马尔可夫链
const A = 5
const N = 800
const NAMES = ['a', 'b', 'c', 'd', 'e']

const frac = (x: number) => x - Math.floor(x)
// 确定性伪随机：同样的下标永远得到同样的数（避免 SSR/hydration 不一致）
const pseudo = (i: number, k: number) => frac(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453)

// 序列由二阶规则 x_t = (x_{t-1} + x_{t-2} + 1) mod 5 生成，另加 6% 噪声
const seq: number[] = [0, 2]
for (let t = 2; t < N; t++) {
  if (pseudo(t, 1) < 0.06) seq.push(Math.floor(pseudo(t, 7) * A))
  else seq.push((seq[t - 1] + seq[t - 2] + 1) % A)
}
const HALF = N / 2

type Model = { tau: number; params: number; seen: number; loss: number; ppl: number; rows: { ctx: string; count: number; dist: number[] }[] }

function build(tau: number): Model {
  const counts = new Map<string, number[]>()
  for (let t = tau; t < HALF; t++) {
    const key = seq.slice(t - tau, t).join('')
    let arr = counts.get(key)
    if (!arr) { arr = new Array(A).fill(0); counts.set(key, arr) }
    arr[seq[t]]++
  }
  const alpha = 0.1
  let nll = 0
  let n = 0
  for (let t = HALF; t < N; t++) {
    const arr = counts.get(seq.slice(t - tau, t).join(''))
    let p = 1 / A
    if (arr) {
      const tot = arr.reduce((s, v) => s + v, 0) + alpha * A
      p = (arr[seq[t]] + alpha) / tot
    }
    nll += -Math.log(p)
    n++
  }
  const loss = nll / n
  const rows = [...counts.entries()]
    .map(([ctx, arr]) => {
      const tot = arr.reduce((s, v) => s + v, 0)
      return { ctx: ctx.split('').join(' '), count: tot, dist: arr.map(v => v / tot) }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  return { tau, params: Math.pow(A, tau), seen: counts.size, loss, ppl: Math.exp(loss), rows }
}

const all = [1, 2, 3, 4].map(build)
const best = all.reduce((a, b) => (a.loss <= b.loss ? a : b))
const order = ref(2)
const cur = computed(() => all[order.value - 1])
const maxLoss = Math.max(...all.map(m => m.loss))
</script>

<template>
  <Widget title="阶数 τ：记住多少历史，代价差多少">
    <p class="widget-note">
      数据是一串只含 a b c d e 的序列，生成规则只依赖前两个符号。下面用「数一数上下文、看下一个符号」的马尔可夫模型，在前一半数据上统计、后一半上打分。切不同的阶数 τ，看测试损失和参数量怎么变。
    </p>

    <div class="ctrl">
      <span class="muted" style="font-size:13px">阶数 τ</span>
      <div class="seg">
        <button v-for="m in all" :key="m.tau" type="button" :class="{ on: order === m.tau }" @click="order = m.tau">
          {{ m.tau }}
        </button>
      </div>
      <span class="muted" style="font-size:13px">测试损失越低越好</span>
    </div>

    <svg width="600" height="86" viewBox="0 0 600 86" style="width:100%;max-width:600px">
      <g v-for="(m, i) in all" :key="m.tau">
        <rect
          :x="10 + i * 145" :y="8 + 52 - (m.loss / maxLoss) * 52" :width="110"
          :height="(m.loss / maxLoss) * 52"
          :style="{ fill: m.tau === order ? 'var(--accent)' : 'var(--line)' }"
        />
        <text :x="65 + i * 145" :y="80" text-anchor="middle" style="fill:var(--ink-3);font-size:11">
          τ={{ m.tau }} · {{ m.loss.toFixed(2) }}
        </text>
      </g>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ cur.params }}</b><span>完整条件表要存的数（4^τ）</span></div>
      <div class="stat"><b>{{ cur.seen }}</b><span>训练中真正见过的上下文</span></div>
      <div class="stat"><b>{{ cur.loss.toFixed(3) }}</b><span>测试集平均损失（nats）</span></div>
      <div class="stat"><b>{{ cur.ppl.toFixed(2) }}</b><span>困惑度</span></div>
    </div>

    <table class="mini-table" style="margin-top:6px">
      <thead>
        <tr><th>上下文（最近 τ 个符号）</th><th>出现次数</th><th>下一个符号的分布</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in cur.rows" :key="r.ctx">
          <td style="font-family:var(--vp-font-family-mono)">{{ r.ctx }}</td>
          <td>{{ r.count }}</td>
          <td>
            <span v-for="(p, j) in r.dist" :key="j" class="bar">
              <i :style="{ width: (p * 100) + '%' }" />
              <em>{{ NAMES[j] }} {{ (p * 100).toFixed(0) }}%</em>
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <p class="widget-note" style="margin:10px 0 0">
      τ=1 只有 {{ all[0].params }} 行条件表，看不到「前两个符号」的交互，损失 {{ all[0].loss.toFixed(2) }}（困惑度约 {{ all[0].ppl.toFixed(1) }}）；τ=2 正好对上生成规则，损失掉到 {{ all[1].loss.toFixed(2) }}，那 {{ all[1].params }} 行条件表也几乎都用上了（{{ all[1].seen }} 行）。τ=3、τ=4 的条件表膨胀到 {{ all[2].params }}、{{ all[3].params }} 行，可训练集里只见过 {{ all[2].seen }}、{{ all[3].seen }} 行，测试时大量上下文从未出现，只能退回均匀分布——损失反而回升。这就是「阶数越高，参数指数增长、每个上下文越来越空」的具体代价。最好的阶数是 τ={{ best.tau }}。
    </p>
  </Widget>
</template>

<style scoped>
.bar { display: inline-flex; align-items: center; gap: 6px; margin-right: 10px; font-size: 12px; }
.bar i { display: block; height: 7px; background: var(--accent); border-radius: 4px; min-width: 1px; }
.bar em { font-style: normal; color: var(--ink-2); font-variant-numeric: tabular-nums; }
</style>
