// /functions/api/auth0-login.js
export async function onRequest(context) {
  const { env } = context;

  const authUrl = new URL(`https://${env.AUTH0_DOMAIN}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', env.AUTH0_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', new URL(context.request.url).origin + '/api/auth0-callback');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('audience', `https://${env.AUTH0_DOMAIN}/api/v2/`); // <-- Важно для получения JWT

  return Response.redirect(authUrl.toString(), 302);
}
