// /functions/api/auth0-callback.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  // Обмениваем код на токен доступа от Auth0
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
    return new Response('Failed to fetch access token from Auth0', { status: 500 });
  }

  // Возвращаем HTML, который передаст "пропуск" (токен) в Decap CMS
  const html = `
    <!DOCTYPE html>
    <html><body><script>
      (function() {
        const data = { token: "${tokenData.access_token}" };
        window.opener.postMessage("authorization:proxy:success:" + JSON.stringify(data), window.location.origin);
        window.close();
      })();
    </script></body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
