#!/usr/bin/env node

/**
 * Simulador de entorno Netlify para test local
 * Prueba las funciones con eventos simulados
 */

const fs = require('fs');
const path = require('path');

// Configurar variables de entorno de test
process.env.NETLIFY_FUNCTION_TOKEN = 'test-token-123';
process.env.NETLIFY_BUILD_HOOK = 'https://api.netlify.com/build_hooks/test';
process.env.NODE_VERSION = '18';

console.log('🧪 SIMULADOR NETLIFY FUNCTIONS');
console.log('===============================\n');

async function testFunction(functionPath, eventData = {}) {
    try {
        console.log(`🔄 Probando: ${functionPath}`);
        
        // Importar la función
        const functionModule = require(functionPath);
        
        if (!functionModule.handler) {
            throw new Error('La función no exporta un handler');
        }
        
        // Crear evento de test
        const mockEvent = {
            httpMethod: 'POST',
            headers: {
                'x-netlify-token': 'test-token-123',
                'content-type': 'application/json'
            },
            queryStringParameters: {
                token: 'test-token-123'
            },
            body: JSON.stringify(eventData),
            ...eventData
        };
        
        // Crear contexto de test
        const mockContext = {
            functionName: path.basename(functionPath, '.js'),
            functionVersion: '1',
            invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:test',
            memoryLimitInMB: 1024,
            awsRequestId: 'test-request-id',
            getRemainingTimeInMillis: () => 30000
        };
        
        console.log('  📤 Enviando evento de test...');
        
        // Ejecutar función con timeout
        const result = await Promise.race([
            functionModule.handler(mockEvent, mockContext),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout después de 10 segundos')), 10000)
            )
        ]);
        
        console.log('  📥 Respuesta recibida:');
        console.log(`    Status: ${result.statusCode}`);
        
        // Parsear body si es JSON
        try {
            const body = JSON.parse(result.body);
            console.log(`    Success: ${body.success || 'N/A'}`);
            console.log(`    Message: ${body.message || body.error || 'N/A'}`);
        } catch (e) {
            console.log(`    Body: ${result.body.substring(0, 100)}...`);
        }
        
        if (result.statusCode >= 200 && result.statusCode < 300) {
            console.log('  ✅ Test EXITOSO\n');
            return true;
        } else {
            console.log('  ❌ Test FALLÓ\n');
            return false;
        }
        
    } catch (error) {
        console.log(`  ❌ Error en test: ${error.message}\n`);
        return false;
    }
}

async function runTests() {
    const functions = [
        './netlify/functions/trigger-build.js',
        './netlify/functions/update-products.js',
        // './netlify/functions/daily-update.js' // Este puede tardar mucho
    ];
    
    let passed = 0;
    let total = functions.length;
    
    for (const func of functions) {
        if (fs.existsSync(func)) {
            const success = await testFunction(func);
            if (success) passed++;
        } else {
            console.log(`❌ Función no encontrada: ${func}\n`);
        }
    }
    
    console.log('📊 RESUMEN DE TESTS');
    console.log(`✅ Exitosos: ${passed}/${total}`);
    console.log(`❌ Fallidos: ${total - passed}/${total}`);
    
    if (passed === total) {
        console.log('\n🎉 ¡Todas las funciones pasan los tests!');
        console.log('El problema puede estar en:');
        console.log('1. Variables de entorno no configuradas en Netlify');
        console.log('2. Permisos o configuración del build hook');
        console.log('3. Límites de tiempo de ejecución en Netlify');
    } else {
        console.log('\n⚠️ Hay funciones que fallan localmente');
        console.log('Revisa los errores arriba para más detalles');
    }
}

// Test de generación rápida
async function testGeneration() {
    console.log('🏭 PROBANDO GENERACIÓN DE CONTENIDO');
    console.log('===================================\n');
    
    try {
        if (!fs.existsSync('evergreen_products.json')) {
            console.log('❌ No se encontró evergreen_products.json');
            return false;
        }
        
        // Simular ejecución del generador
        const { execSync } = require('child_process');
        
        console.log('🔄 Ejecutando generador...');
        const output = execSync('node generate_simple.cjs', { 
            encoding: 'utf8',
            timeout: 30000,
            cwd: process.cwd()
        });
        
        if (output.includes('¡Completado!')) {
            console.log('✅ Generador ejecutado exitosamente');
            return true;
        } else {
            console.log('❌ Generador no completó correctamente');
            console.log('Output:', output.substring(0, 200));
            return false;
        }
        
    } catch (error) {
        console.log('❌ Error ejecutando generador:', error.message);
        return false;
    }
}

async function main() {
    // Test de generación primero
    await testGeneration();
    console.log('');
    
    // Test de funciones
    await runTests();
    
    console.log('\n🔧 PASOS PARA NETLIFY:');
    console.log('1. Configurar variables de entorno en Netlify:');
    console.log('   - NETLIFY_FUNCTION_TOKEN: token secreto para autorización');
    console.log('   - NETLIFY_BUILD_HOOK: URL del webhook para triggear builds');
    console.log('2. Verificar que el directorio de funciones está configurado');
    console.log('3. Revisar logs de deploy y función en Netlify');
    console.log('4. Probar las URLs de las funciones manualmente');
}

main().catch(console.error);
