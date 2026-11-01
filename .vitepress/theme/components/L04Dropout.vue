<script setup lang="ts">
import { ref, computed } from 'vue'

const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453
  return s - Math.floor(s)
}

const H0 = Array.from({ length: 16 }, (_, i) => 0.35 + rnd(i + 21) * 1.5)

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const p = ref(0.5)
const seed = ref(1)
const training = ref(true)

const mask = computed(() => {
  const r = rng(seed.value)
  return H0.map(() => (r() > p.value ? 1 : 0))
})

const scaled = computed(() => H0.map((v, i) => (p.value >= 1 ? 0 : (mask.value[i] * v) / (1 - p.value))))

const kept = computed(() => mask.value.reduce((s, m) => s + m, 0))
const meanOrig = H0.reduce((s, v) => s + v, 0) / H0.length
const meanTrain = computed(() => scaled.value.reduce((s, v) => s + v, 0) / H0.length)
const scaleFactor = computed(() => (p.value >= 1 ? 0 : 1 / (1 - p.value)))

const cellStyle = (on: boolean) =>
  `padding:4px 0;text-align:center;border-radius:6px;font:12.5px var(--vp-font-family-mono);` +
  `border:1px solid ${on ? 'var(--line)' : 'var(--line-2)'};` +
  `background:${on ? 'var(--paper)' : 'var(--bg2)'};` +
  `color:${on ? 'var(--ink)' : 'var(--ink-3)'};` +
  `text-decoration:${on ? 'none' : 'line-through'}`
</script>

<template>
  <Widget title="暂退法：训练时丢一半并放大，推理时一个都不丢">
    <p class="widget-note">
      16 个隐藏单元的活性值。训练时每个单元以概率 p 被置零，保留下来的值除以 (1 − p)，使期望不变；推理（测试）时不丢弃任何单元，也不缩放。
    </p>

    <div class="ctrl">
      <label>
        暂退概率 p
        <input v-model.number="p" type="range" min="0" max="0.9" step="0.05" />
        <b>{{ p.toFixed(2) }}</b>
      </label>
      <div class="seg">
        <button type="button" :class="{ on: training }" @click="training = true">训练模式</button>
        <button type="button" :class="{ on: !training }" @click="training = false">推理模式</button>
      </div>
      <button class="btn" type="button" @click="seed++">重新采样掩码</button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(16, minmax(0, 1fr)); gap: 4px; margin: 6px 0">
      <div v-for="(v, i) in H0" :key="'o' + i" :style="cellStyle(true)">{{ v.toFixed(2) }}</div>
    </div>
    <div
      style="display: grid; grid-template-columns: repeat(16, minmax(0, 1fr)); gap: 4px; margin: 6px 0"
      :style="{ opacity: training ? 1 : 0.45 }"
    >
      <div v-for="(v, i) in mask" :key="'m' + i" :style="cellStyle(v === 1)">
        {{ v === 1 ? '✓' : '0' }}
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(16, minmax(0, 1fr)); gap: 4px; margin: 6px 0">
      <div
        v-for="(v, i) in scaled"
        :key="'s' + i"
        :style="cellStyle(training ? mask[i] === 1 : true)"
      >
        {{ (training ? v : H0[i]).toFixed(2) }}
      </div>
    </div>

    <div class="stats">
      <div class="stat"><b>{{ training ? kept + ' / 16' : '16 / 16' }}</b><span>被保留的单元</span></div>
      <div class="stat"><b>{{ training ? scaleFactor.toFixed(2) : '1.00' }}</b><span>保留值的放大倍数</span></div>
      <div class="stat"><b>{{ meanOrig.toFixed(3) }}</b><span>原始平均活性值</span></div>
      <div class="stat">
        <b>{{ (training ? meanTrain : meanOrig).toFixed(3) }}</b><span>当前输出平均活性值</span>
      </div>
    </div>

    <p class="widget-note ok-c" style="margin-bottom: 0">
      {{
        training
          ? `注意第三行：保留下来的是原值 × ${scaleFactor.toFixed(2)}。这样即使有一半单元被丢掉，整层的期望仍然等于原始均值——这就是“无偏”的含义。`
          : '推理模式下不做丢弃、不做缩放：把训练时学到的那一堆“子网络”的期望行为一次性用满。'
      }}
    </p>
  </Widget>
</template>
