// netlify/functions/proxy.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // ШАГ А: Отвечаем на "проверочный" запрос браузера (CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No Content
      headers: {
        'Access-Control-Allow-Origin': '*', // В продакшене лучше указать домен сайта
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    };
  }

  // ШАГ Б: Проверяем, прислал ли Decap CMS "пропуск"
  if (!event.headers.authorization) {
    return { statusCode: 401, body: 'Missing Authorization Header' };
  }

  // Здесь должна быть проверка "пропуска" от Auth0, но мы ее пока пропустим для простоты отладки.

  const GITHUB_PAT = process.env.GITHUB_PAT;
  if (!GITHUB_PAT) {
    return { statusCode: 500, body: 'Ошибка сервера: GITHUB_PAT не настроен.' };
  }

  const path = event.queryStringParameters.path;
  if (!path) {
    return { statusCode: 400, body: 'Отсутствует параметр "path".' };
  }

  // ШАГ В: Общаемся с GitHub от имени Посредника
  const repo = 'SSSergiy/my-decap-auth-test';
  const url = `https://api.github.com/repos/${repo}/contents/${path.replace(/^\//, '')}`;

  try {
    const githubResponse = await fetch(url, {
      method: event.httpMethod,
      headers: {
        'Authorization': `token ${GITHUB_PAT}`,
        'User-Agent': 'DecapCMS-Proxy-Netlify',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: event.body,
    });

    const data = await githubResponse.text();

    // ШАГ Г: Пересылаем ответ от GitHub обратно в Decap CMS
    return {
      statusCode: githubResponse.status,
      body: data,
      headers: {
        'Content-Type': githubResponse.headers.get('Content-Type'),
        'Access-Control-Allow-Origin': '*', // Этот заголовок тоже нужен
      },
    };
  } catch (error) {
    return { statusCode: 502, body: `Ошибка связи с GitHub: ${error.message}` };
  }
};
