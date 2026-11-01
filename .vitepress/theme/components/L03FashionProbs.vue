<script setup lang="ts">
import { ref, computed } from 'vue'

const en = ['t-shirt', 'trouser', 'pullover', 'dress', 'coat', 'sandal', 'shirt', 'sneaker', 'bag', 'ankle boot']
const cn = ['T恤', '裤子', '套衫', '连衣裙', '外套', '凉鞋', '衬衫', '运动鞋', '包', '短靴']

// 教学用示例：一组训练好的 softmax 模型在 8 张测试图上的输出（每行和为 1）
const samples = [
  { truth: 0, probs: [0.82, 0.01, 0.05, 0.02, 0.03, 0.00, 0.06, 0.00, 0.01, 0.00] },
  { truth: 7, probs: [0.00, 0.00, 0.01, 0.00, 0.00, 0.05, 0.01, 0.90, 0.02, 0.01] },
  { truth: 2, probs: [0.03, 0.00, 0.55, 0.01, 0.19, 0.00, 0.22, 0.00, 0.00, 0.00] },
  { truth: 5, probs: [0.00, 0.00, 0.00, 0.00, 0.00, 0.71, 0.00, 0.08, 0.00, 0.21] },
  { truth: 8, probs: [0.01, 0.01, 0.02, 0.00, 0.01, 0.03, 0.02, 0.02, 0.86, 0.02] },
  { truth: 1, probs: [0.02, 0.93, 0.01, 0.02, 0.01, 0.00, 0.01, 0.00, 0.00, 0.00] },
  { truth: 6, probs: [0.02, 0.00, 0.24, 0.01, 0.41, 0.00, 0.30, 0.00, 0.02, 0.00] },
  { truth: 4, probs: [0.01, 0.00, 0.08, 0.01, 0.87, 0.00, 0.03, 0.00, 0.00, 0.00] },
]

const idx = ref(0)
const threshold = ref(0.5)

const s = computed(() => samples[idx.value])
const top = computed(() => s.value.probs.indexOf(Math.max(...s.value.probs)))
const maxp = computed(() => s.value.probs[top.value])
const correct = computed(() => top.value === s.value.truth)

const accepted = computed(() =>
  samples.map((x, i) => ({ i, max: Math.max(...x.probs), ok: x.probs.indexOf(Math.max(...x.probs)) === x.truth }))
    .filter(x => x.max >= threshold.value)
)
const coverage = computed(() => accepted.value.length / samples.length)
const acc = computed(() => accepted.value.length ? accepted.value.filter(x => x.ok).length / accepted.value.length : NaN)
const baseAcc = computed(() => samples.filter(x => x.probs.indexOf(Math.max(...x.probs)) === x.truth).length / samples.length)
</script>

<template>
  <Widget title="Fashion-MNIST 的 10 类概率：从读数到拒识">
    <p class="widget-note">
      模型对一张图输出 10 个概率。下面是 8 张测试图的输出示例（教学用数值，量级与原书训练结果一致）。切换样本，再拖动「置信度阈值」：低于阈值的预测被拒识，看看覆盖率和精度怎么此消彼长。
    </p>

    <div class="ctrl">
      <span class="seg">
        <button v-for="(_, i) in samples" :key="i" type="button" :class="{ on: idx === i }" @click="idx = i">{{ i + 1 }}</button>
      </span>
      <label>拒识阈值 <input v-model.number="threshold" type="range" min="0" max="0.95" step="0.05"><b>{{ threshold.toFixed(2) }}</b></label>
    </div>

    <div class="out prose" style="margin-bottom:10px">
      真实：<b>{{ cn[s.truth] }}</b>（{{ en[s.truth] }}）　预测：<b>{{ cn[top] }}</b>（{{ en[top] }}，{{ (maxp * 100).toFixed(0) }}%）
      <span :class="correct ? 'ok-c' : 'bad-c'">　{{ correct ? '✓ 正确' : '✗ 错误' }}</span>
    </div>

    <div class="rows">
      <div v-for="(p, j) in s.probs" :key="j" class="row" :class="{ truth: j === s.truth }">
        <span class="mark">{{ j === s.truth ? '●' : '' }}</span>
        <span class="name">{{ cn[j] }}</span>
        <div class="bar">
          <i :style="{ width: (p * 100).toFixed(1) + '%', background: j === top ? (correct ? 'var(--ex)' : 'var(--warn)') : 'var(--prin)' }" />
        </div>
        <span class="num">{{ (p * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><b>{{ (coverage * 100).toFixed(1) }}%</b><span>覆盖率（接受比例）</span></div>
      <div class="stat"><b>{{ Number.isNaN(acc) ? '—' : (acc * 100).toFixed(0) + '%' }}</b><span>接受集上的精度</span></div>
      <div class="stat"><b>{{ (baseAcc * 100).toFixed(1) }}%</b><span>不拒识时的精度</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      实心圆点标出真实类别。把阈值从 0 拉到 0.5，第 7 张（衬衫被误判成外套，置信度只有 41%）会被拒识，接受集精度升到 100%，代价是 12.5% 的样本要交给人看。医疗诊断里「没把握就转诊」用的就是这套逻辑——预测概率最高的类别，未必是应该直接采纳的决策。
    </p>
  </Widget>
</template>

<style scoped>
.rows { display: flex; flex-direction: column; gap: 5px; }
.row { display: flex; align-items: center; gap: 6px; }
.mark { flex: 0 0 10px; font-size: 9px; color: var(--accent); }
.name { flex: 0 0 52px; font-size: 12.5px; color: var(--ink-2); }
.row.truth .name { color: var(--accent); font-weight: 700; }
.bar { flex: 1; height: 13px; background: var(--bg2); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
.bar i { display: block; height: 100%; transition: width .15s; }
.num { flex: 0 0 50px; text-align: right; font-family: var(--vp-font-family-mono); font-size: 12px; font-variant-numeric: tabular-nums; }
</style>
