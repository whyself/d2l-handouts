<script setup lang="ts">
import { ref, computed } from 'vue'

const tokens = ['time', 'traveller', 'you', 'can', 'show', 'black']
const pos = ref(2)
const bidir = ref(true)

const CW = 74
const GAP = 10
const OX = 18
const W = OX * 2 + tokens.length * CW + (tokens.length - 1) * GAP
const H = 150
const px = (i: number) => OX + i * (CW + GAP)

const seenPast = computed(() => pos.value + 1)
const seenFuture = computed(() => (bidir.value ? tokens.length - 1 - pos.value : 0))
const leak = computed(() => bidir.value && seenFuture.value > 0)
</script>

<template>
  <Widget title="双向 RNN 的偷看：训练时看得见未来，推理时看不见">
    <p class="widget-note">
      点任意词元，看这一刻的输出能用上哪些输入。训练（双向）时反向层已经把右边的词读完了；推理时右边根本还不存在。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button type="button" :class="{ on: bidir }" @click="bidir = true">训练 / 整句编码（双向）</button>
        <button type="button" :class="{ on: !bidir }" @click="bidir = false">推理 / 预测下一个词（单向）</button>
      </div>
    </div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" style="max-width:100%">
      <!-- 前向箭头 -->
      <g v-for="i in tokens.length - 1" :key="'f' + i">
        <line v-if="i - 1 < pos" :x1="px(i - 1) + CW - 6" :y1="42" :x2="px(i) + 6" :y2="42"
              style="stroke:var(--prin);stroke-width:2.5" />
        <text v-if="i - 1 < pos" :x="px(i) - 3" :y="38" text-anchor="middle"
              style="fill:var(--prin);font-size:13">→</text>
      </g>
      <!-- 反向箭头 -->
      <g v-for="i in tokens.length - 1" :key="'b' + i">
        <line v-if="bidir && i - 1 >= pos" :x1="px(i) + 6" :y1="112" :x2="px(i - 1) + CW - 6" :y2="112"
              style="stroke:var(--ex);stroke-width:2.5" />
        <text v-if="bidir && i - 1 >= pos" :x="px(i - 1) + CW - 3" :y="124" text-anchor="middle"
              style="fill:var(--ex);font-size:13">←</text>
      </g>

      <g v-for="(w, i) in tokens" :key="'t' + i">
        <rect :x="px(i)" :y="56" :width="CW" :height="42" rx="7"
              :style="{
                fill: i <= pos ? 'var(--prin-bg)' : (bidir ? 'var(--ex-bg)' : 'var(--bg2)'),
                stroke: i === pos ? 'var(--warn)' : (bidir || i <= pos ? 'var(--line)' : 'var(--line-2)'),
                strokeWidth: i === pos ? '2.5' : '1',
                strokeDasharray: !bidir && i > pos ? '4 4' : 'none',
                cursor: 'pointer',
                opacity: !bidir && i > pos ? '0.45' : '1'
              }"
              @click="pos = i" />
        <text :x="px(i) + CW / 2" :y="82" text-anchor="middle"
              :style="{ fill: !bidir && i > pos ? 'var(--ink-3)' : 'var(--ink)', fontSize: '12.5px', pointerEvents: 'none' }">
          {{ w }}
        </text>
      </g>
      <text :x="OX" :y="24" style="fill:var(--ink-3);font-size:11">第 {{ pos + 1 }} 个词元的输出</text>
      <text :x="OX" :y="146" style="fill:var(--ink-3);font-size:11">← 反向层（未来 → 过去）：{{ bidir ? '可用' : '推理时不可用' }}</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ seenPast }}</b><span>可见的过去词元</span></div>
      <div class="stat"><b>{{ seenFuture }}</b><span>可见的未来词元</span></div>
      <div class="stat"><b>{{ leak ? '有泄露' : '无泄露' }}</b><span>当前设置</span></div>
    </div>

    <div class="out prose" style="margin-top:4px">
      <span class="lbl">原文实测（双向 LSTM 当语言模型用）</span>
      perplexity 1.1，但生成结果：
      <br><code>time travellerererererererererererererererererererererererererer</code>
    </div>

    <p class="widget-note" style="margin:8px 0 0">
      <template v-if="leak">
        训练时每个位置的反向层都读到了右边的词，模型可以“抄答案”，所以困惑度漂亮得离谱。
      </template>
      <template v-else>
        单向时右边是空的：模型只能靠历史预测，这才是语言模型允许的设定——也正是上一步那串 “ererer…” 暴露问题的地方。
      </template>
    </p>
  </Widget>
</template>
