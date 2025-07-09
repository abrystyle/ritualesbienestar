#!/usr/bin/env node

const fs = require('fs');

console.log('🧪 TEST SIMPLE DE STOCK MONITORING');
console.log('==================================\n');

// Crear datos de prueba simples
const testData = {
  "products": [
    {
      "name": "Test Product",
      "availability": null,
      "sku": "TEST001",
      "price": "29,99 €"
    }
  ]
};

const modifiedData = {
  "products": [
    {
      "name": "Test Product", 
      "availability": "No está disponible",
      "sku": "TEST001",
      "price": "32,99 €"
    }
  ]
};

console.log('📄 Creando archivos de prueba...');

// Crear backup
fs.writeFileSync('test_backup.json', JSON.stringify(testData, null, 2));
console.log('✅ Backup creado');

// Crear archivo actual con cambios
fs.writeFileSync('test_current.json', JSON.stringify(modifiedData, null, 2));
console.log('✅ Archivo actual creado');

// Simular detección de cambios
const backup = JSON.parse(fs.readFileSync('test_backup.json', 'utf8'));
const current = JSON.parse(fs.readFileSync('test_current.json', 'utf8'));

const changes = [];
current.products.forEach(product => {
  const previous = backup.products.find(p => p.sku === product.sku);
  if (previous) {
    if (previous.availability !== product.availability) {
      changes.push({
        name: product.name,
        stockChange: `${previous.availability || 'Disponible'} → ${product.availability || 'Disponible'}`
      });
    }
    if (previous.price !== product.price) {
      changes.push({
        name: product.name,
        priceChange: `${previous.price} → ${product.price}`
      });
    }
  }
});

console.log('\n🔍 CAMBIOS DETECTADOS:');
if (changes.length > 0) {
  changes.forEach(change => {
    console.log(`✅ ${change.name}:`);
    if (change.stockChange) console.log(`   📦 Stock: ${change.stockChange}`);
    if (change.priceChange) console.log(`   💰 Precio: ${change.priceChange}`);
  });
} else {
  console.log('❌ No se detectaron cambios');
}

// Verificar que la función stock-monitor existe
if (fs.existsSync('./netlify/functions/stock-monitor.js')) {
  console.log('\n✅ Función stock-monitor.js existe');
  
  // Leer el contenido para verificar estructura básica
  const content = fs.readFileSync('./netlify/functions/stock-monitor.js', 'utf8');
  if (content.includes('exports.handler')) {
    console.log('✅ Handler exportado correctamente');
  }
  if (content.includes('availability')) {
    console.log('✅ Lógica de availability incluida');
  }
} else {
  console.log('\n❌ Función stock-monitor.js no encontrada');
}

// Verificar netlify.toml
if (fs.existsSync('./netlify.toml')) {
  const tomlContent = fs.readFileSync('./netlify.toml', 'utf8');
  if (tomlContent.includes('/api/stock')) {
    console.log('✅ Endpoint /api/stock configurado en netlify.toml');
  } else {
    console.log('❌ Endpoint /api/stock no encontrado en netlify.toml');
  }
} else {
  console.log('❌ netlify.toml no encontrado');
}

console.log('\n🎯 TEST COMPLETADO');

// Limpiar archivos de prueba
fs.unlinkSync('test_backup.json');
fs.unlinkSync('test_current.json');
console.log('🧹 Archivos de prueba eliminados');
