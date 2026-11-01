<script setup lang="ts">
import { ref, computed } from 'vue'

// 原书表 1.5.1 的六行数据（数值已换算成字节 / 浮点运算次数 / 样本条数）
const rows = [
  { year: 1970, name: '鸢尾花卉', data: 1e2, mem: 1e3, flops: 1e5, chip: 'Intel 8080' },
  { year: 1980, name: '波士顿房价', data: 1e3, mem: 1e5, flops: 1e6, chip: 'Intel 80186' },
  { year: 1990, name: '光学字符识别', data: 1e4, mem: 1e7, flops: 1e7, chip: 'Intel 80486' },
  { year: 2000, name: '网页', data: 1e7, mem: 1e8, flops: 1e9, chip: 'Intel Core' },
  { year: 2010, name: '广告', data: 1e10, mem: 1e9, flops: 1e12, chip: 'Nvidia C2050' },
  { year: 2020, name: '社交网络', data: 1e12, mem: 1e11, flops: 1e15, chip: 'Nvidia DGX-2' }
]

const metrics = [
  { key: 'data', label: '数据规模', unit: '条', color: 'var(--accent)' },
  { key: 'mem', label: '内存', unit: '字节', color: 'var(--prin)' },
  { key: 'flops', label: '算力', unit: 'FLOPS', color: 'var(--ex)' }
] as const

const metric = ref<'data' | 'mem' | 'flops'>('data')
const cur = computed(() => metrics.find(m => m.key === metric.value)!)
const pick = (r: typeof rows[number]) => r[metric.value]

const MAXLOG = 17
const width = (v: number) => Math.max(4, (Math.log10(v) / MAXLOG) * 100)
const growth = computed(() => (pick(rows[5]) / pick(rows[0])))

const fmt = (v: number) => {
  if (v >= 1e12) return (v / 1e12).toFixed(0) + ' T'
  if (v >= 1e9) return (v / 1e9).toFixed(0) + ' G'
  if (v >= 1e6) return (v / 1e6).toFixed(0) + ' M'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + ' K'
  return String(v)
}
</script>

<template>
  <Widget title="五十年间数据、内存与算力的赛跑">
    <p class="widget-note">
      表 1.5.1 的六个十年。注意每根条都是对数刻度——它是成倍增长的，画成线性你会看不清 1970 年的那一行。
    </p>

    <div class="seg" style="margin-bottom:12px">
      <button v-for="m in metrics" :key="m.key" type="button" :class="{ on: metric === m.key }" @click="metric = m.key">
        {{ m.label }}
      </button>
    </div>

    <div class="rows">
      <div v-for="r in rows" :key="r.year" class="row">
        <span class="yr">{{ r.year }}</span>
        <span class="nm">{{ r.name }}</span>
        <div class="track">
          <i :style="{ width: width(pick(r)) + '%', background: cur.color }" />
        </div>
        <span class="val">{{ fmt(pick(r)) }} {{ cur.unit }}</span>
      </div>
    </div>

    <div class="stats" style="margin-top:14px">
      <div class="stat"><b>×{{ growth >= 1e6 ? (growth / 1e6).toFixed(0) + 'M' : growth >= 1e3 ? (growth / 1e3).toFixed(0) + 'K' : growth.toFixed(0) }}</b><span>1970 → 2020 增长倍数</span></div>
      <div class="stat"><b>{{ rows[5].chip }}</b><span>2020 年的算力硬件</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      内存没跟上数据的增长——所以模型要提高内存效率；算力增长得比数据还快——所以「多算一会儿、把参数调得更好」变得划算。这两句话合起来，就是深度学习在 2010 年前后起飞的算术原因。
    </p>
  </Widget>
</template>

<style scoped>
.rows { display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; align-items: center; gap: 8px; }
.yr { flex: 0 0 34px; font: 12px var(--vp-font-family-mono); color: var(--ink-3); }
.nm { flex: 0 0 84px; font-size: 12.5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.track { flex: 1; height: 13px; background: var(--bg2); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
.track i { display: block; height: 100%; transition: width .25s; }
.val { flex: 0 0 96px; text-align: right; font: 11.5px var(--vp-font-family-mono); color: var(--ink-2); font-variant-numeric: tabular-nums; }
@media (max-width: 640px) { .nm { display: none; } .val { flex-basis: 80px; } }
</style>
