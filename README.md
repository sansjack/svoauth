## 🔐 svoauth — Lightweight Config-Driven OAuth for SvelteKit

`svoauth` is a minimal and flexible OAuth 2.0 wrapper designed for SvelteKit projects. It uses a config-driven approach so you can easily plug in providers like GitHub, Google, and more.

---

### ⚙️ Configuration

Define your OAuth clients in a central `oauth.ts` config file:

### 📦 Features

- ⚙️ Config-driven approach
- ⚡️ Minimal SvelteKit integration
- 🔄 Supports token exchange, refresh, and revoke
- 💻 Server side rendering only (no client-side code)
- 🔐 PKCE support (e.g., for Google)
- 🌐 Easily configurable for multiple providers

### ❓ Why Did I Make This?
I was working on a SaaS project of mine that needs a lot of integrations with different providers. I wanted to try abstract as much as possible out of my codebase for dealing with the OAuth side of things as i will be adding A LOT of different integrations in the future.

This was really made for my own use but I decided to make a public package so that others can use it as well. The main use of this is so I can get the users access tokens and refresh tokens so i can use them on their behalf to fetch data. 

> [!WARNING]  
> This package is not meant for the use of authentication but rather for the use of authorization and retrieving access tokens. This should also ONLY be used on the server-side.

```ts
// src/lib/server/oauth.ts
import { env } from '$env/dynamic/private';
import { OAuthHandler, type OAuthConfigs } from 'svoauth';

const clients: OAuthConfigs = {
    github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        redirectUri: 'http://localhost:5173/integration/callback/github',
        scopes: {
            values: ['read:user', 'read:org', 'repo:status', 'read:project']
        }
    },
    google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        pkce: true,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        refreshTokenUrl: 'https://oauth2.googleapis.com/token',
        revokeTokenUrl: 'https://oauth2.googleapis.com/revoke',
        redirectUri: 'http://localhost:5173/integration/callback/google',
        params: [{ access_type: 'offline' }],
        scopes: {
            values: ['email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly']
        }
    }
};

export const svoAuth = new OAuthHandler(clients);
```

---

### 🔗 Link Route

Create a route that redirects users to the provider's authorization page.

```ts
// src/routes/link/[client]/+server.ts
import { svoAuth } from '$lib/server/oauth';
import { redirect } from '@sveltejs/kit';

export const GET = async (event) => {
    const clientName = event.params.client;
    const authUrl = svoAuth.get(clientName).generateAuthorizeUrl(event);
    throw redirect(303, authUrl);
};
```
---

### 🎯 Callback Route

Create a callback route to handle the OAuth response and exchange the code for a token.

```ts
// src/routes/callback/[client]/+server.ts
import { json } from '@sveltejs/kit';
import { svoAuth } from '$lib/server/oauth';

export const GET = async (event) => {
    const clientName = event.params.client;
    const tokens = await svoAuth.get(clientName).exchangeCodeForToken(event);

    const accessToken = tokens.accessToken();
    return json({ token: accessToken });
};
```

---

### ✅ Example Flow

1. Navigate to `/link/github`
2. You get redirected to GitHub to authorize
3. After auth, GitHub redirects to `/callback/github`
4. The access token is extracted and returned as JSON


---
