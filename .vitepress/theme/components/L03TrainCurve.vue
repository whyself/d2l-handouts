<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ---------- 确定性数据：3 个高斯簇，2 维特征 ----------
function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
function gauss(r: () => number) {
  const u = Math.max(r(), 1e-9)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}
const centers = [[-1.1, -0.7], [1.2, -0.5], [0.1, 1.5]]
const pal = ['var(--accent)', 'var(--prin)', 'var(--ex)']

function makeSet(per: number, seed: number) {
  const r = lcg(seed)
  const X: number[][] = [], Y: number[] = []
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < per; i++) {
      X.push([centers[c][0] + gauss(r) * 0.5, centers[c][1] + gauss(r) * 0.5])
      Y.push(c)
    }
  }
  return { X, Y }
}
const train = makeSet(80, 20240301)
const test = makeSet(40, 987654321)

function withNoise(base: number[], ratio: number, seed: number) {
  if (!ratio) return base.slice()
  const r = lcg(seed)
  const y = base.slice()
  const k = Math.round(base.length * ratio)
  const used = new Set<number>()
  while (used.size < k) {
    const i = Math.floor(r() * base.length)
    if (used.has(i)) continue
    used.add(i)
    y[i] = (y[i] + 1 + Math.floor(r() * 2)) % 3
  }
  return y
}
const labelSets: Record<string, number[]> = {
  '0': train.Y,
  '0.1': withNoise(train.Y, 0.1, 11),
  '0.25': withNoise(train.Y, 0.25, 22),
}
const testLabelSets: Record<string, number[]> = {
  '0': test.Y,
  '0.1': withNoise(test.Y, 0.1, 33),
  '0.25': withNoise(test.Y, 0.25, 44),
}

// ---------- 模型与训练 ----------
const MAXE = 30
let W = [[0, 0, 0], [0, 0, 0]]
let b = [0, 0, 0]
const epoch = ref(0)
const tick = ref(0)
const lr = ref(0.2)
const batch = ref(32)
const noise = ref(0)
const running = ref(false)
const trainLoss = ref<number[]>([])
const testLoss = ref<number[]>([])
const trainAcc = ref(0)
const testAcc = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const labels = computed(() => labelSets[String(noise.value)] ?? train.Y)
const testLabels = computed(() => testLabelSets[String(noise.value)] ?? test.Y)

function softmax(z: number[]) {
  const m = Math.max(...z)
  const e = z.map(v => Math.exp(v - m))
  const s = e.reduce((a, v) => a + v, 0)
  return e.map(v => v / s)
}

function scores(x: number[]) {
  return [0, 1, 2].map(k => W[0][k] * x[0] + W[1][k] * x[1] + b[k])
}

function evaluate(X: number[][], Y: number[]) {
  let loss = 0, ok = 0
  for (let i = 0; i < X.length; i++) {
    const z = scores(X[i])
    const m = Math.max(...z)
    const lse = m + Math.log(z.reduce((s, v) => s + Math.exp(v - m), 0))
    loss += lse - z[Y[i]]
    if (z.indexOf(m) === Y[i]) ok++
  }
  return { loss: loss / X.length, acc: ok / X.length }
}

function trainEpoch() {
  if (epoch.value >= MAXE) return
  const n = train.X.length
  const r = lcg(1000 + epoch.value * 37)
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const y = labels.value
  const B = batch.value
  for (let s = 0; s < n; s += B) {
    const idx = order.slice(s, s + B)
    const gW = [[0, 0, 0], [0, 0, 0]]
    const gb = [0, 0, 0]
    for (const i of idx) {
      const x = train.X[i]
      const p = softmax(scores(x))
      for (let k = 0; k < 3; k++) {
        const d = p[k] - (y[i] === k ? 1 : 0)
        gW[0][k] += d * x[0]
        gW[1][k] += d * x[1]
        gb[k] += d
      }
    }
    for (let k = 0; k < 3; k++) {
      W[0][k] -= lr.value * gW[0][k] / idx.length
      W[1][k] -= lr.value * gW[1][k] / idx.length
      b[k] -= lr.value * gb[k] / idx.length
    }
  }
  epoch.value++
  const tr = evaluate(train.X, labels.value)
  const te = evaluate(test.X, testLabels.value)
  trainLoss.value = [...trainLoss.value, tr.loss]
  testLoss.value = [...testLoss.value, te.loss]
  trainAcc.value = tr.acc
  testAcc.value = te.acc
  tick.value++
  if (epoch.value >= MAXE) stop()
}

