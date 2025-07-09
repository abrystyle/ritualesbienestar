#!/usr/bin/env node

/**
 * Script de prueba para la función update-products con GitHub API
 * Simula una llamada a la función Netlify para probar la integración
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

// Importar la función
const { handler } = require('./netlify/functions/update-products.js');

async function testUpdateProductsGitHub() {
  console.log('🧪 Probando función update-products con GitHub API...\n');
  
  // Verificar configuración requerida
  const requiredEnvVars = [
    'NETLIFY_FUNCTION_TOKEN',
    'GITHUB_TOKEN', 
    'GITHUB_OWNER',
    'GITHUB_REPO'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Faltan variables de entorno:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📝 Por favor configura estas variables en .env antes de continuar');
    process.exit(1);
  }
  
  console.log('✅ Configuración de entorno validada');
  console.log(`   - GITHUB_OWNER: ${process.env.GITHUB_OWNER}`);
  console.log(`   - GITHUB_REPO: ${process.env.GITHUB_REPO}`);
  console.log(`   - GITHUB_TOKEN: ${process.env.GITHUB_TOKEN?.substring(0, 8)}...`);
  console.log('');
  
  // Simular evento de Netlify Function
  const mockEvent = {
    headers: {
      'x-netlify-token': process.env.NETLIFY_FUNCTION_TOKEN
    },
    queryStringParameters: {}
  };
  
  const mockContext = {};
  
  try {
    console.log('🚀 Ejecutando función update-products...\n');
    
    const startTime = Date.now();
    const result = await handler(mockEvent, mockContext);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Duración: ${duration}ms`);
    console.log(`📊 Status: ${result.statusCode}`);
    console.log('');
    
    if (result.statusCode === 200) {
      const response = JSON.parse(result.body);
      
      console.log('✅ Función ejecutada exitosamente!');
      console.log('');
      console.log('📋 Resumen de resultados:');
      console.log(`   - Éxito: ${response.success}`);
      console.log(`   - Productos: ${response.productsCount}`);
      console.log(`   - Archivos generados: ${response.filesGenerated}`);
      console.log(`   - Duración: ${response.duration}`);
      console.log('');
      
      if (response.results.scraping) {
        console.log('🕷️  Scraping:');
        console.log(`   - Éxito: ${response.results.scraping.success}`);
        console.log(`   - Productos: ${response.results.scraping.productsCount || 'N/A'}`);
      }
      
      if (response.results.generation) {
        console.log('📝 Generación:');
        console.log(`   - Éxito: ${response.results.generation.success}`);
        console.log(`   - Archivos: ${response.results.generation.filesGenerated || 'N/A'}`);
      }
      
      if (response.results.commit) {
        console.log('📤 Commit a GitHub:');
        console.log(`   - Éxito: ${response.results.commit.success}`);
        if (response.results.commit.success) {
          console.log(`   - SHA: ${response.results.commit.sha}`);
          console.log(`   - Archivos: ${response.results.commit.filesUpdated}`);
          console.log(`   - URL: ${response.results.commit.url}`);
        }
      }
      
      if (response.results.autoBuild) {
        console.log('🚀 Build automático:');
        console.log(`   - Triggeado: ${response.results.autoBuild.triggered}`);
        if (response.results.autoBuild.reason) {
          console.log(`   - Razón: ${response.results.autoBuild.reason}`);
        }
      }
      
      if (response.results.errors && response.results.errors.length > 0) {
        console.log('');
        console.log('⚠️  Errores encontrados:');
        response.results.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
      
    } else {
      console.log('❌ Función falló');
      console.log('');
      console.log('📄 Respuesta:');
      try {
        const errorResponse = JSON.parse(result.body);
        console.log(JSON.stringify(errorResponse, null, 2));
      } catch {
        console.log(result.body);
      }
    }
    
  } catch (error) {
    console.error('💥 Error ejecutando función:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testUpdateProductsGitHub().catch(console.error);
}

module.exports = { testUpdateProductsGitHub };
