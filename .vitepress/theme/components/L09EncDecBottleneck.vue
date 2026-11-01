<script setup lang="ts">
import { ref, computed } from 'vue'

// 一个粗粒度的“信息量”示意：每个词元用 32 维嵌入进入编码器，而 c 只有 h 个数。
const L = ref(8)
const h = ref(16)
const EMB = 32

const inNums = computed(() => L.value * EMB)
const ratio = computed(() => h.value / inNums.value)
const perTok = computed(() => h.value / L.value)

const grade = computed(() => {
  const r = ratio.value
  if (r > 0.4) return { k: 'ok', t: 'c 相对宽裕' }
  if (r > 0.12) return { k: 'mid', t: 'c 偏紧' }
  return { k: 'bad', t: 'c 是硬瓶颈' }
})

const W = 470
const H = 226
const boxW = computed(() => Math.min(32, (W - 40) / L.value - 4))
const inX = (i: number) => 20 + i * (boxW.value + 4)
const outX = (i: number) => 20 + i * (boxW.value + 4)
const cx = W / 2

const bar = (v: number, max: number) => (v / max) * 100
const maxV = computed(() => Math.max(inNums.value, h.value))
</script>

<template>
  <Widget title="编码器-解码器：那个定长的瓶颈">
    <p class="widget-note">
      输入长度可以变，但交给解码器的上下文 c 永远是同样的 h 个数。调一调句子长度和隐藏单元数，看“压缩率”怎么变。
    </p>

    <div class="ctrl">
      <label>输入词元数
        <input v-model.number="L" type="range" min="3" max="12" step="1"><b>{{ L }}</b>
      </label>
      <label>隐藏单元数 h
        <input v-model.number="h" type="range" min="2" max="42" step="2"><b>{{ h }}</b>
      </label>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <text :x="20" :y="14" style="fill:var(--ink-3);font-size:11">输入序列（{{ L }} 个词元，各 32 维）</text>
      <g v-for="i in L" :key="'i' + i">
        <rect :x="inX(i - 1)" y="22" :width="boxW" height="26" rx="4"
              style="fill:var(--prin-bg);stroke:var(--prin)" />
        <text :x="inX(i - 1) + boxW / 2" y="39" text-anchor="middle"
              style="fill:var(--prin);font-size:11">x{{ i }}</text>
      </g>

      <path :d="`M ${cx - 60} 52 L ${cx - 26} 84`" style="stroke:var(--line);stroke-width:1.5;fill:none" />
      <path :d="`M ${cx + 60} 52 L ${cx + 26} 84`" style="stroke:var(--line);stroke-width:1.5;fill:none" />
      <rect :x="cx - 46" y="84" width="92" height="44" rx="8"
            style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2" />
      <text :x="cx" y="104" text-anchor="middle" style="fill:var(--accent);font-size:14px;font-weight:700">c</text>
      <text :x="cx" y="120" text-anchor="middle" style="fill:var(--ink-2);font-size:11">{{ h }} 个数（定长）</text>

      <path :d="`M ${cx - 40} 130 L ${cx - 30} 158`" style="stroke:var(--line);stroke-width:1.5;fill:none" />
      <path :d="`M ${cx + 40} 130 L ${cx + 30} 158`" style="stroke:var(--line);stroke-width:1.5;fill:none" />

      <text :x="20" :y="154" style="fill:var(--ink-3);font-size:11">输出序列（逐词元生成）</text>
      <g v-for="i in L" :key="'o' + i">
        <rect :x="outX(i - 1)" y="160" :width="boxW" height="26" rx="4"
              style="fill:var(--ex-bg);stroke:var(--ex)" />
        <text :x="outX(i - 1) + boxW / 2" y="177" text-anchor="middle"
              style="fill:var(--ex);font-size:11">y{{ i }}</text>
      </g>

      <text :x="20" :y="210" style="fill:var(--ink-3);font-size:11">信息量对比（线性刻度）</text>
      <rect :x="132" y="200" width="240" height="8" rx="4" style="fill:var(--bg2);stroke:var(--line)" />
      <rect :x="132" y="200" :width="240 * bar(inNums, maxV) / 100" height="8" rx="4" style="fill:var(--prin)" />
      <rect :x="132" y="212" width="240" height="8" rx="4" style="fill:var(--bg2);stroke:var(--line)" />
      <rect :x="132" y="212" :width="240 * bar(h, maxV) / 100" height="8" rx="4" style="fill:var(--accent)" />
      <text :x="378" y="207" style="fill:var(--prin);font-size:10">输入 {{ inNums }}</text>
      <text :x="378" y="219" style="fill:var(--accent);font-size:10">c {{ h }}</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ (ratio * 100).toFixed(1) }}%</b><span>压缩率 h / (32·L)</span></div>
      <div class="stat"><b>{{ perTok.toFixed(1) }}</b><span>每个输出词元分到的 c 维度</span></div>
      <div class="stat"><b>{{ grade.t }}</b><span>当前判断</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      <template v-if="grade.k === 'bad'">
        句子一长、c 又小，编码器就必须在“记住哪些词”之间做取舍，长句翻译质量会明显掉——这就是定长瓶颈。
      </template>
      <template v-else>
        c 还能撑住，但注意：解码器在生成<b>每一个</b>词时看到的都是同一个 c，它并不知道此刻该重点看输入里的哪个词。
      </template>
      第 10 章的注意力机制把“一个定长 c”换成“按需加权的一整排编码状态”，瓶颈就没了。
    </p>
  </Widget>
</template>
