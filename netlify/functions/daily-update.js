const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

exports.handler = async (event, context) => {
  console.log('🌅 Iniciando proceso diario de actualización de productos...');
  
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
    const dailyResults = {
      scraping: null,
      generation: null,
      buildTrigger: null,
      summary: {
        totalErrors: 0,
        productsProcessed: 0,
        newProducts: 0,
        updatedProducts: 0
      }
    };

    // Leer productos anteriores para comparación
    let previousProducts = [];
    try {
      if (fs.existsSync('evergreen_products.json')) {
        const previousData = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));
        previousProducts = previousData.products || [];
      }
    } catch (error) {
      console.log('ℹ️ No hay datos anteriores de productos');
    }

    // PASO 1: Scraping
    console.log('📡 PASO 1: Ejecutando scraping...');
    try {
      const scrapingOutput = execSync('node scraper.js', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 180000 // 3 minutos timeout
      });
      
      dailyResults.scraping = {
        success: true,
        timestamp: new Date().toISOString(),
        output: scrapingOutput.split('\n').slice(-5).join('\n') // Últimas 5 líneas
      };
      
      console.log('✅ Scraping completado exitosamente');
    } catch (error) {
      console.error('❌ Error en scraping:', error.message);
      dailyResults.scraping = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      dailyResults.summary.totalErrors++;
    }

    // PASO 2: Generación de archivos Markdown
    console.log('📝 PASO 2: Generando archivos Markdown...');
    try {
      const generationOutput = execSync('node generate_simple.cjs', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 90000 // 1.5 minutos timeout
      });
      
      dailyResults.generation = {
        success: true,
        timestamp: new Date().toISOString(),
        output: generationOutput.split('\n').slice(-3).join('\n') // Últimas 3 líneas
      };
      
      console.log('✅ Generación de archivos completada');
    } catch (error) {
      console.error('❌ Error en generación:', error.message);
      dailyResults.generation = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      dailyResults.summary.totalErrors++;
    }

    // PASO 3: Analizar cambios
    console.log('🔍 PASO 3: Analizando cambios...');
    try {
      if (fs.existsSync('evergreen_products.json')) {
        const currentData = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));
        const currentProducts = currentData.products || [];
        
        dailyResults.summary.productsProcessed = currentProducts.length;
        
        // Comparar con productos anteriores
        const previousIds = new Set(previousProducts.map(p => p.sku || p.name));
        const currentIds = new Set(currentProducts.map(p => p.sku || p.name));
        
        dailyResults.summary.newProducts = currentProducts.filter(p => 
          !previousIds.has(p.sku || p.name)
        ).length;
        
        dailyResults.summary.updatedProducts = currentProducts.filter(p => {
          const previous = previousProducts.find(prev => 
            (prev.sku && prev.sku === p.sku) || prev.name === p.name
          );
          return previous && (previous.price !== p.price || JSON.stringify(previous.tags) !== JSON.stringify(p.tags));
        }).length;
        
        console.log(`📊 Productos procesados: ${dailyResults.summary.productsProcessed}`);
        console.log(`🆕 Productos nuevos: ${dailyResults.summary.newProducts}`);
        console.log(`🔄 Productos actualizados: ${dailyResults.summary.updatedProducts}`);
      }
    } catch (error) {
      console.log('⚠️ Error analizando cambios:', error.message);
    }

    // PASO 4: Triggear build si hay cambios o errores mínimos
    const shouldBuild = dailyResults.summary.newProducts > 0 || 
                       dailyResults.summary.updatedProducts > 0 || 
                       dailyResults.summary.totalErrors <= 1;

    if (shouldBuild && process.env.NETLIFY_BUILD_HOOK) {
      console.log('🚀 PASO 4: Iniciando rebuild del sitio...');
      try {
        const buildResult = await triggerNetlifyBuild(process.env.NETLIFY_BUILD_HOOK);
        
        dailyResults.buildTrigger = {
          success: true,
          timestamp: new Date().toISOString(),
          reason: 'Cambios detectados en productos',
          buildResult
        };
        
        console.log('✅ Build iniciado correctamente');
      } catch (error) {
        console.error('❌ Error al triggear build:', error.message);
        dailyResults.buildTrigger = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        dailyResults.summary.totalErrors++;
      }
    } else {
      console.log('⏭️ Build omitido: Sin cambios significativos o demasiados errores');
      dailyResults.buildTrigger = {
        skipped: true,
        reason: shouldBuild ? 'NETLIFY_BUILD_HOOK no configurado' : 'Sin cambios o demasiados errores',
        timestamp: new Date().toISOString()
      };
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const finalResponse = {
      success: dailyResults.summary.totalErrors === 0,
      timestamp: new Date().toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      dailyResults,
      message: generateSummaryMessage(dailyResults)
    };

    console.log('🎯 Proceso diario completado:', finalResponse.message);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(finalResponse, null, 2)
    };

  } catch (error) {
    console.error('💥 Error crítico en proceso diario:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Error crítico en el proceso diario'
      })
    };
  }
};

function triggerNetlifyBuild(buildHookUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(buildHookUrl);
    
    const postData = JSON.stringify({
      trigger: 'daily-products-update',
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

function generateSummaryMessage(results) {
  const { summary, scraping, generation, buildTrigger } = results;
  
  if (summary.totalErrors > 1) {
    return `❌ Proceso con errores críticos (${summary.totalErrors} errores)`;
  }
  
  if (summary.newProducts > 0 || summary.updatedProducts > 0) {
    return `✅ Actualización exitosa: ${summary.newProducts} nuevos, ${summary.updatedProducts} actualizados, ${summary.productsProcessed} total`;
  }
  
  if (summary.totalErrors === 1) {
    return `⚠️ Proceso con errores menores pero completado: ${summary.productsProcessed} productos`;
  }
  
  return `ℹ️ Sin cambios: ${summary.productsProcessed} productos verificados`;
}
