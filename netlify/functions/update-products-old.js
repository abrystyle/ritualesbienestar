const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

exports.handler = async (event, context) => {
  console.log('🚀 Iniciando actualización de productos con Git API...');
  
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

    const startTime = Date.now();
    const results = {
      scraping: null,
      fileGeneration: null,
      gitCommit: null,
      errors: []
    };

    // PASO 1: Ejecutar scraping
    console.log('📡 Ejecutando scraper...');
    let productsData;
    try {
      const scrapingOutput = execSync('node scraper.js', { 
        encoding: 'utf8',
        timeout: 120000
      });
      
      // Leer datos generados en el entorno temporal
      if (fs.existsSync('evergreen_products.json')) {
        productsData = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));
        results.scraping = {
          success: true,
          productsCount: productsData.products?.length || 0,
          timestamp: new Date().toISOString(),
          output: scrapingOutput.substring(0, 200)
        };
        console.log(`✅ Scraping completado: ${productsData.products?.length || 0} productos`);
      } else {
        throw new Error('No se generó el archivo evergreen_products.json');
      }
      
    } catch (error) {
      console.error('❌ Error en scraping:', error.message);
      results.errors.push(`Scraping: ${error.message}`);
      results.scraping = { success: false, error: error.message };
    }

    if (!productsData || !productsData.products) {
      throw new Error('No se pudieron obtener datos válidos de productos');
    }

    // PASO 2: Generar archivos Markdown en memoria
    console.log('📝 Generando archivos Markdown en memoria...');
    const markdownFiles = [];
    
    try {
      productsData.products.forEach(product => {
        const slug = createSlug(product.name);
        const content = generateMarkdownContent(product);
        
        markdownFiles.push({
          path: `src/content/products/${slug}.md`,
          content: content
        });
      });
      
      results.fileGeneration = {
        success: true,
        filesGenerated: markdownFiles.length,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ ${markdownFiles.length} archivos Markdown generados en memoria`);
    } catch (error) {
      console.error('❌ Error generando Markdown:', error.message);
      results.errors.push(`Markdown generation: ${error.message}`);
      results.fileGeneration = { success: false, error: error.message };
    }

    // PASO 3: Commit archivos via Git API
    if (markdownFiles.length > 0) {
      console.log('📤 Committeando archivos via GitHub API...');
      
      try {
        // Preparar archivos para commit
        const filesToCommit = [
          {
            path: 'evergreen_products.json',
            content: JSON.stringify(productsData, null, 2)
          },
          ...markdownFiles
        ];
        
        const commitResult = await commitFilesToGitHub(filesToCommit);
        
        results.gitCommit = {
          success: true,
          commitSha: commitResult.sha,
          commitUrl: commitResult.html_url,
          filesCommitted: filesToCommit.length,
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Archivos committeados exitosamente: ${commitResult.sha}`);
        
      } catch (error) {
        console.error('❌ Error en commit:', error.message);
        results.errors.push(`Git commit: ${error.message}`);
        results.gitCommit = { success: false, error: error.message };
      }
    }

    const endTime = Date.now();
    const response = {
      success: results.errors.length === 0,
      timestamp: new Date().toISOString(),
      duration: `${endTime - startTime}ms`,
      productsProcessed: productsData.products?.length || 0,
      filesCommitted: markdownFiles.length + 1, // +1 for JSON file
      results,
      message: results.errors.length === 0 
        ? `🎉 Actualización exitosa: ${productsData.products?.length} productos procesados, ${markdownFiles.length + 1} archivos committeados`
        : `⚠️ Completado con errores: ${results.errors.join(', ')}`
    };

    console.log('📊 Resultado final:', response.message);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('💥 Error general:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Error interno del servidor'
      })
    };
  }
};

// Función auxiliar para triggear builds en Netlify
async function triggerNetlifyBuild(buildHookUrl) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(buildHookUrl, options, (res) => {
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
          reject(new Error(`Build hook falló con status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({
      trigger: 'auto-stock-update',
      timestamp: new Date().toISOString()
    }));
    
    req.end();
  });
}
