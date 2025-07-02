import fs from 'fs';

// Leer los datos del JSON
const data = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));

console.log('=== RESUMEN DEL SCRAPING DE EVERGREEN LIFE ===\n');

console.log(`📊 Estadísticas generales:`);
console.log(`- URL scrapeada: ${data.url}`);
console.log(`- Fecha del scraping: ${new Date(data.scrapedAt).toLocaleString('es-ES')}`);
console.log(`- Total de productos encontrados: ${data.totalProducts}`);

// Análisis de precios
const prices = data.products
    .map(p => p.price)
    .filter(p => p && p.includes('€'))
    .map(p => parseFloat(p.replace(/[^\d,]/g, '').replace(',', '.')))
    .filter(p => !isNaN(p));

if (prices.length > 0) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    console.log(`\n💰 Análisis de precios:`);
    console.log(`- Precio más bajo: ${minPrice.toFixed(2)} €`);
    console.log(`- Precio más alto: ${maxPrice.toFixed(2)} €`);
    console.log(`- Precio promedio: ${avgPrice.toFixed(2)} €`);
}

// Productos con SKU
const withSku = data.products.filter(p => p.sku);
console.log(`\n🏷️  Productos con SKU: ${withSku.length}/${data.totalProducts}`);

// Productos con imágenes
const withImages = data.products.filter(p => p.image);
console.log(`🖼️  Productos con imágenes: ${withImages.length}/${data.totalProducts}`);

// Productos disponibles/no disponibles
const available = data.products.filter(p => !p.availability || !p.availability.includes('No está disponible'));
const unavailable = data.products.filter(p => p.availability && p.availability.includes('No está disponible'));
console.log(`✅ Productos disponibles: ${available.length}`);
console.log(`❌ Productos no disponibles: ${unavailable.length}`);

// Top 5 productos más caros
console.log(`\n🔝 Top 5 productos más caros:`);
const sortedByPrice = data.products
    .filter(p => p.price && p.price.includes('€'))
    .map(p => ({
        ...p,
        numericPrice: parseFloat(p.price.replace(/[^\d,]/g, '').replace(',', '.'))
    }))
    .filter(p => !isNaN(p.numericPrice))
    .sort((a, b) => b.numericPrice - a.numericPrice)
    .slice(0, 5);

sortedByPrice.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name} - ${product.price}`);
});

// Categorías de productos (basado en nombres)
console.log(`\n📂 Tipos de productos encontrados:`);
const productTypes = {};
data.products.forEach(product => {
    if (product.name) {
        if (product.name.includes('KIT')) productTypes['Kits'] = (productTypes['Kits'] || 0) + 1;
        else if (product.name.includes('COLLAGEN')) productTypes['Colágeno'] = (productTypes['Colágeno'] || 0) + 1;
        else if (product.name.includes('PROTEIN')) productTypes['Proteínas'] = (productTypes['Proteínas'] || 0) + 1;
        else if (product.name.includes('BRUCIA GRASSI')) productTypes['Quema Grasas'] = (productTypes['Quema Grasas'] || 0) + 1;
        else if (product.name.includes('CREMA')) productTypes['Cremas'] = (productTypes['Cremas'] || 0) + 1;
        else if (product.name.includes('OLIFE')) productTypes['OLife'] = (productTypes['OLife'] || 0) + 1;
        else productTypes['Otros'] = (productTypes['Otros'] || 0) + 1;
    }
});

Object.entries(productTypes).forEach(([type, count]) => {
    console.log(`- ${type}: ${count} productos`);
});

console.log(`\n📋 Muestra de productos (primeros 5):`);
data.products.slice(0, 5).forEach((product, index) => {
    console.log(`\n${index + 1}. ${product.name}`);
    console.log(`   💰 Precio: ${product.price || 'N/A'}`);
    console.log(`   🏷️  SKU: ${product.sku || 'N/A'}`);
    console.log(`   🔗 Link: ${product.link || 'N/A'}`);
    console.log(`   📦 Disponibilidad: ${product.availability || 'Disponible'}`);
});

console.log(`\n✅ Scraping completado exitosamente!`);
console.log(`📄 Datos completos guardados en: evergreen_products.json`);
