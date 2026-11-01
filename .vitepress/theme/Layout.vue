<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import Lightbox from './components/Lightbox.vue'
import TermTip from './components/TermTip.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <Lightbox />
      <TermTip />
    </template>
  </Layout>
</template>
