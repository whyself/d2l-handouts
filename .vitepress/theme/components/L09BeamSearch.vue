<script setup lang="ts">
import { ref, computed } from 'vue'

// 完全按图 9.8.3 的玩具设定：词表 A–E，最大长度 3。
// 为省事把“<eos>”从词表里去掉，不影响候选集合（图中列出的六个候选都不含 <eos>）。
const vocab = ['A', 'B', 'C', 'D', 'E']
const trans: Record<string, Record<string, number>> = {
  '': { A: 0.5, C: 0.3, B: 0.1, D: 0.06, E: 0.04 },
  A: { B: 0.4, C: 0.25, A: 0.15, D: 0.1, E: 0.1 },
  C: { E: 0.5, A: 0.2, B: 0.15, D: 0.1, C: 0.05 },
  'A B': { D: 0.6, A: 0.2, B: 0.1, C: 0.06, E: 0.04 },
  'C E': { D: 0.6, B: 0.2, C: 0.1, A: 0.06, E: 0.04 },
  'A C': { B: 0.6, D: 0.2, A: 0.1, C: 0.06, E: 0.04 },
  'C A': { B: 0.5, D: 0.2, A: 0.1, C: 0.1, E: 0.1 }
}
const fallback: Record<string, number> = { A: 0.2, B: 0.2, C: 0.2, D: 0.2, E: 0.2 }

function dist(seq: string[]) {
  return trans[seq.join(' ')] ?? fallback
}

type Cand = { seq: string[]; logp: number }
type Row = { seq: string[]; logp: number; kept: boolean }

const k = ref(2)
const alpha = ref(0.75)
const step = ref(0) // 0 = 还没开始；1..3 = 已展开到第几步

const sim = computed(() => {
  const stages: { rows: Row[]; beams: Cand[] }[] = []
  let beams: Cand[] = [{ seq: [], logp: 0 }]
  const all: Cand[] = []
  for (let s = 0; s < 3; s++) {
    const rows: Row[] = []
    for (const b of beams) {
      const d = dist(b.seq)
      for (const tok of vocab) {
        rows.push({ seq: [...b.seq, tok], logp: b.logp + Math.log(d[tok] ?? 0.001), kept: false })
      }
    }
    rows.sort((a, b) => b.logp - a.logp)
    rows.slice(0, k.value).forEach(r => { r.kept = true })
    beams = rows.filter(r => r.kept).map(r => ({ seq: r.seq, logp: r.logp }))
    all.push(...beams.map(b => ({ ...b })))
    stages.push({ rows, beams })
  }
  return { stages, all }
})

const stage = computed(() => (step.value > 0 ? sim.value.stages[step.value - 1] : null))

const ranked = computed(() => {
  return [...sim.value.all]
    .map(c => {
      const L = c.seq.length
      return { ...c, L, raw: Math.exp(c.logp), score: c.logp / Math.pow(L, alpha.value) }
    })
    .sort((a, b) => b.score - a.score)
})

const best = computed(() => ranked.value[0])
const shortest = computed(() => [...sim.value.all].sort((a, b) => a.seq.length - b.seq.length || b.logp - a.logp)[0])

function next() { if (step.value < 3) step.value++ }
function prev() { if (step.value > 0) step.value-- }
function reset() { step.value = 0 }
</script>

<template>
  <Widget title="束搜索：每一步留下 k 条候选，其余剪掉">
    <p class="widget-note">
      词表 A–E，最大长度 3，概率表与图 9.8.3 一致。按“下一步”看每层怎么从 k×5 个选择里剪到 k 个；走完三步再用式 9.8.2 给候选打分。
    </p>

    <div class="ctrl">
      <label>束宽 k</label>
      <div class="seg">
        <button v-for="n in [1, 2, 3]" :key="n" type="button" :class="{ on: k === n }" @click="k = n; reset()">{{ n }}</button>
      </div>
      <label>长度惩罚 α
        <input v-model.number="alpha" type="range" min="0" max="1.6" step="0.05"><b>{{ alpha.toFixed(2) }}</b>
      </label>
      <button class="btn primary" type="button" :disabled="step >= 3" @click="next">下一步</button>
      <button class="btn" type="button" @click="prev">回退</button>
      <button class="btn" type="button" @click="reset">重置</button>
    </div>

    <div v-if="stage" class="box">
      <div class="hd">时间步 {{ step }}：{{ stage.rows.length }} 个选择 → 保留 {{ k }} 个</div>
      <table class="mini-table">
        <thead><tr><th>候选序列</th><th>log P</th><th>P</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in stage.rows" :key="i" :class="{ best: r.kept }">
            <td>{{ r.seq.join(' ') }}</td>
            <td>{{ r.logp.toFixed(3) }}</td>
            <td>{{ Math.exp(r.logp).toFixed(4) }}</td>
            <td>{{ r.kept ? '保留' : '剪掉' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="out prose">按“下一步”开始第 1 个时间步。</div>

    <div class="hd" style="margin-top:14px">最终候选（{{ ranked.length }} 条）按式 9.8.2 排序</div>
    <table class="mini-table">
      <thead><tr><th>序列</th><th>长度 L</th><th>概率乘积</th><th>归一化得分</th></tr></thead>
      <tbody>
        <tr v-for="(c, i) in ranked" :key="i" :class="{ best: c.seq === best.seq }">
          <td>{{ c.seq.join(' ') }}</td>
          <td>{{ c.L }}</td>
          <td>{{ c.raw.toFixed(3) }}</td>
          <td>{{ (c.score).toFixed(3) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="stats">
      <div class="stat"><b>{{ best.seq.join(' ') }}</b><span>当前 α 下的最优</span></div>
      <div class="stat"><b>{{ shortest.seq.join(' ') }}</b><span>最短候选</span></div>
      <div class="stat"><b>{{ k * vocab.length * 3 }}</b><span>总扩展次数 O(k·|Y|·T')</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      把 α 从 0 拉到 1.6：得分会从“偏爱最短句”翻到“偏爱长句”，最优候选也跟着换——长度归一化不是细节，它直接决定束搜索交出哪一句。（原文的数值里 P(A)=0.5 太高，α=0.75 时最短的 A 反而排第一，这正说明式 9.8.2 的偏好需要按任务调。）
    </p>
  </Widget>
</template>

<style scoped>
.box { border: 1px solid var(--line); border-radius: 9px; padding: 8px 10px 10px; }
.hd { font-size: 13px; color: var(--ink-2); font-weight: 600; margin-bottom: 6px; }
</style>
