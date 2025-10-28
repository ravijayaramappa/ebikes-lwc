// auth.js - Vanilla JavaScript authorization logic

/**
 * Performs authorization check
 */
async function checkAuthorization() {
    try {
        const clientId = getMetaContent('sf.client_id');
        const authBaseUrl = getMetaContent('sf.auth_base_url');
        const redirectUri = getMetaContent('sf.redirect_uri');
        const autoAuth = getMetaContent('sf.auto_auth');
        const scope = getMetaContent('sf.scope');
        const lightningOutAppId = getMetaContent('sf.lightning_out_app_id');
        const oauth = new PKCEOAuth({ clientId, authBaseUrl, redirectUri, autoAuth, scope });
        const token = await oauth.getAccessContext();
        if (!token) return; // likely redirected

        const instanceUrl = token.instance_url || getMetaContent('sf.instance_url');
        if (!instanceUrl) throw new Error('Missing instance_url; not provided by token or meta tag');

        const frontdoorUrl = await getFrontdoorUrl(instanceUrl, token.access_token);
        return frontdoorUrl;
    } catch (error) {
        console.error('Authorization error:', error);
        return null;
    }
}

/**
 * Redirects to the main Angular application
 */
function redirectToApp(frontdoorUrl) {
    const targetUrl = new URL('/', location.origin);
    targetUrl.searchParams.set('frontdoor-url', frontdoorUrl);
    window.location.href = targetUrl.href;
}

/**
 * Shows an error message to the user
 */
function showAuthError() {
    const authMessage = document.getElementById('auth-message');
    authMessage.textContent = 'Authorization failed. Please contact support.';
    authMessage.style.color = 'red';
}

// Main execution
window.onload = async function() {
    try {
        const frontdoorUrl = await checkAuthorization();
        if (frontdoorUrl) {
            // Wait a moment to show success message
            await new Promise(resolve => setTimeout(resolve, 500));
            redirectToApp(frontdoorUrl);
        } else {
            showAuthError();
        }
    } catch (error) {
        console.error('Unexpected error during authorization:', error);
        showAuthError();
    }
};

// Lightning Out 2.0 configuration
// Meta-based config helpers
function getMetaContent(name) {
    const el = document.querySelector(`meta[name="${name}"]`);
    return el && typeof el.content === 'string' ? el.content.trim() : '';
}

function toBase64Url(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function generateRandomString(length = 64) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    let result = '';
    for (let i = 0; i < randomValues.length; i++) {
        result += charset[randomValues[i] % charset.length];
    }
    return result;
}

class PKCEOAuth {
    constructor(config) {
        this.clientId = config.clientId;
        const resolvedLogin = (config.authBaseUrl || getMetaContent('sf.auth_base_url'));
        this.authBaseUrl = resolvedLogin.replace(/\/$/, '');
        this.redirectUri = config.redirectUri || (window.location.origin + window.location.pathname);
        // Use requested scopes from meta; strip 'openid' to avoid id_token if present
        const configuredScope = (config.scope && config.scope.trim()) || getMetaContent('sf.scope');
        this.scope = (configuredScope.replace(/\bopenid\b/g, '').replace(/\s+/g, ' ').trim()) || 'api';
        this.storageKey = 'sf_pkce_auth_state';
        this.tokenKey = 'sf_oauth_token';
        this.autoAuth = config.autoAuth !== 'false' && config.autoAuth !== false;
        // oauth flow: 'pkce' (default) or 'implicit'
        this.flow = (config.flow || getMetaContent('sf.oauth_flow')).toLowerCase();
        // Optional backend proxy to avoid browser CORS for token exchange
        this.tokenProxyUrl = config.tokenProxyUrl || getMetaContent('sf.token_proxy_url');
    }

    async generateCodeChallenge(verifier) {
        const data = new TextEncoder().encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return toBase64Url(new Uint8Array(digest));
    }

