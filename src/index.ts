/// <reference path="./types/index.ts" />
import { isServer } from '@helpers'
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@helpers/crypto'
import { OAuthClients, OAuthClient, TokenResponse, OAuthConfigs } from './types'
import type { Cookies, RequestEvent } from '@sveltejs/kit'

isServer()

/**
 * Single instance of a client
 *
 * @export
 * @class OAuthInstance
 * @typedef {OAuthInstance}
 */
export class OAuthInstance {
	#client: OAuthClient

	/**
	 * Creates an instance of OAuthInstance.
	 *
	 * @constructor
	 * @param {OAuthClient} client
	 */
	constructor(client: OAuthClient) {
		this.#client = client
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

	/**
	 * Generates an authorize url for the client config
	 *
	 * @param {RequestEvent} event
	 * @returns {string}
	 */
	generateAuthorizeUrl(event: RequestEvent): string {
		const state = generateState()

		const { cookies } = event

		const params = new URLSearchParams({
			client_id: this.#client.clientId,
			redirect_uri: this.#client.redirectUri,
			scope: this.#client.scopes.values.join(
				this.#client.scopes.delimiter ?? ' '
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

		if (this.#client.params) {
			this.#client.params.forEach((param) => {
				const [[key, value]] = Object.entries(param)
				params.set(key, value)
			})
		}

		return `${this.#client.authorizeUrl}?${params.toString()}`
	}

	/**
	 * Takes your callback request and gives you a TokenResponse
	 *
	 * @async
	 * @param {RequestEvent} event
	 * @returns {Promise<TokenResponse>}
	 */
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
	/**
	 * Use your refresh token to get a new access token
	 *
	 * @async
	 * @param {string} refreshToken
	 * @returns {Promise<TokenResponse>}
	 */
	async refreshToken(refreshToken: string): Promise<TokenResponse> {
		if (!this.#client) {
			throw new Error(`Client "${this.#client}" not found.`)
		}

		if (!refreshToken) {
			throw new Error('Refresh token not found')
		}

		if (!this.#client.refreshTokenUrl) {
			console.warn('Refresh token url not found using token url')
		}

		const params = new URLSearchParams({
			client_id: this.#client.clientId,
			client_secret: this.#client.clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		})

		const response = await fetch(
			this.#client.refreshTokenUrl || this.#client.tokenUrl,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
					'Accept-Encoding': 'application/json',
				},
				body: params.toString(),
			}
		)

		if (!response.ok) {
			throw new Error('Failed to refresh token')
		}

		const tokenResponse = (await response.json()) as TokenResponse

		return tokenResponse
	}
	/**
	 * Use your access token or refresh token to revoke access.
	 *
	 * @async
	 * @param {string} token
	 * @returns {Promise<TokenResponse>}
	 */
	async revokeToken(token: string): Promise<boolean> {
		if (!this.#client) {
			throw new Error(`Client "${this.#client}" not found.`)
		}

		if (!token) {
			throw new Error('Token not found')
		}

		if (!this.#client.revokeTokenUrl) {
			console.error('Revoke token URL not found')
			throw new Error('Revoke token URL not configured')
		}

		const params = new URLSearchParams({
			token: token,
		})

		const response = await fetch(this.#client.revokeTokenUrl, {
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
			throw new Error('Failed to revoke token')
		}

		return true
	}
}

/**
 * Global handler to access all your clients config
 *
 * @export
 * @class OAuthHandler
 * @typedef {OAuthHandler}
 */
export class OAuthHandler {
	/**
	 * All OAuthClients added to the OAuthConfig
	 *
	 * @type {OAuthClients}
	 */
	#clients: OAuthClients

	/**
	 * Creates an instance of OAuthHandler.
	 *
	 * @constructor
	 * @param {OAuthConfigs} clients
	 */
	constructor(clients: OAuthConfigs) {
		this.#clients = new Map<string, OAuthClient>(Object.entries(clients))
	}

	/**
	 * Get an OAuthInstance by name (github, google, etc)
	 *
	 * @param {string} clientName
	 * @returns {OAuthInstance}
	 */
	get(clientName: string): OAuthInstance {
		const hasFound = this.#clients.get(clientName)

		if (!hasFound) {
			throw new Error(`Client "${clientName}" not found.`)
		}

		return new OAuthInstance(hasFound)
	}
}

export { OAuthClients, OAuthClient, TokenResponse, OAuthConfigs }
