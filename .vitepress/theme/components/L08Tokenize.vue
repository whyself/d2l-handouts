<script setup lang="ts">
import { ref, computed } from 'vue'

// 时光机器开头几行（已去标点、转小写），够建一个几十项的词表
const CORPUS = [
  'the time traveller for so it will be convenient to speak of him was expounding a recondite matter to us',
  'his pale grey eyes shone and twinkled and his usually pale face was flushed and animated',
  'the fire burnt brightly and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses',
  'our chairs being his patents embraced and caressed us rather than submitted to be sat upon',
  'and he put it to us in this way marking the points with a lean forefinger as we sat and lazily admired his earnestness'
]

const text = ref('time traveller')
const mode = ref<'char' | 'word'>('char')
const minFreq = ref(1)

const corpusTokens = computed(() => {
  const out: string[] = []
  for (const line of CORPUS) {
    if (mode.value === 'word') out.push(...line.split(/\s+/).filter(Boolean))
    else out.push(...line.split(''))
  }
  return out
})

// 和原书 Vocab 一致：索引 0 固定给 <unk>，其余按频次降序，频次低于 min_freq 的裁掉
const vocab = computed(() => {
  const counter = new Map<string, number>()
  for (const t of corpusTokens.value) counter.set(t, (counter.get(t) || 0) + 1)
  const sorted = [...counter.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  const idxToToken = ['<unk>']
  const tokenToIdx = new Map<string, number>([['<unk>', 0]])
  for (const [tok, f] of sorted) {
    if (f < minFreq.value) break
    if (!tokenToIdx.has(tok)) {
      idxToToken.push(tok)
      tokenToIdx.set(tok, idxToToken.length - 1)
    }
  }
  return { idxToToken, tokenToIdx, freqs: sorted }
})

const tokens = computed(() => {
  const s = text.value
  if (mode.value === 'word') return s.trim().split(/\s+/).filter(Boolean)
  return s.split('')
})

const indices = computed(() => tokens.value.map(t => vocab.value.tokenToIdx.get(t) ?? 0))
const oov = computed(() => tokens.value.filter(t => !vocab.value.tokenToIdx.has(t)).length)
const show = (tok: string) => (tok === ' ' ? '␣' : tok)
const preview = computed(() => vocab.value.idxToToken.slice(0, 14))
</script>

<template>
  <Widget title="分词、词表与 &lt;unk&gt;：字符串怎么变成索引">
    <p class="widget-note">
      语料是《时光机器》开头几行。换切法、改阈值，看同一句话被切成什么、又落到哪些索引上。切法选「字符」时，空格也是一个词元——这正是原书字符级词表里那 28 项的来源。
    </p>

    <div class="ctrl">
      <div class="seg">
        <button type="button" :class="{ on: mode === 'char' }" @click="mode = 'char'">按字符切</button>
        <button type="button" :class="{ on: mode === 'word' }" @click="mode = 'word'">按单词切</button>
      </div>
      <label>min_freq
        <input v-model.number="minFreq" type="range" min="1" max="4" step="1">
        <b>{{ minFreq }}</b>
      </label>
    </div>

    <div class="ctrl">
      <textarea v-model="text" rows="2" placeholder="输入一句话，看它被切成什么"></textarea>
    </div>

    <div class="out" style="margin-bottom:10px">
      <span class="lbl">词元</span>{{ tokens.map(show).join(' · ') || '（空）' }}
    </div>
    <div class="out" style="margin-bottom:10px">
      <span class="lbl">索引</span>{{ indices.join(' ') || '（空）' }}
    </div>

    <div class="stats">
      <div class="stat"><b>{{ vocab.idxToToken.length }}</b><span>词表大小 len(vocab)</span></div>
      <div class="stat"><b>{{ oov }}</b><span>映射到 &lt;unk&gt; 的词元</span></div>
      <div class="stat"><b>{{ corpusTokens.length }}</b><span>语料词元总数</span></div>
      <div class="stat"><b>{{ vocab.freqs[0]?.[1] ?? 0 }}</b><span>最高频词元出现次数</span></div>
    </div>

    <p class="widget-note" style="margin:6px 0 4px">词表前 14 项（索引: 词元）</p>
    <div class="chips">
      <span v-for="(tok, i) in preview" :key="i" class="vchip">
        <em>{{ i }}</em>{{ show(tok) }}
      </span>
    </div>

    <p class="widget-note" style="margin:10px 0 0">
      把「按单词切」和 min_freq 调大，词表会骤减、更多词元掉进索引 0；换回「按字符切」，词表又缩到二三十项，但一句话变成几十个时间步。这就是文本预处理里那对老矛盾：词表大小与序列长度，二者只能选一个舒服的位置。
    </p>
  </Widget>
</template>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.vchip {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 13px;
  font-family: var(--vp-font-family-mono); border: 1px solid var(--line); border-radius: 6px; background: var(--vp-c-bg);
}
.vchip em { font-style: normal; font-size: 11px; color: var(--ink-3); }
</style>
