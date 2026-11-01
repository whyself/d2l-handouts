<script setup lang="ts">
import { ref, computed } from 'vue'

type Case = {
  key: string
  name: string
  inputName: string
  outputName: string
  input: number
  output: number
  example: string
  note: string
}

const cases: Case[] = [
  {
    key: 'tag',
    name: '标记与解析',
    inputName: '词',
    outputName: '标签',
    input: 7,
    output: 7,
    example: 'Tom has dinner in Washington with Sally',
    note: '输入和输出的数量基本相同，一对一打标签。'
  },
  {
    key: 'asr',
    name: '自动语音识别',
    inputName: '音频帧',
    outputName: '词',
    input: 16000,
    output: 8,
    example: '“-D-e-e-p- L-ea-r-ni-ng-” → deep learning',
    note: '输出比输入短得多：几千帧才对应一个词。'
  },
  {
    key: 'tts',
    name: '文本到语音',
    inputName: '词',
    outputName: '音频帧',
    input: 8,
    output: 16000,
    example: 'deep learning → 一段 1 秒的语音',
    note: '输出比输入长得多，方向正好反过来。'
  },
  {
    key: 'mt',
    name: '机器翻译',
    inputName: '德语词',
    outputName: '英语词',
    input: 8,
    output: 9,
    example: 'Haben Sie … angeschaut? → Did you … check out?',
    note: '数量未必相等，顺序还会被打乱：动词在德语里常被放到句尾。'
  }
]

const active = ref(0)
const cur = computed(() => cases[active.value])

// 用对数刻度把 8 与 16000 画在同一根轴上
const width = (n: number) => 18 + (Math.log10(n) / Math.log10(20000)) * 82
</script>

<template>
  <Widget title="输入与输出谁更长：四类序列任务">
    <p class="widget-note">
      序列学习的关键差别，就在输入和输出的长度关系上。切换任务，看两根长度条的比例（对数刻度）。
    </p>

    <div class="seg" style="margin-bottom:12px">
      <button v-for="(c, i) in cases" :key="c.key" type="button" :class="{ on: active === i }" @click="active = i">
        {{ c.name }}
      </button>
    </div>

    <div class="io">
      <div class="side">
        <span class="cap">输入 · {{ cur.inputName }}</span>
        <div class="track"><i :style="{ width: width(cur.input) + '%', background: 'var(--prin)' }" /></div>
        <span class="val">{{ cur.input.toLocaleString() }}</span>
      </div>
      <div class="side">
        <span class="cap">输出 · {{ cur.outputName }}</span>
        <div class="track"><i :style="{ width: width(cur.output) + '%', background: 'var(--accent)' }" /></div>
        <span class="val">{{ cur.output.toLocaleString() }}</span>
      </div>
    </div>

    <div class="out prose" style="margin-top:12px">{{ cur.example }}</div>
    <p class="widget-note" style="margin:8px 0 0">{{ cur.note }}</p>
  </Widget>
</template>

<style scoped>
.io { display: flex; flex-direction: column; gap: 10px; }
.side { display: flex; align-items: center; gap: 10px; }
.cap { flex: 0 0 108px; font-size: 13px; color: var(--ink-2); }
.track { flex: 1; height: 14px; background: var(--bg2); border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
.track i { display: block; height: 100%; transition: width .25s; }
.val { flex: 0 0 56px; text-align: right; font-family: var(--vp-font-family-mono); font-size: 13px; font-variant-numeric: tabular-nums; }
@media (max-width: 640px) { .cap { flex-basis: 84px; font-size: 12px; } }
</style>
