<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// 0 观察 → 1 动作 → 2 奖励，然后回到 0
const phase = ref(0)
const t = ref(0)
const running = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const phases = [
  { key: 'obs', label: '观察', from: 'env', to: 'agent', color: 'var(--prin)' },
  { key: 'act', label: '动作', from: 'agent', to: 'env', color: 'var(--accent)' },
  { key: 'rew', label: '奖励', from: 'env', to: 'agent', color: 'var(--ex)' }
]
const cur = computed(() => phases[phase.value])

function next() {
  phase.value = (phase.value + 1) % 3
  if (phase.value === 0) t.value++
}

function toggle() {
  if (running.value) return stop()
  running.value = true
  timer = setInterval(next, 900)
}

function stop() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}

onUnmounted(stop)

const trajectory = [
  { obs: '格子 3,5 有灰尘', act: '向右', rew: '−1' },
  { obs: '格子 4,5 有灰尘', act: '向右', rew: '−1' },
  { obs: '格子 5,5 是干净的', act: '向下', rew: '−1' },
  { obs: '格子 5,4 有灰尘', act: '清理', rew: '+10' }
]
const row = computed(() => trajectory[t.value % trajectory.length])
</script>

<template>
  <Widget title="智能体与环境的循环：观察 → 动作 → 奖励">
    <p class="widget-note">
      强化学习里没有标准答案，只有环境返回的奖励。点「走一步」顺着循环走一圈，注意箭头方向：观察和奖励从环境来，动作往环境去。
    </p>

    <div class="loop">
      <div class="node" :class="{ hot: cur.to === 'agent' && cur.key === 'obs' }">
        <b>智能体</b>
        <span>按策略选择动作</span>
      </div>

      <div class="arrows">
        <div class="arrow down" :class="{ on: cur.key === 'obs' }">
          <span>观察</span><i>↓</i>
        </div>
        <div class="arrow up" :class="{ on: cur.key === 'act' }">
          <i>↑</i><span>动作</span>
        </div>
        <div class="arrow down" :class="{ on: cur.key === 'rew' }">
          <span>奖励</span><i>↓</i>
        </div>
      </div>

      <div class="node" :class="{ hot: cur.to === 'env' }">
        <b>环境</b>
        <span>给出下一个观察和奖励</span>
      </div>
    </div>

    <div class="out prose" style="margin-top:12px">
      第 {{ t + 1 }} 步 · 当前环节：<b :style="{ color: cur.color }">{{ cur.label }}</b><br>
      观察：{{ row.obs }}　动作：{{ row.act }}　奖励：{{ row.rew }}
    </div>

    <div class="ctrl" style="margin-bottom:0">
      <button class="btn primary" type="button" @click="next">走一步</button>
      <button class="btn" type="button" @click="toggle">{{ running ? '暂停' : '自动播放' }}</button>
      <button class="btn" type="button" @click="stop(); t = 0; phase = 0">重置</button>
    </div>
  </Widget>
</template>

<style scoped>
.loop { display: flex; align-items: stretch; gap: 0; margin-top: 6px; }
.node {
  flex: 1 1 0; min-width: 0; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px;
  background: var(--vp-c-bg); transition: border-color .2s, background .2s;
}
.node.hot { border-color: var(--accent); background: var(--accent-soft); }
.node b { display: block; font-size: 14.5px; }
.node span { font-size: 12.5px; color: var(--ink-3); }
.arrows { flex: 0 0 74px; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
.arrow { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ink-3); padding: 2px 4px; border-radius: 6px; transition: color .2s, background .2s; }
.arrow i { font-style: normal; font-size: 15px; line-height: 1; }
.arrow.up { justify-content: flex-end; }
.arrow.on { color: #fff; }
.arrow.up.on { background: var(--accent); }
.arrow.down.on { background: var(--prin); }
@media (max-width: 640px) {
  .loop { flex-direction: column; gap: 6px; }
  .arrows { flex-basis: auto; flex-direction: row; justify-content: center; gap: 12px; }
  .arrow.up { justify-content: flex-start; }
  .arrow i { transform: rotate(90deg); }
}
</style>
