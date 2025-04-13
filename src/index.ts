/// <reference path="./types/index.ts" />
import { generateState, isServer, mapDelimiter } from '@helpers'
import { generateCodeVerifier, generateCodeChallenge } from '@helpers/crypto'
import { OAuthClients, OAuthClient, TokenResponse, OAuthConfigs } from './types'
import type { Cookies, RequestEvent } from '@sveltejs/kit'

/* should NEVER be used on any client side / browser */
isServer()

export class OAuthInstance {
	#client: OAuthClient

	constructor(client: OAuthClient) {
		this.#client = client
	}

	generateAuthorizeUrl(event: RequestEvent): string {
		const state = generateState()

		const { cookies } = event

		const params = new URLSearchParams({
			client_id: this.#client.clientId,
			redirect_uri: this.#client.redirectUri,
			scope: this.#client.scopes.values.join(
				mapDelimiter(this.#client.scopes.delimiter)
			),
			response_type: 'code',
		})

		if (state) {
			cookies.set('oauth_state', state, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 10 * 60,
				path: '/',
			})

			console.debug('oauth_state cookie set')
			params.set('state', state)
		}

		if (this.#client.pkce) {
			const codeVerifier = generateCodeVerifier()
			const codeChallenge = generateCodeChallenge(codeVerifier)

			cookies.set('oauth_code_verifier', codeVerifier, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 10 * 60,
				path: '/',
			})
			console.debug('oauth_code_verifier cookie set')

			params.set('code_challenge', codeChallenge)
			params.set('code_challenge_method', 'S256')
		}

		/* add any additional params for example googles offline access */
		if (this.#client.params) {
			this.#client.params.forEach((param) => {
				const [[key, value]] = Object.entries(param)
				params.set(key, value)
			})
		}

		return `${this.#client.authorizeUrl}?${params.toString()}`
	}

	#verifyState(cookies: Cookies, returnedState: string): boolean {
		const storedState = cookies.get('oauth_state')
		cookies.delete('oauth_state', { path: '/' })

		if (!storedState || storedState !== returnedState) {
			throw new Error('Invalid state parameter - possible CSRF attack')
		}

		return true
	}

	#parseCallbackUrl(url: string, cookies: Cookies): string {
		const params = new URLSearchParams(url.split('?')[1])
		const state = params.get('state')
		const code = params.get('code')

		if (!state || !code) {
			throw new Error('Invalid callback URL: missing code or state')
		}

		this.#verifyState(cookies, state)
		return code
	}

	async exchangeCodeForToken(event: RequestEvent): Promise<TokenResponse> {
		if (!this.#client) {
			throw new Error(`Client "${this.#client}" not found.`)
		}

		const { cookies, url } = event

		const code = this.#parseCallbackUrl(url.toString(), cookies)

		const params = new URLSearchParams({
			client_id: this.#client.clientId,
			client_secret: this.#client.clientSecret,
			code,
			redirect_uri: this.#client.redirectUri,
			grant_type: 'authorization_code',
		})

		if (this.#client.pkce) {
			const codeVerifier = cookies.get('oauth_code_verifier')
			cookies.delete('oauth_code_verifier', { path: '/' })

			if (!codeVerifier) {
				throw new Error('Code verifier not found')
			}

			params.set('code_verifier', codeVerifier)
		}

		const response = await fetch(this.#client.tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
				'Accept-Encoding': 'application/json',
			},
			body: params.toString(),
		})

		if (!response.ok) {
			console.error(response)
			throw new Error('Failed to exchange code for token')
		}

		return response.json() as Promise<TokenResponse>
	}
}

export class OAuthHandler {
	#clients: OAuthClients

	constructor(clients: OAuthConfigs) {
		this.#clients = new Map<string, OAuthClient>(Object.entries(clients))
	}

	get(clientName: string): OAuthInstance {
		const hasFound = this.#clients.get(clientName)

		if (!hasFound) {
			throw new Error(`Client "${clientName}" not found.`)
		}

		return new OAuthInstance(hasFound)
	}
}

export { OAuthClients, OAuthClient, TokenResponse, OAuthConfigs }
