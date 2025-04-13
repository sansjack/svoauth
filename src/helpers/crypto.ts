import crypto from 'crypto'

export const generateCodeVerifier = (): string => {
	return crypto.randomBytes(32).toString('base64url')
}

export const generateCodeChallenge = (verifier: string): string => {
	return crypto.createHash('sha256').update(verifier).digest('base64url')
}
