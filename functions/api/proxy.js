// functions/api/proxy.js
import { verify } from '@tsndr/cloudflare-worker-jwt';

async function fetchGitHubAPI(request, env, path) {
    const repo = 'SSSergiy/my-decap-auth-test';
    const url = `https://api.github.com/repos/${repo}/contents/${path.replace(/^\//, '')}`; // Убираем начальный слэш
    const body = request.method === 'GET' || request.method === 'DELETE' ? undefined : await request.text();

    // Пробрасываем commit-информацию для Decap CMS
    const cmsInfo = body ? JSON.parse(body).cms : false;
    const commitBody = cmsInfo ? JSON.stringify({ ...JSON.parse(body), files: undefined }) : body;

    const githubResponse = await fetch(url, {
        method: request.method,
        headers: {
            'Authorization': `token ${env.GITHUB_PAT}`,
            'User-Agent': 'DecapCMS-Proxy',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: commitBody,
    });

    // Для запроса на удаление файла GitHub возвращает 200 OK с пустым телом,
    // а Decap CMS ожидает JSON. Формируем корректный ответ.
    if (request.method === 'DELETE' && githubResponse.ok) {
        const commitData = JSON.parse(body);
        return new Response(JSON.stringify({ commit: { sha: commitData.sha } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(githubResponse.body, {
        status: githubResponse.status,
        headers: { 'Content-Type': githubResponse.headers.get('Content-Type') },
    });
}

export async function onRequest(context) {
    const { request, env } = context;

    // Decap CMS отправляет предварительный OPTIONS запрос
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            },
        });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Missing Authorization Header', { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    try {
        const jwksUrl = `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`;
        const isValid = await verify(token, jwksUrl);
        if (!isValid) {
            return new Response('Invalid Auth0 Token', { status: 401 });
        }
    } catch (err) {
        return new Response(err.message, { status: 401 });
    }

    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    if (!path) {
        return new Response('Missing path parameter', { status: 400 });
    }

    return fetchGitHubAPI(request, env, path);
}
