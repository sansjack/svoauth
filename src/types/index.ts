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
	accessToken: string
	tokenType?: string
	expiresIn?: number
	refreshToken?: string
	scope?: string
	[key: string]: any
}

export type OAuthClients = Map<string, OAuthClient>
export type OAuthConfigs = Record<string, OAuthClient>
