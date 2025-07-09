#!/usr/bin/env node

/**
 * Script para probar el Build Hook de Netlify
 */

const https = require('https');
const fs = require('fs');

console.log('🧪 PROBANDO NETLIFY BUILD HOOK');
console.log('==============================\n');

// Cargar variables de entorno desde .env
function loadEnv() {
  if (!fs.existsSync('.env')) {
    console.log('❌ Archivo .env no encontrado');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, value] = line.split('=');
      process.env[key.trim()] = value.trim();
    }
  });
  
  console.log('✅ Variables de entorno cargadas desde .env');
}

// Función para triggear el build
async function triggerBuild(buildHookUrl) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      trigger: 'manual-test-script',
      timestamp: new Date().toISOString(),
      source: 'test-build-hook-node-script'
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log(`🔗 Build Hook URL: ${buildHookUrl}`);
    console.log('🚀 Enviando petición...');

    const req = https.request(buildHookUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📥 Respuesta HTTP: ${res.statusCode}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Build triggeado exitosamente!');
          console.log(`📋 Respuesta: ${data || 'Sin contenido'}`);
          resolve({
            statusCode: res.statusCode,
            response: data
          });
        } else {
          console.log('❌ Error triggeando build');
          console.log(`📋 Respuesta: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Error en la petición:', error.message);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  try {
    // Cargar variables de entorno
    loadEnv();
    
    // Verificar que tenemos el build hook
    const buildHookUrl = process.env.NETLIFY_BUILD_HOOK;
    
    if (!buildHookUrl) {
      console.log('❌ NETLIFY_BUILD_HOOK no está configurada en .env');
      process.exit(1);
    }
    
    // Triggear el build
    await triggerBuild(buildHookUrl);
    
    console.log('\n🔍 Puedes verificar el build en:');
    console.log('   https://app.netlify.com/sites/[tu-sitio]/deploys');
    console.log('\n🎉 Test completado exitosamente!');
    
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  }
}

main();
