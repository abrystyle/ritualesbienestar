const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  console.log('🚀 Iniciando actualización de productos...');
  
  try {
    // Verificar que sea una ejecución autorizada
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
      generation: null,
      build: null,
      errors: []
    };

    console.log('📡 Ejecutando scraper...');
    try {
      // Ejecutar el scraper
      const scrapingOutput = execSync('node scraper.js', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 120000 // 2 minutos timeout
      });
      
      results.scraping = {
        success: true,
        output: scrapingOutput.substring(0, 500), // Limitar output
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Scraping completado');
    } catch (error) {
      console.error('❌ Error en scraping:', error.message);
      results.errors.push(`Scraping: ${error.message}`);
      results.scraping = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    console.log('📝 Generando archivos Markdown...');
    try {
      // Ejecutar el generador de archivos Markdown
      const generationOutput = execSync('node generate_simple.cjs', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 60000 // 1 minuto timeout
      });
      
      results.generation = {
        success: true,
        output: generationOutput.substring(0, 500), // Limitar output
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Generación de archivos completada');
    } catch (error) {
      console.error('❌ Error en generación:', error.message);
      results.errors.push(`Generation: ${error.message}`);
      results.generation = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    // Verificar si hay productos actualizados y analizar cambios de stock
    let productsCount = 0;
    let stockChanges = [];
    let shouldTriggerBuild = false;
    
    try {
      if (fs.existsSync('evergreen_products.json')) {
        const productsData = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));
        productsCount = productsData.products ? productsData.products.length : 0;
        
        // Comparar con backup anterior para detectar cambios de stock
        const backupFile = 'evergreen_products_backup.json';
        if (fs.existsSync(backupFile)) {
          try {
            const previousData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
            const previousProducts = previousData.products || [];
            const currentProducts = productsData.products || [];
            
            // Detectar cambios específicos de stock/availability
            currentProducts.forEach(product => {
              const previous = previousProducts.find(prev => 
                (prev.sku && prev.sku === product.sku) || prev.name === product.name
              );
              
              if (previous) {
                if (previous.availability !== product.availability ||
                    previous.price !== product.price ||
                    JSON.stringify(previous.tags) !== JSON.stringify(product.tags)) {
                  
                  stockChanges.push({
                    name: product.name,
                    sku: product.sku,
                    previousStock: previous.availability,
                    currentStock: product.availability,
                    priceChanged: previous.price !== product.price,
                    stockChanged: previous.availability !== product.availability
                  });
                  
                  // Stock change is critical
                  if (previous.availability !== product.availability) {
                    shouldTriggerBuild = true;
                  }
                }
              }
            });
            
            console.log(`📊 Cambios detectados: ${stockChanges.length} productos`);
            if (stockChanges.length > 0) {
              console.log('🔄 Productos con cambios:', stockChanges.map(c => `${c.name}${c.stockChanged ? ' (STOCK)' : ''}`).join(', '));
            }
            
          } catch (error) {
            console.log('⚠️ No se pudo comparar con backup anterior');
          }
        }
        
        // Crear nuevo backup
        fs.writeFileSync('evergreen_products_backup.json', JSON.stringify(productsData, null, 2));
      }
    } catch (error) {
      console.log('⚠️ No se pudo leer el archivo de productos');
    }

    // Si hay cambios críticos de stock, triggear build automáticamente
    if (shouldTriggerBuild && process.env.NETLIFY_BUILD_HOOK) {
      console.log('🚀 Cambios críticos detectados, triggeando build...');
      try {
        const buildResult = await triggerNetlifyBuild(process.env.NETLIFY_BUILD_HOOK);
        results.autoBuild = {
          triggered: true,
          reason: 'Cambios críticos de stock detectados',
          result: buildResult
        };
      } catch (error) {
        console.log('⚠️ Error triggeando build automático:', error.message);
        results.autoBuild = {
          triggered: false,
          error: error.message
        };
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const response = {
      success: results.errors.length === 0,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      productsCount,
      stockChanges: stockChanges.length,
      autoBuildTriggered: shouldTriggerBuild,
      results,
      message: results.errors.length === 0 
        ? `Actualización exitosa: ${productsCount} productos procesados${stockChanges.length > 0 ? `, ${stockChanges.length} cambios detectados` : ''}`
        : `Actualización con errores: ${results.errors.join(', ')}`
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
      headers: {
        'Content-Type': 'application/json'
      },
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
