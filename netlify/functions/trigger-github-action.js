const https = require('https');

exports.handler = async (event, context) => {
  console.log('🚀 Triggeando actualización via GitHub Actions...');
  
  try {
    // Verificar autorización
    const authToken = process.env.NETLIFY_FUNCTION_TOKEN;
    const providedToken = event.headers['x-netlify-token'] || event.queryStringParameters?.token;
    
    if (!authToken || providedToken !== authToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Token de autorización inválido' })
      };
    }

    // Triggear GitHub Action via repository_dispatch
    const result = await triggerGitHubAction();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'GitHub Action triggeada exitosamente',
        timestamp: new Date().toISOString(),
        result: result
      })
    };

  } catch (error) {
    console.error('💥 Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

async function triggerGitHubAction() {
  const owner = process.env.GITHUB_OWNER || 'tu-usuario';
  const repo = process.env.GITHUB_REPO || 'square-saturn';
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error('GITHUB_TOKEN no configurado');
  }

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      event_type: 'update-products',
      client_payload: {
        source: 'netlify-function',
        timestamp: new Date().toISOString()
      }
    });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/dispatches`,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'square-saturn-netlify',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve({ statusCode: res.statusCode, message: 'Action triggered' });
        } else {
          reject(new Error(`GitHub API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
