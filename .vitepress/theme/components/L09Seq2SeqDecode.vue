<script setup lang="ts">
import { ref, computed } from 'vue'

// 一个固定的玩具词表与“模型输出分布”：把训练好的 seq2seq 在某一步的
// softmax 结果写死，方便一步步观察解码过程。句子取自原文示例 i'm home .
const gold = ['je', 'suis', 'chez', 'moi', '.', '<eos>']
const table: { tok: string; p: number }[][] = [
  [{ tok: 'je', p: 0.71 }, { tok: 'il', p: 0.10 }, { tok: "c'est", p: 0.07 }],
  [{ tok: 'suis', p: 0.66 }, { tok: 'ai', p: 0.13 }, { tok: 'vais', p: 0.08 }],
  [{ tok: 'chez', p: 0.42 }, { tok: 'à', p: 0.21 }, { tok: 'en', p: 0.14 }],
  [{ tok: 'moi', p: 0.52 }, { tok: 'lui', p: 0.18 }, { tok: 'nous', p: 0.12 }],
  [{ tok: '.', p: 0.58 }, { tok: '!', p: 0.19 }, { tok: '?', p: 0.06 }],
  [{ tok: '<eos>', p: 0.88 }, { tok: 'je', p: 0.05 }, { tok: 'et', p: 0.03 }]
]

type Rec = { input: string; pick: string; tf: boolean; manual: boolean }

const tf = ref(true)          // true = 强制教学（喂标签）
const k = ref(0)              // 正在生成第 k 个词
const hist = ref<Rec[]>([])
const pending = ref<string | null>(null)

const done = computed(() => hist.value.length > 0 && hist.value[hist.value.length - 1].pick === '<eos>')
const preds = computed(() => hist.value.map(h => h.pick))

const input = computed(() => {
  if (k.value === 0) return '<bos>'
  if (tf.value) return gold[k.value - 1]
  return hist.value[k.value - 1].pick
})

const cur = computed(() => (k.value < table.length ? table[k.value] : table[table.length - 1]))
const argmax = computed(() => cur.value.reduce((a, b) => (b.p > a.p ? b : a)).tok)

const peek = computed(() => pending.value ?? argmax.value)
const sentence = computed(() => preds.value.filter(p => p !== '<eos>').join(' '))
const isWrong = computed(() => peek.value !== gold[Math.min(k.value, gold.length - 1)])

function feed(tok: string) {
  pending.value = tok
}

function next() {
  if (done.value) return
  const pick = peek.value
  hist.value = [...hist.value, { input: input.value, pick, tf: tf.value, manual: pending.value !== null }]
  pending.value = null
  k.value++
}

function reset() {
  k.value = 0
  hist.value = []
  pending.value = null
}

function mode(v: boolean) {
  tf.value = v
  reset()
}
</script>

<template>
  <Widget title="逐词元解码：把上一步的输出接回输入">
    <p class="widget-note">
      模型的分布已写死在每一步（取自原文的玩具规模）。按“下一步”看解码器怎么走；点候选词可以手动改它的选择，观察一个错词如何毁掉后面整句。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button type="button" :class="{ on: tf }" @click="mode(true)">训练：强制教学</button>
        <button type="button" :class="{ on: !tf }" @click="mode(false)">推理：喂自己的预测</button>
      </div>
      <button class="btn primary" type="button" :disabled="done" @click="next">下一步</button>
      <button class="btn" type="button" @click="reset">重置</button>
    </div>

    <div class="row">
      <span class="cap">解码器输入</span>
      <b class="tok">{{ input }}</b>
      <span class="muted" v-if="tf && k > 0 && k < 6" style="font-size:12.5px">← 标签序列的第 {{ k }} 个词</span>
      <span class="muted" v-else-if="!tf && k > 0" style="font-size:12.5px">← 上一步模型的预测</span>
    </div>

    <div class="cands">
      <div v-for="c in cur" :key="c.tok" class="cand" :class="{ on: peek === c.tok }" @click="feed(c.tok)">
        <span class="name">{{ c.tok }}</span>
        <span class="bar"><i :style="{ width: (c.p / cur[0].p) * 100 + '%' }" /></span>
        <span class="p">{{ c.p.toFixed(2) }}</span>
      </div>
    </div>

    <div class="out prose" style="margin-top:10px">
      <span class="lbl">已生成</span>
      <template v-if="preds.length">
        <b v-for="(p, i) in preds" :key="i" class="tok" :class="{ bad: p !== gold[i] }">{{ p }}</b>
      </template>
      <span v-else class="muted">（还是空的，按“下一步”）</span>
    </div>

    <p class="widget-note" :class="isWrong ? 'bad-c' : ''" style="margin:8px 0 0">
      <template v-if="done">遇到 &lt;eos&gt;，生成结束。整句是「{{ sentence }}」。</template>
      <template v-else-if="tf && isWrong">这一步模型想选「{{ peek }}」，但强制教学仍然把标签「{{ gold[k] }}」喂给下一步——训练不看模型错了没有。</template>
      <template v-else-if="!tf && isWrong">这一步选错了，下一步的输入就会带着这个错误继续往下走，错误会一路累积。</template>
      <template v-else>下一步会选中「{{ peek }}」（当前概率最高）。</template>
    </p>
  </Widget>
</template>

<style scoped>
.row { display: flex; align-items: center; gap: 10px; margin: 6px 0 10px; }
.cap { font-size: 13px; color: var(--ink-2); flex: 0 0 84px; }
.tok {
  display: inline-block; font-family: var(--vp-font-family-mono); font-size: 13px;
  padding: 1px 8px; margin: 0 4px 4px 0; border-radius: 6px;
  background: var(--ex-bg); color: var(--ex); border: 1px solid color-mix(in srgb, var(--ex) 30%, transparent);
}
.tok.bad { background: var(--warn-bg); color: var(--warn); border-color: color-mix(in srgb, var(--warn) 30%, transparent); }
.cands { display: flex; flex-direction: column; gap: 6px; }
.cand { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 3px 6px; border-radius: 7px; }
.cand:hover { background: var(--bg2); }
.cand.on { background: var(--accent-soft); }
.cand .name { flex: 0 0 74px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.cand .bar { flex: 1; height: 12px; background: var(--bg2); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
.cand .bar i { display: block; height: 100%; background: var(--accent); }
.cand .p { flex: 0 0 42px; text-align: right; font-family: var(--vp-font-family-mono); font-size: 12.5px; }
.bad-c { color: var(--warn); }
</style>
