<template>
	<nav class="header-nav">
		<NuxtLink
			to="/app"
			class="nav-link"
			:class="{ active: route.path === '/app' }"
		>
			Estrai ore
		</NuxtLink>
		<NuxtLink
			to="/app/results"
			class="nav-link"
			:class="{ active: route.path === '/app/results' }"
		>
			Risultati
		</NuxtLink>

		<SignOutButton>
			<NuxtButton
				type="button"
				class="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition"
				style="color: var(--c-accent); background: none; border: 10px"
				@mouseenter="
					(e) => (
						(e.currentTarget.style.background = 'var(--c-accent)'),
						(e.currentTarget.style.color = 'var(--c-accent-light)')
					)
				"
				@mouseleave="
					(e) => (
						(e.currentTarget.style.color = 'var(--c-accent)'),
						(e.currentTarget.style.background = 'none')
					)
				"
			>
				Esci
			</NuxtButton>
		</SignOutButton>
	</nav>
</template>

<script setup lang="ts">
const route = useRoute();
</script>
