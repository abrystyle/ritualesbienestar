// Script para probar las funciones de Netlify localmente
// Simula el entorno de Netlify Functions

const fs = require('fs');
const path = require('path');

// Simular variables de entorno
process.env.NETLIFY_FUNCTION_TOKEN = 'test-token-123';
process.env.NETLIFY_BUILD_HOOK = 'https://api.netlify.com/build_hooks/test';

// Simular evento de Netlify
const mockEvent = {
  headers: {
    'x-netlify-token': 'test-token-123'
  },
  queryStringParameters: {},
  httpMethod: 'POST'
};

const mockContext = {
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn: 'test-arn'
};

async function testFunction(functionName) {
  try {
    console.log(`\n🧪 Probando función: ${functionName}`);
    console.log('=====================================');
    
    const functionPath = path.join(__dirname, 'netlify', 'functions', `${functionName}.js`);
    
    if (!fs.existsSync(functionPath)) {
      console.log(`❌ Función ${functionName} no encontrada en ${functionPath}`);
      return;
    }
    
    // Cargar la función
    delete require.cache[require.resolve(functionPath)];
    const functionModule = require(functionPath);
    
    if (!functionModule.handler || typeof functionModule.handler !== 'function') {
      console.log(`❌ Función ${functionName} no tiene un handler válido`);
      return;
    }
    
    console.log(`✅ Función ${functionName} cargada correctamente`);
    console.log('🔄 Ejecutando handler...');
    
    const startTime = Date.now();
    const result = await functionModule.handler(mockEvent, mockContext);
    const endTime = Date.now();
    
    console.log(`⏱️ Tiempo de ejecución: ${endTime - startTime}ms`);
    console.log(`📊 Status Code: ${result.statusCode}`);
    
    if (result.statusCode === 200) {
      console.log('✅ Función ejecutada exitosamente');
      
      // Parsear y mostrar respuesta
      try {
        const response = JSON.parse(result.body);
        console.log('📄 Respuesta:');
        console.log(JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('📄 Respuesta (texto):');
        console.log(result.body);
      }
    } else {
      console.log(`❌ Función falló con status ${result.statusCode}`);
      console.log('📄 Respuesta de error:');
      console.log(result.body);
    }
    
  } catch (error) {
    console.log(`💥 Error ejecutando función ${functionName}:`, error.message);
    if (error.stack) {
      console.log('Stack trace:', error.stack);
    }
  }
}

async function testAllFunctions() {
  console.log('🚀 Iniciando pruebas de funciones de Netlify');
  console.log('=============================================');
  
  // Lista de funciones para probar
  const functions = [
    'update-products',
    'trigger-build', 
    'daily-update'
  ];
  
  for (const func of functions) {
    await testFunction(func);
    console.log('\n' + '='.repeat(50) + '\n');
  }
  
  console.log('🏁 Pruebas completadas');
  console.log('\nNotas importantes:');
  console.log('- Las funciones que ejecutan scraper.js pueden fallar sin conexión');
  console.log('- La función trigger-build fallará sin un build hook real');
  console.log('- Esto es normal en pruebas locales');
  console.log('- Lo importante es que las funciones se carguen sin errores de sintaxis');
}

// Función específica para probar sin ejecutar scripts externos
async function testFunctionSyntaxOnly(functionName) {
  try {
    console.log(`\n🔍 Verificando función: ${functionName}`);
    
    const functionPath = path.join(__dirname, 'netlify', 'functions', `${functionName}.js`);
    
    if (!fs.existsSync(functionPath)) {
      console.log(`❌ Función ${functionName} no encontrada`);
      return false;
    }
    
    // Leer el archivo y verificar estructura básica
    const content = fs.readFileSync(functionPath, 'utf8');
    
    // Verificar que tiene exports.handler
    if (content.includes('exports.handler')) {
      console.log(`✅ ${functionName} - estructura correcta (exports.handler encontrado)`);
      
      // Verificar que tiene elementos clave de una función de Netlify
      const hasAsyncHandler = content.includes('async (event, context)');
      const hasReturn = content.includes('return {');
      const hasStatusCode = content.includes('statusCode:');
      
      if (hasAsyncHandler && hasReturn && hasStatusCode) {
        console.log(`✅ ${functionName} - estructura de función de Netlify válida`);
        return true;
      } else {
        console.log(`⚠️ ${functionName} - estructura incompleta`);
        return false;
      }
    } else {
      console.log(`❌ ${functionName} - no tiene exports.handler`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ${functionName} - error leyendo archivo: ${error.message}`);
    return false;
  }
}

async function testSyntaxOnly() {
  console.log('🔍 Verificando solo sintaxis de las funciones...');
  console.log('===========================================');
  
  const functions = ['update-products', 'trigger-build', 'daily-update'];
  let allValid = true;
  
  for (const func of functions) {
    const isValid = await testFunctionSyntaxOnly(func);
    allValid = allValid && isValid;
  }
  
  console.log('\n📋 Resumen:');
  if (allValid) {
    console.log('✅ Todas las funciones tienen sintaxis correcta');
  } else {
    console.log('❌ Algunas funciones tienen errores');
  }
  
  return allValid;
}

// Determinar qué tipo de prueba ejecutar
const testType = process.argv[2];

if (testType === 'syntax') {
  testSyntaxOnly();
} else if (testType === 'full') {
  testAllFunctions();
} else {
  console.log('🔧 Test de Funciones de Netlify');
  console.log('==============================');
  console.log('');
  console.log('Uso:');
  console.log('  node test-functions.js syntax  - Solo verificar sintaxis');
  console.log('  node test-functions.js full    - Ejecutar funciones completas');
  console.log('');
  console.log('Recomendado: Empezar con "syntax" antes de "full"');
  console.log('');
  
  // Por defecto, ejecutar prueba de sintaxis
  testSyntaxOnly();
}
