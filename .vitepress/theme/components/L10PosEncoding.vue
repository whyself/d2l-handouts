<script setup lang="ts">
import { ref, computed } from 'vue'

const D = 32
const HALF = D / 2
const NROW = 24          // 热图显示的位置数
const NCOL = 16          // 热图显示的维度数
const POS = 64           // 曲线横跨的位置数

const omega = (j: number) => 1 / Math.pow(10000, (2 * j) / D)

const j = ref(3)
const delta = ref(3)
const at = ref(8)

const w = computed(() => omega(j.value))

const curve = computed(() => {
  const s: string[] = []
  const c: string[] = []
  for (let i = 0; i <= POS; i++) {
    const x = 26 + (i / POS) * 268
    s.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${(58 - 40 * Math.sin(i * w.value)).toFixed(1)}`)
    c.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${(58 - 40 * Math.cos(i * w.value)).toFixed(1)}`)
  }
  return { sin: s.join(' '), cos: c.join(' ') }
})

const wavelength = computed(() => (2 * Math.PI) / w.value)

// 热图：行 = 位置，列 = 维度
const cells = computed(() => {
  const out: { i: number, c: number, v: number }[] = []
  for (let i = 0; i < NROW; i++) {
    for (let c = 0; c < NCOL; c++) {
      const om = omega(Math.floor(c / 2))
      out.push({ i, c, v: c % 2 === 0 ? Math.sin(i * om) : Math.cos(i * om) })
    }
  }
  return out
})

// 相对位置：P_{i+δ} 应当等于把 P_i 旋转 δω
const rotErr = computed(() => {
  let err = 0
  for (let i = 0; i < 64; i++) {
    const a = i * w.value
    const b = (i + delta.value) * w.value
    const s2 = Math.cos(delta.value * w.value) * Math.sin(a) + Math.sin(delta.value * w.value) * Math.cos(a)
    const c2 = -Math.sin(delta.value * w.value) * Math.sin(a) + Math.cos(delta.value * w.value) * Math.cos(a)
    err = Math.max(err, Math.abs(s2 - Math.sin(b)), Math.abs(c2 - Math.cos(b)))
  }
  return err
})

// 相量圆
const R = 52, CCX = 78, CCY = 76
const angA = computed(() => at.value * w.value)
const angB = computed(() => (at.value + delta.value) * w.value)
const px = (a: number) => CCX + R * Math.cos(a)
const py = (a: number) => CCY - R * Math.sin(a)
</script>

