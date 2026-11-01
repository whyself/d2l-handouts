<script setup lang="ts">
import { ref, computed } from 'vue'

const label = ref('il est calme .')
const pred = ref('il est riche .')
const K = ref(2)

type Row = { n: number; m: number; total: number; pn: number; w: number }

function analyze(predStr: string, labelStr: string, k: number) {
  const p = predStr.trim().split(/\s+/).filter(Boolean)
  const l = labelStr.trim().split(/\s+/).filter(Boolean)
  const rows: Row[] = []
  const safeLen = Math.max(p.length, 1)
  const brevity = Math.exp(Math.min(0, 1 - l.length / safeLen))
  let score = brevity
  for (let n = 1; n <= k; n++) {
    const counts = new Map<string, number>()
    for (let i = 0; i + n <= l.length; i++) {
      const g = l.slice(i, i + n).join(' ')
      counts.set(g, (counts.get(g) || 0) + 1)
    }
    let m = 0
    for (let i = 0; i + n <= p.length; i++) {
      const g = p.slice(i, i + n).join(' ')
      const c = counts.get(g) || 0
      if (c > 0) { m++; counts.set(g, c - 1) }
    }
    const total = Math.max(0, p.length - n + 1)
    const pn = total > 0 ? m / total : 0
    score *= Math.pow(pn, Math.pow(0.5, n))
    rows.push({ n, m, total, pn, w: Math.pow(0.5, n) })
  }
  return { rows, score, brevity, lp: p.length, ll: l.length }
}

const res = computed(() => analyze(pred.value, label.value, K.value))

function preset(kind: number) {
  if (kind === 1) { label.value = 'A B C D E F'; pred.value = 'A B B C D'; K.value = 4 }
  if (kind === 2) { label.value = 'A B C D E F'; pred.value = 'A B'; K.value = 2 }
  if (kind === 3) { label.value = 'il est calme .'; pred.value = 'il est riche .'; K.value = 2 }
  if (kind === 4) { label.value = 'va !'; pred.value = 'va !'; K.value = 2 }
}
</script>

<template>
  <Widget title="BLEU：把“翻译得像不像”算成一个数">
    <p class="widget-note">
      改标签和预测（空格分句），看各阶精确度 pₙ 与短句惩罚各自如何拉低总分。四个按钮是原文里的四个例子。
    </p>

    <div class="ctrl">
      <label>标签 <input v-model="label" type="text" style="width:170px"></label>
      <label>预测 <input v-model="pred" type="text" style="width:170px"></label>
    </div>

    <div class="ctrl">
      <button class="btn" type="button" @click="preset(1)">原文例：ABB CD</button>
      <button class="btn" type="button" @click="preset(2)">过短：AB</button>
      <button class="btn" type="button" @click="preset(3)">译文例：riche</button>
      <button class="btn" type="button" @click="preset(4)">完全一致</button>
      <div class="seg" style="margin-left:auto">
        <button v-for="n in [2, 3, 4]" :key="n" type="button" :class="{ on: K === n }" @click="K = n">k={{ n }}</button>
      </div>
    </div>

    <table class="mini-table">
      <thead>
        <tr><th>n 元语法</th><th>匹配数 / 预测总数</th><th>p_n</th><th>指数 1/2ⁿ</th><th>贡献</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in res.rows" :key="r.n">
          <td>n = {{ r.n }}</td>
          <td>{{ r.m }} / {{ r.total }}</td>
          <td>{{ r.pn.toFixed(4) }}</td>
          <td>{{ r.w.toFixed(4) }}</td>
          <td>{{ r.pn > 0 ? Math.pow(r.pn, r.w).toFixed(4) : '0（整项归零）' }}</td>
        </tr>
        <tr>
          <td>短句惩罚</td>
          <td colspan="2">exp(min(0, 1 − {{ res.ll }}/{{ res.lp }}))</td>
          <td colspan="2">{{ res.brevity.toFixed(4) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="stats">
      <div class="stat"><b>{{ res.score.toFixed(3) }}</b><span>BLEU（k = {{ K }}）</span></div>
      <div class="stat"><b>{{ res.lp }} / {{ res.ll }}</b><span>预测长度 / 标签长度</span></div>
      <div class="stat"><b>{{ res.score >= 0.999 ? '满分' : res.score === 0 ? '有一阶全错' : '部分匹配' }}</b><span>状态</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      注意两点：一，匹配用的是<b>截断计数</b>（预测里多出来的 B 拿不到第二次分），所以 p₁ 不是简单的“词是否出现过”；二，任何一阶 pₙ = 0 都会让整条乘积归零——预测比标签短太多时，短句惩罚也救不回来。
    </p>
  </Widget>
</template>
