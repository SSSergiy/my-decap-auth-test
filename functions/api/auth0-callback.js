// /functions/api/auth0-callback.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  // 1. Обмениваем код на токен доступа от Auth0
  const tokenResponse = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      code: code,
      redirect_uri: url.origin + '/api/auth0-callback',
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error("Auth0 Token Error:", JSON.stringify(tokenData));
    return new Response('Failed to fetch access token from Auth0', { status: 500 });
  }

  // 2. Используем токен Auth0, чтобы получить профиль пользователя
  const userResponse = await fetch(`https://${env.AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userResponse.json();

  // 3. ИЩЕМ НАСТОЯЩИЙ GITHUB TOKEN ВНУТРИ ПРОФИЛЯ AUTH0
  const githubIdentity = userData.identities && userData.identities.find(
    (identity) => identity.provider === 'github'
  );

  if (!githubIdentity || !githubIdentity.access_token) {
    console.error("GitHub Identity or Token not found in user profile:", JSON.stringify(userData));
    return new Response('GitHub token not found in Auth0 user profile. Did you add "repo" scope?', { status: 500 });
  }

  const githubAccessToken = githubIdentity.access_token;

  // 4. Возвращаем HTML, который передаст НАСТОЯЩИЙ токен GitHub в Decap CMS
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Authorizing...</title></head>
      <body>
        <script>
          (function() {
            const data = {
              token: "${githubAccessToken}", // <-- Передаем настоящий токен
              provider: "github"
            };
            window.opener.postMessage("authorization:github:success:" + JSON.stringify(data), window.location.origin);
            window.close();
          })();
        </script>
        <p>Authorized! Closing this window...</p>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