<template>
  <Widget title="正弦位置编码：波长随维度指数增长，平移等于旋转">
    <p class="widget-note">
      偶数维取 sin、奇数维取 cos，第 j 对的角频率是 ωⱼ = 1 / 10000^(2j/d)。j 越大波长越长：低位管「精确定位」，高位管「大致在哪一段」。
      右边的相量图说明第二件事：把位置从 i 挪到 i+δ，等价于把这对方程旋转一个固定角度 δωⱼ。
    </p>

    <div class="ctrl">
      <label>维度对 j <input v-model.number="j" type="range" min="0" max="15" step="1"><b>{{ j }}</b></label>
      <label>位移 δ <input v-model.number="delta" type="range" min="0" max="8" step="1"><b>{{ delta }}</b></label>
      <label>起点 i <input v-model.number="at" type="range" min="0" max="20" step="1"><b>{{ at }}</b></label>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start">
      <svg width="300" height="124" viewBox="0 0 300 124" style="flex:1 1 260px;max-width:100%">
        <line x1="26" y1="58" x2="294" y2="58" style="stroke:var(--line)" />
        <line x1="26" y1="10" x2="26" y2="106" style="stroke:var(--line)" />
        <path :d="curve.sin" style="stroke:var(--accent);stroke-width:2;fill:none" />
        <path :d="curve.cos" style="stroke:var(--prin);stroke-width:2;fill:none;stroke-dasharray:5 3" />
        <text x="30" y="16" style="fill:var(--accent);font-size:10">sin(i·ω{{ j }})</text>
        <text x="30" y="30" style="fill:var(--prin);font-size:10">cos(i·ω{{ j }})</text>
        <text x="26" y="118" style="fill:var(--ink-3);font-size:10">位置 i = 0 … {{ POS }}</text>
      </svg>

      <svg width="160" height="124" viewBox="0 0 160 124" style="flex:0 0 auto">
        <circle :cx="CCX" :cy="CCY" :r="R" style="fill:none;stroke:var(--line)" />
        <line :x1="CCX - R - 8" :y1="CCY" :x2="CCX + R + 8" :y2="CCY" style="stroke:var(--line-2)" />
        <line :x1="CCX" :y1="CCY - R - 8" :x2="CCX" :y2="CCY + R + 8" style="stroke:var(--line-2)" />
        <!-- 旋转弧 -->
        <path :d="`M${px(angA)},${py(angA)} A${R},${R} 0 0 0 ${px(angB)},${py(angB)}`"
              style="fill:none;stroke:var(--warn);stroke-width:1.4;opacity:.7" />
        <line :x1="CCX" :y1="CCY" :x2="px(angA)" :y2="py(angA)" style="stroke:var(--accent);stroke-width:2" />
        <line :x1="CCX" :y1="CCY" :x2="px(angB)" :y2="py(angB)" style="stroke:var(--warn);stroke-width:2" />
        <circle :cx="px(angA)" :cy="py(angA)" r="3.4" style="fill:var(--accent)" />
        <circle :cx="px(angB)" :cy="py(angB)" r="3.4" style="fill:var(--warn)" />
        <text x="80" y="120" text-anchor="middle" style="fill:var(--ink-3);font-size:9">
          i 与 i+{{ delta }}（第 {{ j }} 对）
        </text>
      </svg>
    </div>

    <svg width="470" height="162" viewBox="0 0 470 162" style="max-width:100%;margin-top:6px">
      <text x="2" y="10" style="fill:var(--ink-3);font-size:10">行 = 位置，列 = 编码维度（左低维高频，右高维低频）</text>
      <g v-for="(cell, k) in cells" :key="'c' + k">
        <rect :x="30 + cell.c * 27" :y="18 + cell.i * 5.4" width="26" height="4.9"
              :style="`fill:${cell.v >= 0 ? 'var(--accent)' : 'var(--prin)'};opacity:${(0.08 + 0.9 * Math.abs(cell.v)).toFixed(2)}`" />
      </g>
      <text x="2" y="142" style="fill:var(--ink-3);font-size:9">位置 0</text>
      <text x="2" y="24" style="fill:var(--ink-3);font-size:9">…{{ NROW - 1 }}</text>
      <text x="30" y="158" style="fill:var(--accent);font-size:9">■ 正值</text>
      <text x="90" y="158" style="fill:var(--prin);font-size:9">■ 负值</text>
    </svg>

    <div class="stats">
      <div class="stat"><b>{{ w.toExponential(2) }}</b><span>角频率 ωⱼ</span></div>
      <div class="stat"><b>{{ wavelength.toFixed(1) }}</b><span>波长 2π/ωⱼ（位置数）</span></div>
      <div class="stat"><b>{{ (delta * w).toFixed(3) }}</b><span>旋转角 δωⱼ（弧度）</span></div>
      <div class="stat"><b>{{ rotErr < 1e-12 ? '≈ 0' : rotErr.toExponential(1) }}</b><span>旋转复现的最大误差</span></div>
    </div>

    <p class="widget-note" style="margin-bottom:0">
      把 j 拉到 15：波长长到三万多个位置，曲线几乎是一条直线，相邻位置几乎分不开——它负责「粗粒度」；把 j 拉回 0，波长只有 6.28，相邻位置差得很远——它负责「精确定位」。
      误差那一栏始终是 0：同一个 2×2 旋转矩阵对任意 i 都成立，这就是位置编码里藏着的「相对位置」。
    </p>
  </Widget>
</template>
