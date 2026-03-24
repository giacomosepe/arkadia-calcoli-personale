<template>
	<div class="min-h-screen" style="background: var(--c-bg)">
		<Navbar />

		<main>
			<div class="relative isolate px-6 pt-14 lg:px-8">
				<div
					class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
					aria-hidden="true"
				>
					<div
						class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
						style="
							background: linear-gradient(
								to top right,
								var(--c-accent),
								var(--c-accent-light)
							);
							clip-path: polygon(
								74.1% 44.1%,
								100% 61.6%,
								97.5% 26.9%,
								85.5% 0.1%,
								80.7% 2%,
								72.5% 32.5%,
								60.2% 62.4%,
								52.4% 68.1%,
								47.5% 58.3%,
								45.2% 34.5%,
								27.5% 76.7%,
								0.1% 64.9%,
								17.9% 100%,
								27.6% 76.8%,
								76.1% 97.7%,
								74.1% 44.1%
							);
						"
					></div>
				</div>

				<div class="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
					<div class="text-center">
						<h1
							class="text-5xl font-bold tracking-tight sm:text-6xl"
							style="color: var(--c-text-primary)"
						>
							Dati del personale: da PDF a tabelle excel in 3
							minuti invece di 3 giorni
						</h1>
						<p
							class="mt-6 text-lg leading-8"
							style="color: var(--c-text-secondary)"
						>
							LUL Extractor utilizza l'intelligenza artificiale
							per estrarre genera automaticamente fogli Excel
							pronti all'uso partendo dai PDF del Libro Unico del
							Lavoro.
						</p>
						<div
							class="mt-10 flex items-center justify-center gap-x-6"
						>
							<SignInButton v-if="!isSignedIn" mode="modal">
								<button
									type="button"
									class="cursor-pointer rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition"
									style="background: var(--c-accent)"
									@mouseenter="
										(e) =>
											(e.currentTarget.style.background =
												'var(--c-accent-hover)')
									"
									@mouseleave="
										(e) =>
											(e.currentTarget.style.background =
												'var(--c-accent)')
									"
								>
									Inizia ora
								</button>
							</SignInButton>
							<NuxtLink
								v-else
								to="/app"
								class="inline-block rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition"
								style="background: var(--c-accent)"
							>
								Vai alla dashboard
							</NuxtLink>
							<a
								href="#features"
								class="text-base font-semibold leading-6"
								style="color: var(--c-text-primary)"
							>
								Come funziona <span aria-hidden="true">→</span>
							</a>
						</div>
					</div>
				</div>

				<div
					class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
					aria-hidden="true"
				>
					<div
						class="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
						style="
							background: linear-gradient(
								to top right,
								var(--c-accent),
								var(--c-accent-light)
							);
							clip-path: polygon(
								74.1% 44.1%,
								100% 61.6%,
								97.5% 26.9%,
								85.5% 0.1%,
								80.7% 2%,
								72.5% 32.5%,
								60.2% 62.4%,
								52.4% 68.1%,
								47.5% 58.3%,
								45.2% 34.5%,
								27.5% 76.7%,
								0.1% 64.9%,
								17.9% 100%,
								27.6% 76.8%,
								76.1% 97.7%,
								74.1% 44.1%
							);
						"
					></div>
				</div>
			</div>

			<div
				id="features"
				class="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8"
			>
				<div class="mx-auto max-w-2xl lg:text-center">
					<h2
						class="text-base font-semibold leading-7"
						style="color: var(--c-accent)"
					>
						Versione 1.0: carica PDF e scarica XLSX
					</h2>
					<p
						class="mt-2 text-4xl font-bold tracking-tight sm:text-5xl"
						style="color: var(--c-text-primary)"
					>
						Il processo e' molto facile. Non c'e' nulla da imparare.
					</p>
					<p
						class="mt-6 text-lg leading-8"
						style="color: var(--c-text-secondary)"
					>
						Non c'e' piu' trascrizione manuale. Basta caricare i
						PDF, e la app produce scarica un Excel da scaricare.
					</p>
				</div>

				<div
					class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none"
				>
					<dl
						class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3"
					>
						<div class="flex flex-col">
							<dt
								class="flex items-center gap-x-3 text-base font-semibold leading-7"
								style="color: var(--c-text-primary)"
							>
								<svg
									class="h-5 w-5 flex-none"
									viewBox="0 0 20 20"
									fill="currentColor"
									style="color: var(--c-accent)"
								>
									<path
										fill-rule="evenodd"
										d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
										clip-rule="evenodd"
									/>
								</svg>
								AI-powered
							</dt>
							<dd
								class="mt-4 flex flex-auto flex-col text-base leading-7"
								style="color: var(--c-text-secondary)"
							>
								<p class="flex-auto">
									Carica i LUL in formato PDF. Puoi caricare
									diversi file contemporaneamente per
									includere tutti mesi e i dipendenti in una
									volta sola.
								</p>
							</dd>
						</div>
						<div class="flex flex-col">
							<dt
								class="flex items-center gap-x-3 text-base font-semibold leading-7"
								style="color: var(--c-text-primary)"
							>
								<svg
									class="h-5 w-5 flex-none"
									viewBox="0 0 20 20"
									fill="currentColor"
									style="color: var(--c-accent)"
								>
									<path
										fill-rule="evenodd"
										d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
										clip-rule="evenodd"
									/>
								</svg>
								Indica l'intestazione dell' informazione da
								estrarre
							</dt>
							<dd
								class="mt-4 flex flex-auto flex-col text-base leading-7"
								style="color: var(--c-text-secondary)"
							>
								<p class="flex-auto">
									Indica sull'interfaccia il titolo della
									colonna delle ore di lavoro e del riepilogo
									finale.
								</p>
							</dd>
						</div>
						<div class="flex flex-col">
							<dt
								class="flex items-center gap-x-3 text-base font-semibold leading-7"
								style="color: var(--c-text-primary)"
							>
								<svg
									class="h-5 w-5 flex-none"
									viewBox="0 0 20 20"
									fill="currentColor"
									style="color: var(--c-accent)"
								>
									<path
										fill-rule="evenodd"
										d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
										clip-rule="evenodd"
									/>
								</svg>
								Controlla il file e scaricalo
							</dt>
							<dd
								class="mt-4 flex flex-auto flex-col text-base leading-7"
								style="color: var(--c-text-secondary)"
							>
								<p class="flex-auto">
									Nella sezione risultati vedrai il file Excel
									pronto per essere scaricato. Verifica che i
									dati siano corretti e clicca sul pulsante
									"Scarica" per scaricarlo.
								</p>
							</dd>
						</div>
					</dl>
				</div>
			</div>
		</main>

		<footer class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
			<p
				class="text-center text-sm"
				style="color: var(--c-text-tertiary)"
			>
				&copy; 2025 LUL Extractor. Giacomo Sepe per Arkadia.
			</p>
		</footer>
	</div>
</template>

<script setup lang="ts">
const { isSignedIn } = useAuth();
</script>
