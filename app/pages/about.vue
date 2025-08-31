<script setup lang="ts">
// @ts-ignore
import markdownIt from 'markdown-it'
import readmeRaw from '../README.md?raw'

const md = markdownIt({
  html: true,
})

const html = md.render(readmeRaw)
</script>

<template>
  <TheGitIcon />
  <main class="mx-auto w-full max-w-[900px] p-3">
    <nav class="mt-3 text-accent">
      <NuxtLink to="/">{{ '<- Back to main page' }}</NuxtLink>
    </nav>
    <article
      class="markdown-body p-4 pt-10"
      v-html="html"
    />
  </main>
</template>

<style>
@import 'github-markdown-css/github-markdown.css';

.markdown-body {
    background-color: transparent;
}

.markdown-body img {
    display: none;
}
</style>