    saveAuthState(state) {
        sessionStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    readAuthState() {
        const raw = sessionStorage.getItem(this.storageKey);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    clearAuthState() {
        sessionStorage.removeItem(this.storageKey);
    }

    saveToken(token) {
        // Do not persist id_token (JWT); LO 2.0 uses opaque access tokens only
        const { id_token, ...withoutIdToken } = token || {};
        const enriched = {
            ...withoutIdToken,
            saved_at: Date.now(),
            // Prefer expires_in if provided; otherwise default to 2 hours
            expires_at: token.expires_in ? (Date.now() + (Number(token.expires_in) * 1000)) : (Date.now() + 2 * 60 * 60 * 1000)
        };
        sessionStorage.setItem(this.tokenKey, JSON.stringify(enriched));
        return enriched;
    }

    readToken() {
        const raw = sessionStorage.getItem(this.tokenKey);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    isTokenValid(token) {
        if (!token) return false;
        return typeof token.expires_at === 'number' && Date.now() < token.expires_at - 60000; // 60s skew
    }

    buildAuthorizeUrl({ codeChallenge, state }) {
        const authorize = new URL(this.authBaseUrl + '/services/oauth2/authorize');
        const responseType = this.flow === 'implicit' ? 'token' : 'code';
        authorize.searchParams.set('response_type', responseType);
        authorize.searchParams.set('client_id', this.clientId);
        authorize.searchParams.set('redirect_uri', this.redirectUri);
        authorize.searchParams.set('scope', this.scope);
        if (this.flow !== 'implicit') {
            authorize.searchParams.set('code_challenge', codeChallenge);
            authorize.searchParams.set('code_challenge_method', 'S256');
        }
        authorize.searchParams.set('state', state);
        return authorize.toString();
    }

    async beginAuth() {
        if (!this.clientId) throw new Error('Missing Salesforce Connected App client_id');
        const codeVerifier = generateRandomString(96);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        const state = generateRandomString(24);
        this.saveAuthState({ code_verifier: codeVerifier, state });
        const url = this.buildAuthorizeUrl({ codeChallenge, state });
        window.location.assign(url);
    }

    async handleRedirectCallbackIfPresent() {
        const url = new URL(window.location.href);
        // Handle OAuth error responses
        const oauthError = url.searchParams.get('error');
        if (oauthError) {
            const description = url.searchParams.get('error_description') || oauthError;
            // Clean error params from URL
            url.searchParams.delete('error');
            url.searchParams.delete('error_description');
            history.replaceState({}, document.title, url.toString());
            throw new Error(description);
        }
        // Implicit flow returns values in the url fragment (after '#')
        if (this.flow === 'implicit' && window.location.hash && window.location.hash.includes('access_token=')) {
            const fragment = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = fragment.get('access_token');
            if (accessToken) {
                const instanceUrl = fragment.get('instance_url');
                const expiresIn = fragment.get('expires_in');
                const tokenType = fragment.get('token_type');
                // Clean fragment to avoid re-processing
                history.replaceState({}, document.title, url.origin + url.pathname + url.search);
                return this.saveToken({ access_token: accessToken, instance_url: instanceUrl, expires_in: expiresIn, token_type: tokenType });
            }
        }
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        if (!code) return null;
        const saved = this.readAuthState();
        if (!saved || (state && state !== saved.state)) {
            throw new Error('State mismatch during OAuth callback');
        }
        const tokenEndpoint = this.tokenProxyUrl || (this.authBaseUrl + '/services/oauth2/token');
        const body = new URLSearchParams();
        body.set('grant_type', 'authorization_code');
        body.set('code', code);
        body.set('client_id', this.clientId);
        body.set('redirect_uri', this.redirectUri);
        body.set('code_verifier', saved.code_verifier);
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });
        if (!response.ok) {
            const errText = await response.text();
            // If CORS blocked the direct token call, recommend using implicit or a proxy
            if (!this.tokenProxyUrl) {
                console.error('Direct token exchange failed. Consider setting sf.oauth_flow=implicit or provide sf.token_proxy_url to avoid CORS.');
            }
            throw new Error(`Token exchange failed: ${response.status} ${errText}`);
        }
        const token = await response.json();
        this.clearAuthState();
        // Clean code and state from URL to avoid re-processing on reload
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        history.replaceState({}, document.title, url.toString());
        return this.saveToken(token);
    }

    async getAccessContext() {
        // If redirected back with ?code=, complete the exchange first
        const callbackToken = await this.handleRedirectCallbackIfPresent();
        if (callbackToken) return callbackToken;
        // Otherwise, use cached token or start auth if enabled
        const token = this.readToken();
        if (this.isTokenValid(token)) return token;
        if (this.autoAuth) {
            await this.beginAuth(); // will redirect
            return null; // unreachable in same session
        }
        throw new Error('No valid Salesforce session. Authentication required.');
    }
}


async function getFrontdoorUrl(instanceUrl, accessToken) {
    const lightningOutAppId = getMetaContent('sf.lightning_out_app_id');
    const base = instanceUrl.replace(/\/$/, '');
    const url = `${base}/services/oauth2/lightningoutsingleaccess?lightning_out_app_id=${encodeURIComponent(lightningOutAppId)}`;
    const bodyParams = new URLSearchParams();
    bodyParams.set('access_token', accessToken);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString()
    });
    if (!resp.ok) {
        const errorBody = await resp.text();
        throw new Error(`Lightning Out single access failed: ${resp.status} ${errorBody}`);
    }
    const data = await resp.json();
    const frontdoor = data.frontdoor_uri || data.frontdoorUrl || data.url || data.frontdoor;
    if (!frontdoor) throw new Error('No frontdoor URL returned from Salesforce');
    return frontdoor;
}
