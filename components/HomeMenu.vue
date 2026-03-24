<template>
	<div>
		<button
			v-if="!isSignedIn"
			type="button"
			class="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition"
			style="background: var(--c-accent)"
			@click="openLogin"
			@mouseenter="(e) => (e.currentTarget.style.background = 'var(--c-accent-hover)')"
			@mouseleave="(e) => (e.currentTarget.style.background = 'var(--c-accent)')"
		>
			Login
		</button>
		<NuxtLink
			v-else
			to="/app"
			class="inline-block rounded-lg px-5 py-2 text-sm font-medium text-white transition"
			style="background: var(--c-accent)"
		>
			Dashboard
		</NuxtLink>
	</div>
</template>

<script setup lang="ts">
const { isSignedIn } = useAuth()
const clerk = useClerk()

function openLogin() {
	clerk.value?.openSignIn({ afterSignInUrl: '/app', afterSignUpUrl: '/app' })
}
</script>
