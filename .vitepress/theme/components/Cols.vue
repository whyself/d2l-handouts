<script setup lang="ts">
// 双栏并排：左文右图 / 左图右文。ratio 可选，形如 "1fr 1.2fr"，窄屏自动变单栏
defineProps<{ ratio?: string }>()
</script>

<template>
  <div class="two-col" :style="ratio ? { gridTemplateColumns: ratio } : undefined"><slot /></div>
</template>
