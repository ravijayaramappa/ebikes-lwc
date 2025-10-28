// auth.js - Vanilla JavaScript authorization logic

/**
 * Performs authorization check
 * @returns {Promise<boolean>} true if authorized, false otherwise
 */
async function checkAuthorization() {
    debugger; // Debugger will pause here when authorization starts
    try {
        // TODO: Implement your actual authorization logic here
        // Examples:
        // - Check for tokens in URL parameters
        // - Validate session/cookies
        // - Make API call to verify authentication
        // - Check OAuth/SAML flows

        const authMessage = document.getElementById('auth-message');

        // Simulate auth check (replace with your actual logic)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Example: Check for an auth token in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            // Store token for later use
            sessionStorage.setItem('authToken', token);
            authMessage.textContent = 'Authorization successful! Redirecting...';
            return true;
        }

        // Example: Check if already authenticated
        const existingToken = sessionStorage.getItem('authToken');
        if (existingToken) {
            authMessage.textContent = 'Already authorized! Redirecting...';
            return true;
        }

        // For demo purposes, allow access anyway
        // Remove this in production and implement proper auth
        authMessage.textContent = 'Demo mode - proceeding without authentication...';
        return true;

    } catch (error) {
        console.error('Authorization error:', error);
        return false;
    }
}

/**
 * Redirects to the main Angular application
 */
function redirectToApp() {
    // Preserve any query parameters if needed
    const urlParams = new URLSearchParams(window.location.search);
    const preservedParams = new URLSearchParams();

    // Example: preserve specific params but remove 'token'
    for (const [key, value] of urlParams) {
        if (key !== 'token') {
            preservedParams.append(key, value);
        }
    }

    const queryString = preservedParams.toString();
    const targetUrl = queryString ? `/index.html?${queryString}` : '/index.html';

    window.location.href = targetUrl;
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
        const isAuthorized = await checkAuthorization();

        if (isAuthorized) {
            // Wait a moment to show success message
            await new Promise(resolve => setTimeout(resolve, 500));
            redirectToApp();
        } else {
            showAuthError();
        }
    } catch (error) {
        console.error('Unexpected error during authorization:', error);
        showAuthError();
    }
};
