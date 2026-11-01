<script setup lang="ts">
// 原书出处标签（章节号）；ignore-header 让它不进入右侧目录
defineProps<{ s: string }>()
</script>

<template>
  <span class="src ignore-header">§{{ s }}</span>
</template>