function reset() {
  stop()
  W = [[0, 0, 0], [0, 0, 0]]
  b = [0, 0, 0]
  epoch.value = 0
  trainLoss.value = []
  testLoss.value = []
  trainAcc.value = 0
  testAcc.value = 0
  tick.value++
}
function toggle() {
  if (running.value) return stop()
  if (epoch.value >= MAXE) reset()
  running.value = true
  timer = setInterval(trainEpoch, 320)
}
function stop() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}
onUnmounted(stop)

// ---------- 决策区域 ----------
const PW = 300, PH = 232, PAD = 22
const xmin = -2.3, xmax = 2.3, ymin = -2.1, ymax = 2.5
const sx = (x: number) => PAD + ((x - xmin) / (xmax - xmin)) * (PW - PAD * 2)
const sy = (y: number) => PH - PAD - ((y - ymin) / (ymax - ymin)) * (PH - PAD * 2)

const GX = 30, GY = 20
const regions = computed(() => {
  if (tick.value < 0) return []
  const out: { x: number, y: number, w: number, h: number, c: string }[] = []
  const cw = (PW - PAD * 2) / GX, ch = (PH - PAD * 2) / GY
  for (let i = 0; i < GX; i++) {
    for (let j = 0; j < GY; j++) {
      const x = xmin + ((i + 0.5) / GX) * (xmax - xmin)
      const y = ymax - ((j + 0.5) / GY) * (ymax - ymin)
      const k = scores([x, y]).indexOf(Math.max(...scores([x, y])))
      out.push({ x: PAD + i * cw, y: PAD + j * ch, w: cw + 0.6, h: ch + 0.6, c: pal[k] })
    }
  }
  return out
})

// ---------- 损失曲线 ----------
const CW = 196, CH = 116, CP = 16
const maxLoss = computed(() => Math.max(1, ...trainLoss.value, ...testLoss.value))
const xAt = (e: number) => CP + (e / MAXE) * (CW - CP * 1.4)
const yAt = (l: number) => CH - CP - (l / maxLoss.value) * (CH - CP * 1.6)
const lossPath = (arr: number[]) =>
  arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i + 1).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')

const verdict = computed(() => {
  if (!epoch.value) return ''
  if (trainLoss.value.length < 2) return ''
  const tl = trainLoss.value[trainLoss.value.length - 1]
  const vl = testLoss.value[testLoss.value.length - 1]
  if (vl > tl * 1.3 && epoch.value > 8) return '测试损失明显高于训练损失：模型把训练集里的噪声也当成了规律。'
  if (noise.value >= 0.2 && epoch.value > 10) return '标签噪声把两条曲线一起顶高；训练损失略低，说明模型部分记住了训练集的噪声标签。'
  if (tl > 1.0) return '训练损失还很高：学习率太小，或者训练轮数不够。'
  return '两条曲线贴得很近，没有明显的过拟合迹象。'
})
</script>

