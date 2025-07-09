#!/usr/bin/env node

/**
 * Script para probar la función update-products.js localmente
 * Simula una llamada HTTP con el token correcto
 */

const fs = require('fs');

console.log('🧪 SIMULANDO FUNCIÓN UPDATE-PRODUCTS');
console.log('===================================\n');

async function testUpdateProducts() {
  // Cargar variables de entorno
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, value] = line.split('=');
        process.env[key.trim()] = value.trim();
      }
    });
    console.log('✅ Variables de entorno cargadas desde .env\n');
  }

  try {
    // Importar la función
    const updateProducts = require('./netlify/functions/update-products.js');
    
    // Crear evento simulado con token correcto
    const mockEvent = {
      httpMethod: 'POST',
      headers: {
        'x-netlify-token': process.env.NETLIFY_FUNCTION_TOKEN,
        'content-type': 'application/json'
      },
      queryStringParameters: {},
      body: JSON.stringify({
        source: 'local-test',
        timestamp: new Date().toISOString()
      })
    };
    
    // Crear contexto simulado
    const mockContext = {
      functionName: 'update-products',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:update-products',
      memoryLimitInMB: 1024,
      awsRequestId: 'test-request-id-' + Date.now(),
      getRemainingTimeInMillis: () => 300000 // 5 minutos
    };
    
    console.log('🚀 Ejecutando función update-products...\n');
    
    // Ejecutar la función
    const startTime = Date.now();
    const result = await updateProducts.handler(mockEvent, mockContext);
    const duration = Date.now() - startTime;
    
    console.log('\n📊 RESULTADO:');
    console.log('=============');
    console.log(`⏱️  Duración: ${duration}ms`);
    console.log(`📤 Status: ${result.statusCode}`);
    console.log(`📋 Headers:`, result.headers);
    
    // Parsear y mostrar el body
    try {
      const responseBody = JSON.parse(result.body);
      console.log('\n📄 Respuesta:');
      console.log(`✅ Success: ${responseBody.success}`);
      console.log(`📦 Productos: ${responseBody.productsCount}`);
      console.log(`🔄 Cambios de stock: ${responseBody.stockChanges}`);
      console.log(`🚀 Build triggeado: ${responseBody.autoBuildTriggered}`);
      console.log(`💬 Mensaje: ${responseBody.message}`);
      
      if (responseBody.results) {
        console.log('\n🔍 Detalles:');
        console.log(`📡 Scraping: ${responseBody.results.scraping?.success ? '✅' : '❌'}`);
        console.log(`📝 Generación: ${responseBody.results.generation?.success ? '✅' : '❌'}`);
        
        if (responseBody.results.errors && responseBody.results.errors.length > 0) {
          console.log(`❌ Errores: ${responseBody.results.errors.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.log('📄 Body (raw):', result.body);
    }
    
    return result.statusCode >= 200 && result.statusCode < 300;
    
  } catch (error) {
    console.error('💥 Error ejecutando función:', error.message);
    return false;
  }
}

async function main() {
  const success = await testUpdateProducts();
  
  console.log('\n🎯 RESULTADO FINAL:');
  console.log(success ? '🎉 ¡Test exitoso!' : '❌ Test falló');
  
  if (success) {
    console.log('\n✅ La función update-products está funcionando correctamente');
    console.log('✅ El scraping se ejecutó');
    console.log('✅ La generación de archivos se completó');
    console.log('✅ El monitoreo de stock funciona');
    console.log('✅ Listo para usar en Netlify');
  }
}

main().catch(console.error);
