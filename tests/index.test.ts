// import { OAuthHandler } from '../src/index'
// import { expect, test } from 'bun:test'

// const mockClients: OAuthClients = new Map([
// 	[
// 		'test',
// 		{
// 			name: 'test',
// 			clientId: 'test-client-id',
// 			clientSecret: 'test-client-secret',
// 			authorizeUrl: 'https://example.com/oauth/authorize',
// 			tokenUrl: 'https://example.com/oauth/token',
// 			redirectUri: 'http://localhost:3000/callback',
// 			scopes: ['read', 'write'],
// 		},
// 	],
// ])

// test('generateAuthorizeUrl creates a valid URL', () => {
// 	const handler = new OAuthHandler(mockClients)
// 	const url = handler.generateAuthorizeUrl('test')

// 	const parsedUrl = new URL(url)

// 	expect(parsedUrl.origin + parsedUrl.pathname).toBe(
// 		'https://example.com/oauth/authorize'
// 	)

// 	const params = parsedUrl.searchParams
// 	expect(params.get('client_id')).toBe('test-client-id')
// 	expect(params.get('redirect_uri')).toBe('http://localhost:3000/callback')
// 	expect(params.get('scope')).toBe('read write')

// 	const state = params.get('state')
// 	expect(state).toBeDefined()
// 	expect(typeof state).toBe('string')
// 	expect(state!.length).toBeGreaterThan(0)
// })
