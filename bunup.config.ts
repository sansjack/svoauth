import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts'],
	name: 'svoauth',
	outDir: 'dist',
	target: 'node',
	minify: false,
	dts: {
		resolve: true,
		entry: {
			types: 'src/index.ts',
		},
	},
})
