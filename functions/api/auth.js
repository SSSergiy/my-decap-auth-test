// This file handles both /api/auth and /api/callback

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    const GITHUB_CLIENT_ID = env.GITHUB_CLIENT_ID;
    const GITHUB_CLIENT_SECRET = env.GITHUB_CLIENT_SECRET;

    // --- Step 1: Handle the initial authentication request ---
    if (url.pathname === '/api/auth') {
        const redirectUrl = new URL('https://github.com/login/oauth/authorize');
        redirectUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
        redirectUrl.searchParams.set('redirect_uri', url.origin + '/api/callback');
        redirectUrl.searchParams.set('scope', 'repo,user');
        return Response.redirect(redirectUrl.href, 302);
    }

    // --- Step 2: Handle the callback from GitHub ---
    if (url.pathname === '/api/callback') {
        const code = url.searchParams.get('code');
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
            }),
        });
        const data = await response.json();

        // This is the HTML that will be sent to the popup window
        const content = `
            <!DOCTYPE html>
            <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage('authorization:github:success:${JSON.stringify(data)}', '*');
                  window.close();
                }
              </script>
              <p>Authentication successful! You can now close this window.</p>
            </body>
            </html>`;
        return new Response(content, { headers: { 'Content-Type': 'text/html' } });
    }

    // --- Fallback for any other requests ---
    return new Response('Not Found', { status: 404 });
}
