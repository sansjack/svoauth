export type Scopes = {
	values: string[]
	delimiter?: ' ' | ',' | ':'
}

export interface OAuthClient {
	clientId: string
	clientSecret: string
	authorizeUrl: string
	tokenUrl: string
	revokeTokenUrl?: string
	refreshTokenUrl?: string
	redirectUri: string
	pkce?: boolean
	scopes: Scopes
	params?: Record<string, string>[]
}

export interface TokenResponse {
	id_token: string
	access_token: string
	token_type: string
	expires_in?: number
	expires_at?: number
	refresh_token?: string
	scope?: string
	[key: string]: any
}

export interface Tokens {
	hasAccessToken(): boolean
	hasRefreshToken(): boolean
	accessToken(): string
	refreshToken(): string
	expiresAt(): Date | undefined
	refreshToken(): string
	idToken(): string
}

export type OAuthClients = Map<string, OAuthClient>
export type OAuthConfigs = Record<string, OAuthClient>
