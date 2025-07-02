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
    
    // Función para limpiar y filtrar tags
    function cleanTags(tags) {
        if (!Array.isArray(tags)) return [];
        
        const unwantedTags = [
            'search', 'lenguaje', 'cantidad', 'inscríbase', 'compartir', 'boletín',
            'package weight', 'ml', 'javascript', 'require', 'window', 'document',
            'alert', 'clipboard', 'whatsapp', 'mailto', 'kg', 'g', 'kg'
        ];
        
        const goodTags = [
            'objetivos', 'métodos de uso', 'ingredientes', 'beneficios', 
            'características', 'propiedades', 'antioxidante', 'natural',
            'vitaminas', 'minerales', 'colágeno', 'detox', 'energía',
            'bienestar', 'salud', 'suplemento', 'crema', 'gel', 'serum',
            'anticellulite', 'antiage', 'hidratante', 'nutritivo'
        ];
        
        return tags
            .filter(tag => {
                if (!tag || typeof tag !== 'string') return false;
                const lowTag = tag.toLowerCase().trim();
                
                // Excluir tags no deseados
                if (unwantedTags.some(unwanted => lowTag.includes(unwanted))) return false;
                
                // Incluir solo tags útiles o que contengan palabras clave
                return goodTags.some(good => lowTag.includes(good)) || 
                       (lowTag.length > 3 && lowTag.length < 30 && 
                        !lowTag.includes(':') && !lowTag.includes('(') && 
                        !lowTag.includes('€') && !lowTag.includes('ml'));
            })
            .map(tag => tag.trim())
            .slice(0, 5); // Limitar a máximo 5 tags
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

    // Función para extraer información de peso/tamaño
    function extractSizeInfo(tags, description) {
        let sizeInfo = '';
        
        // Buscar en tags
        const sizeTag = tags.find(tag => 
            tag && (tag.includes('ml') || tag.includes('g ') || tag.includes('kg'))
        );
        if (sizeTag) sizeInfo = sizeTag;
        
        // Si no encuentra en tags, buscar en descripción
        if (!sizeInfo && description) {
            const sizeMatch = description.match(/\d+\s*(ml|g|kg)/i);
            if (sizeMatch) sizeInfo = sizeMatch[0];
        }
        
        return sizeInfo;
    }
    
    // Función para extraer beneficios de la descripción
    function extractBenefits(description) {
        if (!description) return [];
        
        const benefitKeywords = [
            'energía', 'vitalidad', 'bienestar', 'salud', 'antioxidante',
            'hidratante', 'nutritivo', 'antiedad', 'colágeno', 'vitaminas',
            'detox', 'drenante', 'quema grasa', 'anticellulite'
        ];
        
        const benefits = [];
        benefitKeywords.forEach(keyword => {
            if (description.toLowerCase().includes(keyword)) {
                benefits.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
            }
        });
        
        return [...new Set(benefits)].slice(0, 3);
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
            const category = getCategory(product.name);
            
            // Procesar tags y extraer información adicional
            const cleanedTags = cleanTags(product.tags || []);
            const benefits = extractBenefits(product.detailedDescription);
            const sizeInfo = extractSizeInfo(product.tags || [], product.detailedDescription);
            
            // Combinar tags limpios con beneficios
            const allTags = [...new Set([...cleanedTags, ...benefits])].slice(0, 5);
            
            // Construir frontmatter
            const frontmatter = [];
            frontmatter.push(`name: "${product.name.replace(/"/g, '\\"')}"`);
            frontmatter.push(`description: "${product.name} de EverGreen Life. Producto de alta calidad."`);
            frontmatter.push(`price: "${product.price || '0,00 €'}"`);
            frontmatter.push(`brand: "EverGreen Life"`);
            
            if (product.image) {
                frontmatter.push(`image: "${product.image}"`);
            }
            
            if (product.link) {
                frontmatter.push(`productUrl: "${product.link}"`);
            }
            
            frontmatter.push(`availability: "${availability}"`);
            frontmatter.push(`inStock: ${inStock}`);
            frontmatter.push(`category: "${category}"`);
            frontmatter.push(`tags: [${allTags.map(tag => `"${tag}"`).join(', ')}]`);
            
            if (sizeInfo) {
                frontmatter.push(`packageSize: "${sizeInfo}"`);
            }
            
            if (product.sku) {
                frontmatter.push(`sku: "${product.sku}"`);
            }
            
            frontmatter.push(`createdAt: "${new Date().toISOString()}"`);
            frontmatter.push(`seoTitle: "${product.name} - EverGreen Life"`);
            frontmatter.push(`seoDescription: "Compra ${product.name} de EverGreen Life."`);
            
            const content = `---
${frontmatter.join('\n')}
---

# ${product.name}

${product.detailedDescription ? 
  product.detailedDescription.split('\n')[0].replace('Descripción', '').trim() :
  `${product.name} de EverGreen Life. Producto de alta calidad de la línea ${category}.`
}

## Información del Producto

- **Precio:** ${product.price || '0,00 €'}
- **Marca:** EverGreen Life
${product.sku ? `- **SKU:** ${product.sku}` : ''}
- **Categoría:** ${category}
${sizeInfo ? `- **Tamaño:** ${sizeInfo}` : ''}
- **Disponibilidad:** ${availability === 'available' ? 'Disponible' : 'No disponible'}

${product.link ? `[Ver producto en la tienda oficial](${product.link})` : ''}

${allTags.length > 0 ? `## Características principales

${allTags.map(tag => `- ${tag}`).join('\n')}
` : ''}

${product.detailedDescription && product.detailedDescription.includes('objetivos') ? `## Objetivos

${product.detailedDescription.split('objetivos')[1] ? 
  product.detailedDescription.split('objetivos')[1].split('métodos de uso')[0].trim() : 
  'Apoyar el bienestar general y la salud.'
}
` : ''}

## Descripción

Este producto forma parte de la línea ${category} de EverGreen Life, reconocida por su calidad y efectividad.

${product.detailedDescription && product.detailedDescription.length > 200 ? 
  `\n## Información adicional\n\n${product.detailedDescription.substring(0, 500)}...` : ''
}

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
