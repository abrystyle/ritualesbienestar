#!/usr/bin/env node

/**
 * Script de diagnóstico para Netlify Functions
 * Verifica configuración, dependencias y ejecuta tests básicos
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 DIAGNÓSTICO NETLIFY - SQUARE SATURN');
console.log('=====================================\n');

// Verificar estructura del proyecto
console.log('📁 1. ESTRUCTURA DEL PROYECTO');
const requiredFiles = [
    'netlify.toml',
    'package.json',
    'netlify/functions/daily-update.js',
    'netlify/functions/update-products.js', 
    'netlify/functions/trigger-build.js',
    'generate_simple.cjs',
    'scraper.js'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - FALTANTE`);
    }
});

// Verificar package.json
console.log('\n📦 2. DEPENDENCIAS');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Nombre: ${packageJson.name}`);
    console.log(`✅ Versión: ${packageJson.version}`);
    
    // Verificar scripts importantes
    const scripts = packageJson.scripts || {};
    if (scripts.build) {
        console.log(`✅ Script build: ${scripts.build}`);
    } else {
        console.log('❌ Script build no encontrado');
    }
    
} catch (error) {
    console.log('❌ Error leyendo package.json:', error.message);
}

// Verificar netlify.toml
console.log('\n⚙️ 3. CONFIGURACIÓN NETLIFY');
try {
    const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
    
    // Verificar secciones críticas
    const checks = [
        { pattern: /\[build\]/, name: 'Sección [build]' },
        { pattern: /command\s*=/, name: 'Comando de build' },
        { pattern: /publish\s*=/, name: 'Directorio de publicación' },
        { pattern: /functions\s*=/, name: 'Directorio de funciones' },
        { pattern: /\[functions\]/, name: 'Configuración de funciones' },
        { pattern: /\[\[redirects\]\]/, name: 'Redirects configurados' }
    ];
    
    checks.forEach(check => {
        if (check.pattern.test(netlifyConfig)) {
            console.log(`✅ ${check.name}`);
        } else {
            console.log(`❌ ${check.name} - NO ENCONTRADO`);
        }
    });
    
} catch (error) {
    console.log('❌ Error leyendo netlify.toml:', error.message);
}

// Verificar funciones individuales
console.log('\n🔧 4. FUNCIONES NETLIFY');
const functions = ['daily-update.js', 'update-products.js', 'trigger-build.js'];

functions.forEach(func => {
    const funcPath = `netlify/functions/${func}`;
    try {
        const content = fs.readFileSync(funcPath, 'utf8');
        
        // Verificar sintaxis básica
        const checks = [
            { pattern: /exports\.handler/, name: 'Handler exportado' },
            { pattern: /async.*\(event,\s*context\)/, name: 'Función async con parámetros correctos' },
            { pattern: /statusCode/, name: 'Respuesta HTTP válida' },
            { pattern: /JSON\.stringify/, name: 'Serialización JSON' }
        ];
        
        console.log(`\n  📄 ${func}:`);
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                console.log(`  ✅ ${check.name}`);
            } else {
                console.log(`  ❌ ${check.name}`);
            }
        });
        
    } catch (error) {
        console.log(`  ❌ Error leyendo ${func}:`, error.message);
    }
});

// Test de ejecución del generador
console.log('\n🚀 5. TEST DE GENERADOR');
try {
    if (fs.existsSync('evergreen_products.json')) {
        console.log('✅ Archivo evergreen_products.json existe');
        
        // Verificar que el JSON es válido
        const jsonData = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));
        if (jsonData.products && Array.isArray(jsonData.products)) {
            console.log(`✅ JSON válido con ${jsonData.products.length} productos`);
        } else {
            console.log('❌ Estructura JSON inválida');
        }
        
    } else {
        console.log('❌ Archivo evergreen_products.json no existe');
    }
} catch (error) {
    console.log('❌ Error verificando productos:', error.message);
}

// Variables de entorno críticas para Netlify
console.log('\n🔐 6. VARIABLES DE ENTORNO (LOCAL)');
const envVars = [
    'NETLIFY_FUNCTION_TOKEN',
    'NETLIFY_BUILD_HOOK',
    'NODE_VERSION'
];

envVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`✅ ${envVar} configurada`);
    } else {
        console.log(`❌ ${envVar} no configurada`);
    }
});

// Verificar Node.js version
console.log('\n🟢 7. ENTORNO DE EJECUCIÓN');
console.log(`✅ Node.js: ${process.version}`);
console.log(`✅ Plataforma: ${process.platform}`);
console.log(`✅ Arquitectura: ${process.arch}`);

// Sugerencias finales
console.log('\n💡 SUGERENCIAS PARA NETLIFY:');
console.log('1. Asegúrate de que las variables de entorno estén configuradas en Netlify');
console.log('2. Verifica que los build hooks estén configurados correctamente');
console.log('3. Revisa los logs de deploy en Netlify para errores específicos');
console.log('4. Las funciones deben usar CommonJS (require/exports)');
console.log('5. Timeout máximo para funciones: 10 segundos (nivel gratis) / 15 minutos (pro)');

console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
