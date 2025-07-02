const https = require('https');

exports.handler = async (event, context) => {
  console.log('🔄 Iniciando rebuild del sitio...');
  
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

    // Obtener el hook de build de Netlify
    const buildHookUrl = process.env.NETLIFY_BUILD_HOOK;
    
    if (!buildHookUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'NETLIFY_BUILD_HOOK no configurado' })
      };
    }

    // Triggear el build
    const result = await triggerBuild(buildHookUrl);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Build iniciado correctamente',
        timestamp: new Date().toISOString(),
        buildResult: result
      })
    };

  } catch (error) {
    console.error('❌ Error al triggear build:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

function triggerBuild(buildHookUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(buildHookUrl);
    
    const postData = JSON.stringify({
      trigger: 'products-update',
      timestamp: new Date().toISOString()
    });
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            statusCode: res.statusCode,
            response: data
          });
        } else {
          reject(new Error(`Build hook failed with status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}
