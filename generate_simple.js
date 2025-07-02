const fs = require('fs');
const path = require('path');

console.log('🔄 Iniciando script de generación...');

try {
    // Verificar si existe el archivo JSON
    if (!fs.existsSync('evergreen_products.json')) {
        console.error('❌ No se encontró el archivo evergreen_products.json');
        process.exit(1);
    }
    
    console.log('📄 Leyendo archivo JSON...');
    const rawData = fs.readFileSync('evergreen_products.json', 'utf8');
    const jsonData = JSON.parse(rawData);
    
    console.log(`📊 Datos cargados: ${jsonData.products.length} productos`);
    
    // Crear directorio de productos
    const productsDir = './src/content/products';
    if (!fs.existsSync(productsDir)) {
        fs.mkdirSync(productsDir, { recursive: true });
        console.log(`📁 Directorio creado: ${productsDir}`);
    }
    
    // Función para crear slug
    function createSlug(name) {
        return name
            .toLowerCase()
            .replace(/[®™©]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    // Función para categorizar
    function getCategory(productName) {
        const name = productName.toLowerCase();
        
        if (name.includes('kit')) return 'Kits';
        if (name.includes('collagen')) return 'Colágeno';
        if (name.includes('protein')) return 'Proteínas';
        if (name.includes('brucia grassi')) return 'Quema Grasas';
        if (name.includes('crema')) return 'Cremas';
        if (name.includes('siero')) return 'Serums';
        if (name.includes('bende')) return 'Tratamientos';
        if (name.includes('golden day')) return 'Suplementos Premium';
        if (name.includes('olife')) return 'Suplementos OLife';
        
        return 'Suplementos';
    }
    
    // Generar archivos
    let count = 0;
    for (const product of jsonData.products) {
        try {
            const slug = createSlug(product.name);
            const fileName = `${slug}.md`;
            const filePath = path.join(productsDir, fileName);
            
            const availability = product.availability && product.availability.includes('No está disponible') ? 'unavailable' : 'available';
            const inStock = !product.availability || !product.availability.includes('No está disponible');
            
            const content = `---
name: "${product.name.replace(/"/g, '\\"')}"
description: "${product.name} de EverGreen Life. Producto de alta calidad."
price: "${product.price || '0,00 €'}"
brand: "EverGreen Life"
${product.image ? `image: "${product.image}"` : ''}
${product.link ? `productUrl: "${product.link}"` : ''}
availability: "${availability}"
inStock: ${inStock}
category: "${getCategory(product.name)}"
tags: []
${product.sku ? `sku: "${product.sku}"` : ''}
createdAt: "${new Date().toISOString()}"
seoTitle: "${product.name} - EverGreen Life"
seoDescription: "Compra ${product.name} de EverGreen Life."
---

# ${product.name}

${product.name} de EverGreen Life. Producto de alta calidad de la línea ${getCategory(product.name)}.

## Información del Producto

- **Precio:** ${product.price || '0,00 €'}
- **Marca:** EverGreen Life
${product.sku ? `- **SKU:** ${product.sku}` : ''}
- **Categoría:** ${getCategory(product.name)}
- **Disponibilidad:** ${availability === 'available' ? 'Disponible' : 'No disponible'}

${product.link ? `[Ver producto en la tienda oficial](${product.link})` : ''}

## Características

Este producto forma parte de la línea ${getCategory(product.name)} de EverGreen Life, reconocida por su calidad y efectividad.

---

*Información extraída automáticamente el ${new Date().toLocaleDateString('es-ES')}*
`;
            
            fs.writeFileSync(filePath, content, 'utf8');
            count++;
            console.log(`✅ ${count}. ${fileName}`);
            
        } catch (error) {
            console.error(`❌ Error con "${product.name}":`, error.message);
        }
    }
    
    console.log(`\n🎉 ¡Completado! ${count} archivos generados en ${productsDir}`);
    
} catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
}
