/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				accent: {
					50: '#EEF2F6',
					100: '#DBE5F0',
					200: '#AEC8E4',
					300: '#81ADDF',
					400: '#4A90E2',
					500: '#3378C7',
					600: '#316096',
					700: '#2B4869',
					800: '#233243',
					900: '#15191E',
					950: '#0C0D0D',
				},
			},
		},
	},
	plugins: [],
};
