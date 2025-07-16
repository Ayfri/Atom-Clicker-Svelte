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
				realm: {
					50: '#F3F0FF',
					100: '#E9E5FF',
					200: '#D6CCFF',
					300: '#BDA8FF',
					400: '#9966CC',
					500: '#8B45BF',
					600: '#7C3AAE',
					700: '#6A2C93',
					800: '#582379',
					900: '#4A1E64',
					950: '#2D1142',
				},
			},
		},
	},
	plugins: [],
};
