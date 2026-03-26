<template>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		:width="width"
		:height="height"
		:viewBox="iconOnly ? '0 0 120 120' : '0 0 400 120'"
		role="img"
		aria-label="LUL Extractor"
	>
		<!-- Icon: yellow rounded square -->
		<rect x="8" y="8" width="104" height="104" rx="20" :fill="bgColor" />

		<!-- Payslip document shape -->
		<rect
			x="28"
			y="22"
			width="52"
			height="64"
			rx="5"
			fill="#1B1F2E"
			opacity="0.08"
		/>
		<rect
			x="28"
			y="22"
			width="52"
			height="64"
			rx="5"
			fill="none"
			stroke="#1B1F2E"
			stroke-width="1.2"
			opacity="0.15"
		/>

		<!-- Data rows (simulated payslip lines) -->
		<rect
			x="36"
			y="34"
			width="22"
			height="4"
			rx="2"
			:fill="darkColor"
			opacity="0.65"
		/>
		<rect
			x="62"
			y="34"
			width="10"
			height="4"
			rx="2"
			:fill="darkColor"
			opacity="0.35"
		/>
		<rect
			x="36"
			y="43"
			width="14"
			height="4"
			rx="2"
			:fill="darkColor"
			opacity="0.35"
		/>
		<rect
			x="54"
			y="43"
			width="18"
			height="4"
			rx="2"
			:fill="darkColor"
			opacity="0.65"
		/>
		<rect
			x="36"
			y="52"
			width="18"
			height="4"
			rx="2"
			:fill="darkColor"
			opacity="0.65"
		/>
		<rect
			x="58"
			y="52"
			width="12"
			height="4"
			rx="2"
			:fill="darkColor"
			opacity="0.35"
		/>
		<rect
			x="36"
			y="61"
			width="10"
			height="4"
			rx="2"
			:fill="darkColor"
			opacity="0.35"
		/>
		<rect
			x="50"
			y="61"
			width="22"
			height="4"
			rx="2"
			:fill="darkColor"
			opacity="0.65"
		/>

		<!-- Divider -->
		<line
			x1="36"
			y1="72"
			x2="72"
			y2="72"
			:stroke="darkColor"
			stroke-width="0.8"
			opacity="0.15"
		/>

		<!-- Progress bar -->
		<rect
			x="36"
			y="77"
			width="36"
			height="7"
			rx="3.5"
			:fill="darkColor"
			opacity="0.1"
		/>
		<rect
			x="36"
			y="77"
			width="28"
			height="7"
			rx="3.5"
			:fill="accentColor"
		/>

		<!-- Checkmark -->
		<polyline
			points="82,18 87,25 96,13"
			fill="none"
			:stroke="darkColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.55"
		/>

		<!-- Wordmark (hidden in icon-only mode) -->
		<template v-if="!iconOnly">
			<line
				x1="128"
				y1="16"
				x2="128"
				y2="104"
				:stroke="darkColor"
				stroke-width="0.8"
				opacity="0.08"
			/>
			<text
				x="148"
				y="82"
				font-family="Georgia, 'Times New Roman', serif"
				font-size="52"
				font-weight="700"
				:fill="darkColor"
				letter-spacing="-2"
			>
				LUL
			</text>
			<text
				x="151"
				y="104"
				font-family="Georgia, 'Times New Roman', serif"
				font-size="18"
				font-weight="400"
				:fill="accentColor"
				letter-spacing="3"
			>
				EXTRACTOR
			</text>
			<text
				x="151"
				y="116"
				font-family="sans-serif"
				font-size="10"
				:fill="darkColor"
				opacity="0.4"
				letter-spacing="1.5"
			>
				AI-POWERED · 20 MIN
			</text>
		</template>
	</svg>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
	/**
	 * Show icon only (no wordmark). Useful for sidebar collapsed state, favicons, etc.
	 */
	iconOnly: {
		type: Boolean,
		default: false,
	},
	/**
	 * Width in px. Height scales automatically from viewBox ratio.
	 * Default: 200px full logo, 40px icon-only
	 */
	width: {
		type: [Number, String],
		default: undefined,
	},
	/**
	 * Override accent colour. Defaults to var(--color-accent) from your CSS.
	 * Pass a hex string to override: accent="#2563EB"
	 */
	accent: {
		type: String,
		default: null,
	},
	/**
	 * Override background colour of the icon square.
	 * Defaults to var(--color-accent-bg) or the original yellow.
	 */
	bg: {
		type: String,
		default: null,
	},
	/**
	 * Override the dark colour used for text and data bars.
	 */
	dark: {
		type: String,
		default: null,
	},
});

// Use prop overrides, else fall back to CSS variables (resolved at paint time via currentColor trick)
// We use inline style trick: SVG fill="var(--color-accent)" works natively in modern browsers
const accentColor = computed(() => props.accent ?? "var(--c-accent)");
const bgColor = computed(() => props.bg ?? "var(--c-accent-light, #FFD43B)");
const darkColor = computed(() => props.dark ?? "var(--c-accent-dark, #1B1F2E)");

const width = computed(() => {
	if (props.width) return props.width;
	return props.iconOnly ? 40 : 200;
});

const height = computed(() => {
	if (props.width) {
		// maintain aspect ratio: icon is 1:1, full logo is 400:120 = 10:3
		return props.iconOnly
			? props.width
			: Math.round(Number(props.width) * 0.3);
	}
	return props.iconOnly ? 40 : 60;
});
</script>
