<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import { annotate, chapterOf, termTip } from '../lib/terms'

// 扫描必须在浏览器里做（会改 DOM），因此只在挂载后与路由切换后触发，
// 不参与服务端渲染，也就不会出现 hydration 不一致。
const route = useRoute()
let timer: number | undefined

function scan() {
  termTip.open = false
  const chapter = chapterOf(route.path)
  if (!chapter) return
  const root = document.querySelector('.vp-doc') as HTMLElement | null
  if (!root) return
  annotate(root, chapter)
}

function schedule(delay = 400) {
  if (timer) clearTimeout(timer)
  timer = window.setTimeout(scan, delay)
}

const close = () => { termTip.open = false }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }

onMounted(() => {
  schedule(500)
  document.addEventListener('keydown', onKey)
  document.addEventListener('click', close)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('click', close)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
})

// 站内是 SPA 跳转，正文会被整块替换，换页后重新扫描
watch(() => route.path, () => schedule(600))
</script>

<template>
  <div
    v-if="termTip.open"
    class="term-pop"
    role="dialog"
    :aria-label="`${termTip.term} 的解释`"
    :style="{
      left: termTip.x + 'px',
      top: termTip.y + 'px',
      transform: termTip.above ? 'translateY(-100%)' : 'none'
    }"
    @click.stop
  >
    <div class="term-pop-h">
      <b>{{ termTip.term }}</b>
      <span v-if="termTip.en" class="en">{{ termTip.en }}</span>
      <span class="tag">补充</span>
      <button class="term-pop-x" type="button" aria-label="关闭" @click="close">×</button>
    </div>
    <p>{{ termTip.tip }}</p>
    <p v-if="termTip.see" class="see">原文 {{ termTip.see }} 有完整说明</p>
  </div>
</template>
