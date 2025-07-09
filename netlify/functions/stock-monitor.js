const fs = require('fs');
const https = require('https');

exports.handler = async (event, context) => {
  console.log('📦 Iniciando monitoreo de cambios de stock...');
  
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

    // Leer productos actuales
    if (!fs.existsSync('evergreen_products.json')) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Archivo de productos no encontrado',
          message: 'Ejecutar scraping primero'
        })
      };
    }

    const currentData = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));
    const currentProducts = currentData.products || [];

    // Leer productos anteriores desde archivo de backup
    let previousProducts = [];
    const backupFile = 'evergreen_products_backup.json';
    
    if (fs.existsSync(backupFile)) {
      try {
        const previousData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        previousProducts = previousData.products || [];
      } catch (error) {
        console.log('⚠️ No se pudo leer el backup anterior');
      }
    }

    // Analizar cambios específicos de stock/availability
    const stockChanges = [];
    const newlyAvailable = [];
    const newlyUnavailable = [];
    
    currentProducts.forEach(product => {
      const previous = previousProducts.find(prev => 
        (prev.sku && prev.sku === product.sku) || prev.name === product.name
      );
      
      if (previous) {
        // Cambio en availability
        if (previous.availability !== product.availability) {
          stockChanges.push({
            name: product.name,
            sku: product.sku,
            previousStock: previous.availability,
            currentStock: product.availability,
            price: product.price,
            link: product.link
          });
          
          // Categorizar cambios
          if (previous.availability === 'No está disponible' && 
              (product.availability === null || product.availability === 'Disponible')) {
            newlyAvailable.push(product);
          }
          
          if ((previous.availability === null || previous.availability === 'Disponible') && 
              product.availability === 'No está disponible') {
            newlyUnavailable.push(product);
          }
        }
      }
    });

    // Resultado del análisis
    const analysis = {
      timestamp: new Date().toISOString(),
      totalProducts: currentProducts.length,
      stockChangesDetected: stockChanges.length,
      newlyAvailable: newlyAvailable.length,
      newlyUnavailable: newlyUnavailable.length,
      changes: stockChanges,
      summary: {
        shouldTriggerUpdate: stockChanges.length > 0,
        criticalChanges: newlyAvailable.length > 0 || newlyUnavailable.length > 0
      }
    };

    console.log(`📊 Análisis completado: ${stockChanges.length} cambios de stock detectados`);
    
    if (newlyAvailable.length > 0) {
      console.log(`✅ Productos ahora disponibles: ${newlyAvailable.map(p => p.name).join(', ')}`);
    }
    
    if (newlyUnavailable.length > 0) {
      console.log(`❌ Productos ahora agotados: ${newlyUnavailable.map(p => p.name).join(', ')}`);
    }

    // Crear backup del estado actual para la próxima comparación
    fs.writeFileSync(backupFile, JSON.stringify(currentData, null, 2));
    console.log('💾 Backup del estado actual guardado');

    // Si hay cambios críticos de stock, triggear rebuild automáticamente
    if (analysis.summary.criticalChanges && process.env.NETLIFY_BUILD_HOOK) {
      console.log('🚀 Cambios críticos detectados, iniciando rebuild...');
      
      try {
        const buildResult = await triggerNetlifyBuild(process.env.NETLIFY_BUILD_HOOK);
        analysis.buildTriggered = {
          success: true,
          timestamp: new Date().toISOString(),
          reason: 'Cambios críticos de stock detectados',
          buildResult
        };
        console.log('✅ Rebuild iniciado por cambios de stock');
      } catch (error) {
        console.error('❌ Error al triggear rebuild:', error.message);
        analysis.buildTriggered = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(analysis, null, 2)
    };

  } catch (error) {
    console.error('💥 Error en monitoreo de stock:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Error en el monitoreo de stock'
      })
    };
  }
};

// Función auxiliar para triggear builds en Netlify
async function triggerNetlifyBuild(buildHookUrl) {
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
      trigger: 'stock-change-monitor',
      timestamp: new Date().toISOString()
    }));
    
    req.end();
  });
}