<template>
  <Widget title="真跑一遍 softmax 回归：训练 / 测试损失曲线">
    <p class="widget-note">
      这不是预设的曲线：下面是一个两特征、三分类的 softmax 回归，正在你的浏览器里用小批量 SGD 训练。背景色是当前决策区域。改学习率、批量或标签噪声后点「自动」，观察两条损失曲线的分岔。
    </p>

    <div class="ctrl">
      <span class="seg">
        <button v-for="v in [0.05, 0.2, 0.5]" :key="v" type="button" :class="{ on: lr === v }" @click="lr = v; reset()">
          lr = {{ v }}
        </button>
      </span>
      <span class="seg">
        <button v-for="v in [8, 32, 120]" :key="v" type="button" :class="{ on: batch === v }" @click="batch = v; reset()">
          B = {{ v }}
        </button>
      </span>
      <span class="seg">
        <button v-for="v in [0, 0.1, 0.25]" :key="v" type="button" :class="{ on: noise === v }" @click="noise = v; reset()">
          噪声 {{ v * 100 }}%
        </button>
      </span>
    </div>
    <div class="ctrl">
      <button class="btn primary" type="button" @click="trainEpoch">训练 1 轮</button>
      <button class="btn" type="button" @click="toggle">{{ running ? '暂停' : '自动训练' }}</button>
      <button class="btn" type="button" @click="reset">重置</button>
      <span class="muted" style="font-size:13px">epoch {{ epoch }} / {{ MAXE }}</span>
    </div>

    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <svg :width="PW" :height="PH" :viewBox="`0 0 ${PW} ${PH}`" style="flex:1 1 280px;max-width:100%">
        <rect :x="PAD" :y="PAD" :width="PW - PAD * 2" :height="PH - PAD * 2" style="fill:var(--vp-c-bg);stroke:var(--line)" />
        <rect
          v-for="(r, i) in regions" :key="'g' + i"
          :x="r.x" :y="r.y" :width="r.w" :height="r.h"
          :style="{ fill: r.c, opacity: 0.13 }"
        />
        <circle
          v-for="(p, i) in train.X" :key="'p' + i"
          :cx="sx(p[0])" :cy="sy(p[1])" r="2.3"
          :style="{ fill: pal[labels[i]] }"
        />
        <text :x="PW - PAD" :y="PH - 6" text-anchor="end" style="fill:var(--ink-3);font-size:10">x₁ →</text>
        <text :x="PAD + 4" :y="PAD + 10" style="fill:var(--ink-3);font-size:10">x₂ ↑</text>
      </svg>

      <div>
        <svg :width="CW" :height="CH" :viewBox="`0 0 ${CW} ${CH}`">
          <line :x1="CP" :y1="CH - CP" :x2="CW - 6" :y2="CH - CP" style="stroke:var(--line)" />
          <line :x1="CP" :y1="8" :x2="CP" :y2="CH - CP" style="stroke:var(--line)" />
          <path :d="lossPath(trainLoss)" style="fill:none;stroke:var(--accent);stroke-width:2" />
          <path :d="lossPath(testLoss)" style="fill:none;stroke:var(--prin);stroke-width:2;stroke-dasharray:5 4" />
          <text
            v-if="trainLoss.length < 2" :x="CW / 2" :y="CH / 2" text-anchor="middle"
            style="fill:var(--ink-3);font-size:11"
          >点「训练 1 轮」开始</text>
        </svg>
        <p class="widget-note" style="margin:2px 0 0;font-size:12px">
          <span style="color:var(--accent)">— 训练损失</span>　
          <span style="color:var(--prin)">-- 测试损失</span>
        </p>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><b>{{ trainLoss.length ? trainLoss[trainLoss.length - 1].toFixed(3) : '—' }}</b><span>训练损失</span></div>
      <div class="stat"><b>{{ testLoss.length ? testLoss[testLoss.length - 1].toFixed(3) : '—' }}</b><span>测试损失</span></div>
      <div class="stat"><b>{{ epoch ? (trainAcc * 100).toFixed(0) + '%' : '—' }}</b><span>训练精度</span></div>
      <div class="stat"><b>{{ epoch ? (testAcc * 100).toFixed(0) + '%' : '—' }}</b><span>测试精度</span></div>
    </div>

    <p class="widget-note" :class="verdict.includes('噪声') ? 'bad-c' : ''" style="margin-bottom:0">
      {{ verdict || '三簇数据线性可分，softmax 回归本来就能拿到很高的精度。想看点不一样的，把「噪声」调到 25%（训练集和测试集的标签各随机改掉四分之一）：两条损失曲线都会停在高位，训练损失略低于测试损失——模型把训练集里那部分噪声也背了下来。线性模型的容量有限，不会像深层网络那样出现夸张的 U 形；想要真正的过拟合，得等第 4 章给它加上隐藏层。' }}
    </p>
  </Widget>
</template>
