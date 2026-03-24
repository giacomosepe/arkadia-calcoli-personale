<template>
  <nav class="header-nav">
    <NuxtLink to="/app" class="nav-link" :class="{ active: route.path === '/app' }">
      Estrai ore
    </NuxtLink>
    <NuxtLink to="/app/results" class="nav-link" :class="{ active: route.path === '/app/results' }">
      Risultati
    </NuxtLink>
    <NuxtLink to="/app/pivot" class="nav-link" :class="{ active: route.path === '/app/pivot' }">
      Schede dipendenti
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
