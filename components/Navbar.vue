<template>
  <nav
    class="header"
    style="display: flex; align-items: center; justify-content: space-between;"
  >
    <!-- Logo - always visible -->
    <NuxtLink to="/" class="flex items-center gap-2.5">
      <span
        class="flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold text-white"
        style="background: var(--c-accent);"
      >
        LUL
      </span>
      <span class="font-semibold" style="color: var(--c-text-primary);">LUL Extractor</span>
    </NuxtLink>

    <!-- Conditional menu based on route -->
    <HomeMenu v-if="isHomePage" />
    <AppMenu v-else />
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const isHomePage = computed(() => route.path === '/')
</script>
