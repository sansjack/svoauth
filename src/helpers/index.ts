export const isServer = () => {
	if (typeof window !== 'undefined') {
		throw new Error(
			'This packge should only be used in your server-side code, please refer to the README for more information.'
		)
	}
}