<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { lightbox } from '../lib/store'

// size: sm / md / full；w 为原书给出的像素宽度；s 为原书出处章节号
const props = defineProps<{ src: string; cap?: string; s?: string; size?: string; w?: string | number }>()
const url = withBase(props.src)
// 原书图注写 :width:`200px` 时照原样还原，窄屏仍不超过容器（内联样式会覆盖样式表，必须用 min() 夹住）
const maxW = computed(() => {
  if (!props.w) return undefined
  const v = String(props.w).trim()
  const px = /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v
  return `min(100%, ${px})`
})

function open() {
  lightbox.src = url
  lightbox.cap = (props.cap || '').replace(/<[^>]+>/g, '')
  lightbox.open = true
}
</script>

<template>
  <figure class="fig" :class="size">
    <img :src="url" :alt="(cap || '').replace(/<[^>]+>/g, '')" loading="lazy" :style="{ maxWidth: maxW }" @click="open">
    <figcaption v-if="cap || s"><span v-html="cap" /><span v-if="s" class="src">§{{ s }}</span></figcaption>
  </figure>
</template>

<style scoped>
.fig { margin: 20px 0; text-align: center; }
.fig img {
  display: inline-block; max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--line);
  background: #fff; cursor: zoom-in; transition: box-shadow .2s;
}
.fig img:hover { box-shadow: var(--shadow); }
.fig.sm img { width: 100%; max-width: 340px; }
.fig.md img { width: 100%; max-width: 540px; }
figcaption { font-size: 13.5px; color: var(--ink-3); margin-top: 6px; line-height: 1.6; }
</style>
