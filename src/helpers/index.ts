import crypto from 'crypto'
import { Scopes } from '../types/index'

export const generateState = (): string => {
	return crypto.randomBytes(32).toString('hex')
}

export const isServer = () => {
	if (typeof window !== 'undefined') {
		throw new Error(
			'This packge should only be used in your server-side code, please refer to the README for more information.'
		)
	}
}

export const mapDelimiter = (delimiter: Scopes['delimiter']): string => {
	switch (delimiter) {
		case 'space':
			return ' '
		case 'comma':
			return ','
		case 'colon':
			return ':'

		default:
			return ' ' // fallback to spaces
	}
}
