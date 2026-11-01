<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const EPOCHS = 500
const VOCAB = 28 // 字符级时光机器词表大小，也是「瞎猜」的困惑度

// 示意曲线：按原书字符级 RNN 训练曲线的形状重绘（不是某次实验的原始数据）
const pplAt = (e: number) => 1.3 + 240 * Math.exp(-e / 40)

const epoch = ref(0)
const timer = ref<ReturnType<typeof setInterval> | null>(null)

const cur = computed(() => pplAt(epoch.value))
const ce = computed(() => Math.log(cur.value))
const ratio = computed(() => VOCAB / cur.value)

function tick() {
  epoch.value = Math.min(EPOCHS, epoch.value + 4)
  if (epoch.value >= EPOCHS) stop()
}
function play() {
  if (timer.value) { stop(); return }
  if (epoch.value >= EPOCHS) epoch.value = 0
  timer.value = setInterval(tick, 55)
}
function stop() {
  if (timer.value) { clearInterval(timer.value); timer.value = null }
}
function reset() { stop(); epoch.value = 0 }
onUnmounted(stop)

// 画布
const W = 600
const H = 232
const L = 50
const B = 32
const R = 14
const Tp = 14
const TOP = Math.log10(280)
const px = (e: number) => L + (e / EPOCHS) * (W - L - R)
const py = (p: number) => H - B - (Math.log10(p) / TOP) * (H - B - Tp)

const curve = computed(() => {
  const out: string[] = []
  for (let e = 0; e <= epoch.value; e += 2) {
    const p = pplAt(e)
    out.push(`${out.length ? 'L' : 'M'}${px(e).toFixed(1)},${py(p).toFixed(1)}`)
  }
  if (epoch.value % 2) out.push(`L${px(epoch.value).toFixed(1)},${py(pplAt(epoch.value)).toFixed(1)}`)
  return out.join(' ')
})

const yTicks = [1, 3, 10, 30, 100].map(v => ({ v, y: py(v) }))
const xTicks = [0, 100, 200, 300, 400, 500].map(v => ({ v, x: px(v) }))
</script>

<template>
  <Widget title="困惑度随训练下降：从 241 一路掉到 1.3 附近">
    <p class="widget-note">
      困惑度是平均交叉熵取指数，横轴是训练轮数，纵轴是对数刻度的困惑度。虚线是「在 28 个字符里均匀瞎猜」的基线——任何真在学的模型都必须掉到它下面。曲线为按原书训练曲线形状重绘的示意，不是某次实验的原始记录。
    </p>

    <div class="ctrl">
      <button class="btn primary" type="button" @click="play">{{ timer ? '暂停' : '播放训练' }}</button>
      <button class="btn" type="button" @click="reset">回到第 0 轮</button>
      <label>轮数
        <input v-model.number="epoch" type="range" min="0" :max="EPOCHS" step="1" @input="stop">
        <b>{{ epoch }}</b>
      </label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;max-width:600px">
      <line :x1="L" :y1="H - B" :x2="W - R" :y2="H - B" style="stroke:var(--line)" />
      <line :x1="L" :y1="Tp" :x2="L" :y2="H - B" style="stroke:var(--line)" />
      <g v-for="t in yTicks" :key="'y' + t.v">
        <line :x1="L - 4" :y1="t.y" :x2="L" :y2="t.y" style="stroke:var(--line)" />
        <text :x="L - 7" :y="t.y + 4" text-anchor="end" style="fill:var(--ink-3);font-size:11">{{ t.v }}</text>
      </g>
      <g v-for="t in xTicks" :key="'x' + t.v">
        <text :x="t.x" :y="H - B + 16" text-anchor="middle" style="fill:var(--ink-3);font-size:11">{{ t.v }}</text>
      </g>
      <text :x="L - 34" :y="Tp - 3" style="fill:var(--ink-3);font-size:11">困惑度</text>
      <text :x="W - R" :y="H - 6" text-anchor="end" style="fill:var(--ink-3);font-size:11">训练轮数</text>

      <line :x1="L" :y1="py(VOCAB)" :x2="W - R" :y2="py(VOCAB)" style="stroke:var(--warn);stroke-width:1;stroke-dasharray:4 4;opacity:.7" />
      <text :x="W - R - 2" :y="py(VOCAB) - 5" text-anchor="end" style="fill:var(--warn);font-size:11">瞎猜基线 28</text>

      <path :d="curve" style="stroke:var(--accent);stroke-width:2.2;fill:none" />
      <circle :cx="px(epoch)" :cy="py(cur)" r="3.5" style="fill:var(--accent)" />
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ epoch }}</b><span>已训练轮数</span></div>
      <div class="stat"><b>{{ cur.toFixed(2) }}</b><span>困惑度</span></div>
      <div class="stat"><b>{{ ce.toFixed(2) }}</b><span>平均交叉熵（nats/字符）</span></div>
      <div class="stat"><b>{{ ratio.toFixed(0) }}×</b><span>比瞎猜好多少倍</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      前期掉得极快（把「字符频率」学会就够了），一百轮以后开始挤牙膏：剩下的不确定性不是模型笨，而是文本本身就有多种合法续写。困惑度 1.3 意味着模型平均只在 1.3 个候选之间有犹豫——这也是原书最后能续写出 "time traveller held in his hand was a glitteringmetallic framewo" 这种句子的原因。
    </p>
  </Widget>
</template>
