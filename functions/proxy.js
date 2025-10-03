// netlify/functions/proxy.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // CORS Preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
      body: '',
    };
  }

  const GITHUB_PAT = process.env.GITHUB_PAT;
  const path = event.queryStringParameters.path;
  const repo = 'SSSergiy/my-decap-auth-test';
  const url = `https://api.github.com/repos/${repo}/contents/${path.replace(/^\//, '')}`;

  try {
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        'Authorization': `token ${GITHUB_PAT}`,
        'User-Agent': 'DecapCMS-Proxy-Netlify',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: event.body,
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      body: data,
      headers: {
        'Content-Type': response.headers.get('Content-Type'),
        'Access-Control-Allow-Origin': '*',
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch from GitHub' }),
    };
  }
};
