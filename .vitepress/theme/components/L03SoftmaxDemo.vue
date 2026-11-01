<script setup lang="ts">
import { ref, computed } from 'vue'

const names = ['猫', '鸡', '狗']
const o1 = ref(2.0)
const o2 = ref(1.0)
const o3 = ref(-0.5)
const T = ref(1)

const logits = computed(() => [o1.value, o2.value, o3.value])
const shifted = computed(() => {
  const o = logits.value
  const m = Math.max(...o)
  return o.map(v => Math.exp((v - m) / T.value))
})
const denom = computed(() => shifted.value.reduce((s, v) => s + v, 0))
const probs = computed(() => shifted.value.map(v => v / denom.value))
const top = computed(() => probs.value.indexOf(Math.max(...probs.value)))
const ent = computed(() => -probs.value.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0))

function reset() {
  o1.value = 2.0; o2.value = 1.0; o3.value = -0.5; T.value = 1
}
function bump() {
  o1.value += 5; o2.value += 5; o3.value += 5
}
function sharpen() {
  o1.value = 8; o2.value = 0; o3.value = -2
}
</script>

<template>
  <Widget title="softmax：把三个 logit 变成概率">
    <p class="widget-note">
      拖动三个未规范化的预测（logit），或者改温度 T。softmax 先取指数保证非负，再除以总和保证概率之和为 1；它只改变数值大小，不改变谁最大。
    </p>

    <div class="ctrl">
      <label>猫 o₁ <input v-model.number="o1" type="range" min="-4" max="8" step="0.1"><b>{{ o1.toFixed(1) }}</b></label>
      <label>鸡 o₂ <input v-model.number="o2" type="range" min="-4" max="8" step="0.1"><b>{{ o2.toFixed(1) }}</b></label>
      <label>狗 o₃ <input v-model.number="o3" type="range" min="-4" max="8" step="0.1"><b>{{ o3.toFixed(1) }}</b></label>
    </div>
    <div class="ctrl">
      <label>温度 T <input v-model.number="T" type="range" min="0.2" max="3" step="0.05"><b>{{ T.toFixed(2) }}</b></label>
      <button class="btn" type="button" @click="bump">全部 +5</button>
      <button class="btn" type="button" @click="sharpen">极端 logit</button>
      <button class="btn" type="button" @click="reset">重置</button>
    </div>

    <div class="rows">
      <div v-for="(p, i) in probs" :key="i" class="row">
        <span class="name" :class="{ win: i === top }">{{ names[i] }}</span>
        <div class="bar">
          <i :style="{ width: (p * 100).toFixed(1) + '%', background: i === top ? 'var(--accent)' : 'var(--prin)' }" />
        </div>
        <span class="num">{{ (p * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><b>{{ names[top] }}</b><span>argmax 预测</span></div>
      <div class="stat"><b>{{ (probs[top] * 100).toFixed(1) }}%</b><span>最大概率</span></div>
      <div class="stat"><b>{{ ent.toFixed(2) }}</b><span>分布熵（nat）</span></div>
      <div class="stat"><b>{{ T.toFixed(2) }}</b><span>温度 T</span></div>
    </div>

    <div class="out prose" style="margin-top:12px">
      max(o) = {{ Math.max(...logits).toFixed(1) }}，减去它后取指数：exp((o−max)/T) = [{{ shifted.map(v => v.toFixed(3)).join(', ') }}]，分母 = {{ denom.toFixed(3) }}
    </div>

    <p class="widget-note" style="margin-top:10px;margin-bottom:0">
      按「全部 +5」：三个 logit 同时平移，概率一点没变——softmax 对整体平移不变，这正是第 3.7.2 节「先减去最大值」的依据。把 T 调小，分布变尖（接近 one-hot）；调大则趋于均匀；但无论怎么调，argmax 始终不变。
    </p>
  </Widget>
</template>

<style scoped>
.rows { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.row { display: flex; align-items: center; gap: 10px; }
.name { flex: 0 0 42px; font-size: 13.5px; color: var(--ink-2); }
.name.win { color: var(--accent); font-weight: 700; }
.bar { flex: 1; height: 18px; background: var(--bg2); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
.bar i { display: block; height: 100%; transition: width .15s; }
.num { flex: 0 0 60px; text-align: right; font-family: var(--vp-font-family-mono); font-size: 13.5px; font-variant-numeric: tabular-nums; }
</style>
