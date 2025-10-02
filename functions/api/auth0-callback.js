// /functions/api/auth0-callback.js
import { sign } from '@tsndr/cloudflare-worker-jwt';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  // 1. Обмениваем код авторизации на Access Token от Auth0
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
    return new Response('Failed to fetch access token', { status: 500 });
  }

  // 2. Получаем профиль пользователя от Auth0
  const userResponse = await fetch(`https://${env.AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userResponse.json();

  // 3. Генерируем наш собственный JWT для Decap CMS, подписанный нашим секретом
  const decapCmsToken = await sign({
      email: userData.email,
      name: userData.name,
    },
    env.JWT_SECRET
  );

  // 4. Возвращаем HTML, который передаст наш токен в Decap CMS
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Authorizing...</title></head>
      <body>
        <script>
          (function() {
            const opener = window.opener;
            if (opener) {
              opener.postMessage(
                'authorization:github:success:${JSON.stringify({
                  provider: "github",
                  token: "${decapCmsToken}"
                })}',
                '${url.origin}'
              );
              window.close();
            }
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
