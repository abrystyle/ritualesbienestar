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

    // Verificar si hay productos actualizados
    let productsCount = 0;
    try {
      if (fs.existsSync('evergreen_products.json')) {
        const productsData = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));
        productsCount = productsData.products ? productsData.products.length : 0;
      }
    } catch (error) {
      console.log('⚠️ No se pudo leer el archivo de productos');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const response = {
      success: results.errors.length === 0,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      productsCount,
      results,
      message: results.errors.length === 0 
        ? `Actualización exitosa: ${productsCount} productos procesados`
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
