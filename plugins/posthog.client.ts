import posthog from "posthog-js";

type PostHogClient = typeof posthog;
type PostHogProvider = () => PostHogClient;

declare module "#app" {
	interface NuxtApp {
		$posthog: PostHogProvider;
	}
}

declare module "vue" {
	interface ComponentCustomProperties {
		$posthog: PostHogProvider;
	}
}

export default defineNuxtPlugin(() => {
	const runtimeConfig = useRuntimeConfig();

	posthog.init(runtimeConfig.public.posthogKey, {
		api_host: runtimeConfig.public.posthogHost || "https://eu.i.posthog.com",
		capture_pageview: false,
		loaded: (ph) => {
			if (import.meta.env.DEV) ph.opt_out_capturing();
		},
	});

	const router = useRouter();
	router.afterEach((to) => {
		posthog.capture("$pageview", { current_url: to.fullPath });
	});

	const getPostHog: PostHogProvider = () => posthog;

	return { provide: { posthog: getPostHog } };
});
