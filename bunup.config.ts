import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts'],
	name: 'svoauth',
	outDir: 'dist',
	target: 'node',
	minify: false,
	format: ['esm'],
	dts: {
		resolve: false,
		entry: ['src/index.ts', 'src/types/types.ts'],
	},
})
