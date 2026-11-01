<script setup lang="ts">
import { ref, computed } from 'vue'

// 原书例子：分类器说「80% 不是毒蘑菇」，那到底吃不吃？
const p = ref(0.2)      // 是毒蘑菇的概率
const death = ref(2000) // 吃错一次的损失（原书视作 ∞，这里给一个可调的有限值）
const discard = 1       // 丢掉的损失

const eatLoss = computed(() => p.value * death.value)
const dropLoss = computed(() => (1 - p.value) * discard)
const eat = computed(() => eatLoss.value < dropLoss.value)
const scale = computed(() => Math.max(eatLoss.value, dropLoss.value, 1))

const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(2))
</script>

<template>
  <Widget title="概率不等于决策：算一算吃蘑菇的期望损失">
    <p class="widget-note">
      分类器只给出「是毒蘑菇的概率」。要吃还是要丢，得把概率乘上后果。拖一拖，看看在什么情况下「吃」才会变得划算。
    </p>

    <div class="ctrl">
      <label>P(毒) <input v-model.number="p" type="range" min="0" max="1" step="0.01"><b>{{ (p * 100).toFixed(0) }}%</b></label>
      <label>死亡损失 <input v-model.number="death" type="range" min="0" max="2000" step="50"><b>{{ death }}</b></label>
    </div>

    <div class="rows">
      <div class="row">
        <span class="name">吃下去</span>
        <div class="bar"><i :style="{ width: (eatLoss / scale) * 100 + '%', background: 'var(--warn)' }" /></div>
        <span class="num">{{ fmt(eatLoss) }}</span>
      </div>
      <div class="row">
        <span class="name">丢掉</span>
        <div class="bar"><i :style="{ width: (dropLoss / scale) * 100 + '%', background: 'var(--ex)' }" /></div>
        <span class="num">{{ fmt(dropLoss) }}</span>
      </div>
    </div>

    <div class="out prose" style="margin-top:12px">
      吃：{{ (p * 100).toFixed(0) }}% × {{ death }} + {{ (100 - p * 100).toFixed(0) }}% × 0 = <b>{{ fmt(eatLoss) }}</b>
      <br>
      丢：{{ (p * 100).toFixed(0) }}% × 0 + {{ (100 - p * 100).toFixed(0) }}% × 1 = <b>{{ fmt(dropLoss) }}</b>
    </div>

    <p class="widget-note" :class="eat ? '' : 'bad-c'" style="margin-top:10px;margin-bottom:0">
      <b>{{ eat ? '结论：吃。' : '结论：丢掉。' }}</b>
      原书把死亡损失当作无穷大，所以哪怕 P(毒) 只有 0.2，期望损失也是 ∞，永远不该吃。把右边的滑块拉到很小的值，你就能看到「期望损失」如何随后果而变化。
    </p>
  </Widget>
</template>

<style scoped>
.rows { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.row { display: flex; align-items: center; gap: 10px; }
.name { flex: 0 0 56px; font-size: 13.5px; color: var(--ink-2); }
.bar { flex: 1; height: 16px; background: var(--bg2); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
.bar i { display: block; height: 100%; transition: width .2s; }
.num { flex: 0 0 52px; text-align: right; font-family: var(--vp-font-family-mono); font-size: 13.5px; font-variant-numeric: tabular-nums; }
</style>
