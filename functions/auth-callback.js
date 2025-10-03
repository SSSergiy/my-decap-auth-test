// netlify/functions/auth-callback.js
exports.handler = async function(event, context) {
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        // Этот скрипт передает "пропуск" обратно в Decap CMS
        if (window.opener) {
          window.opener.postMessage("authorizing:github", "*");
        }
      </script>
    </body>
    </html>`;

  return {
    statusCode: 200,
    body: html,
  };
};
