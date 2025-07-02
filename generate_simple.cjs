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
    
    // Función para limpiar y escapar texto para YAML
    function cleanTextForYAML(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .replace(/"/g, '\\"')           // Escapar comillas dobles
            .replace(/\n/g, ' ')           // Reemplazar saltos de línea con espacios
            .replace(/\r/g, '')            // Remover retornos de carro
            .replace(/\t/g, ' ')           // Reemplazar tabs con espacios
            .replace(/\s+/g, ' ')          // Normalizar espacios múltiples
            .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, '') // Remover caracteres especiales problemáticos
            .trim();
    }
    
    // Función para extraer descripción limpia
    function extractCleanDescription(detailedDescription, productName) {
        if (!detailedDescription) {
            return `${productName} de EverGreen Life. Producto de alta calidad.`;
        }
        
        // Remover JavaScript y código HTML - versión mejorada
        let cleanDesc = detailedDescription
            .replace(/\/\/.*$/gm, '')       // Remover comentarios JS
            .replace(/require\([\s\S]*?\)\s*;?\s*/g, '') // Remover require statements
            .replace(/\$\([\s\S]*?\)\s*;?\s*/g, '')    // Remover jQuery
            .replace(/function[\s\S]*?\{[\s\S]*?\}/g, '') // Remover funciones
            .replace(/alert\([\s\S]*?\)\s*;?\s*/g, '') // Remover alerts
            .replace(/window\.[\s\S]*?;/g, '') // Remover window calls
            .replace(/document\.[\s\S]*?;/g, '') // Remover document calls
            .replace(/<script[\s\S]*?<\/script>/gi, '') // Remover tags script
            .replace(/<[^>]*>/g, '')          // Remover HTML tags
            .replace(/Descripción\s*/i, '') // Remover "Descripción"
            .replace(/Compartir producto[\s\S]*$/i, '') // Remover contenido de compartir
            .replace(/^\s+/gm, '') // Remover espacios al inicio de líneas
            .replace(/\s+/g, ' ') // Normalizar espacios
            .trim();
            
        // Extraer solo la primera parte descriptiva (antes de secciones específicas)
        // Solo cortar si las palabras aparecen como títulos de sección, no en medio del texto
        const objectivesPattern = /\s+objetivos\s+/i;
        const methodsPattern = /\s+métodos de uso\s+/i;
        const ingredientsPattern = /\s+ingredientes\s+/i;
        
        // Solo cortar si encuentra el patrón después de un mínimo de caracteres (evita cortes prematuros)
        const minLength = 200;
        
        if (cleanDesc.length > minLength) {
            const restOfText = cleanDesc.substring(minLength);
            
            if (objectivesPattern.test(restOfText)) {
                const match = restOfText.search(objectivesPattern);
                cleanDesc = cleanDesc.substring(0, minLength + match).trim();
            }
            
            if (methodsPattern.test(restOfText)) {
                const match = restOfText.search(methodsPattern);
                cleanDesc = cleanDesc.substring(0, minLength + match).trim();
            }
            
            if (ingredientsPattern.test(restOfText)) {
                const match = restOfText.search(ingredientsPattern);
                cleanDesc = cleanDesc.substring(0, minLength + match).trim();
            }
        }
        
        // Si queda muy poco texto o está vacío, usar descripción por defecto
        if (cleanDesc.length < 50) {
            return `${productName} de EverGreen Life. Producto de alta calidad.`;
        }
        
        // Truncar si es muy largo y limpiar
        if (cleanDesc.length > 200) {
            // Encontrar el final de la oración más cercano después de 150 chars
            let cutPoint = 200;
            const punctuation = ['.', '!', '?', ':', ';'];
            
            // Buscar puntuación entre 150 y 250 caracteres
            for (let i = 150; i < Math.min(cleanDesc.length, 250); i++) {
                if (punctuation.includes(cleanDesc[i])) {
                    cutPoint = i + 1;
                    break;
                }
            }
            
            // Si no encuentra puntuación, buscar espacio después de 180 chars
            if (cutPoint === 200) {
                for (let i = 180; i < Math.min(cleanDesc.length, 220); i++) {
                    if (cleanDesc[i] === ' ') {
                        cutPoint = i;
                        break;
                    }
                }
            }
            
            cleanDesc = cleanDesc.substring(0, cutPoint);
            
            // Agregar puntos suspensivos si no termina en puntuación
            if (cutPoint < cleanDesc.length && !punctuation.includes(cleanDesc[cleanDesc.length - 1])) {
                cleanDesc += '...';
            }
        }
        
        return cleanTextForYAML(cleanDesc);
    }
    
    // Función para extraer contenido de secciones específicas
    function extractSection(detailedDescription, sectionName) {
        if (!detailedDescription || typeof detailedDescription !== 'string') return '';
        
        const lowerDesc = detailedDescription.toLowerCase();
        const sectionStart = lowerDesc.indexOf(sectionName.toLowerCase());
        
        if (sectionStart === -1) return '';
        
        let content = detailedDescription.substring(sectionStart + sectionName.length);
        
        // Buscar el final de la sección (próxima sección o palabra clave)
        const endMarkers = ['objetivos', 'métodos de uso', 'ingredientes', 'advertencias', 'compartir'];
        let endIndex = content.length;
        
        for (const marker of endMarkers) {
            const markerIndex = content.toLowerCase().indexOf(marker);
            if (markerIndex !== -1 && markerIndex < endIndex) {
                endIndex = markerIndex;
            }
        }
        
        content = content.substring(0, endIndex).trim();
        
        // Limpiar contenido
        content = content
            .replace(/\/\/.*$/gm, '')
            .replace(/require\(.*?\)/g, '')
            .replace(/\$\(.*?\)/g, '')
            .replace(/<.*?>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
        return content.length > 20 ? content : '';
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
            
            // Limpiar descripción
            const cleanDescription = extractCleanDescription(product.detailedDescription, product.name);
            
            // Construir frontmatter
            const frontmatter = [];
            frontmatter.push(`name: "${cleanTextForYAML(product.name)}"`);
            frontmatter.push(`description: "${cleanDescription}"`);
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
            frontmatter.push(`tags: [${allTags.map(tag => `"${cleanTextForYAML(tag)}"`).join(', ')}]`);
            
            if (sizeInfo) {
                frontmatter.push(`packageSize: "${cleanTextForYAML(sizeInfo)}"`);
            }
            
            if (product.sku) {
                frontmatter.push(`sku: "${cleanTextForYAML(product.sku)}"`);
            }
            
            frontmatter.push(`createdAt: "${new Date().toISOString()}"`);
            frontmatter.push(`seoTitle: "${cleanTextForYAML(product.name)} - EverGreen Life"`);
            frontmatter.push(`seoDescription: "Compra ${cleanTextForYAML(product.name)} de EverGreen Life."`);
            
            // Extraer secciones específicas
            const objetivos = extractSection(product.detailedDescription, 'objetivos');
            const metodosUso = extractSection(product.detailedDescription, 'métodos de uso');
            const content = `---
${frontmatter.join('\n')}
---

# ${cleanTextForYAML(product.name)}

${cleanDescription}

## Información del Producto

- **Precio:** ${product.price || '0,00 €'}
- **Marca:** EverGreen Life
${product.sku ? `- **SKU:** ${cleanTextForYAML(product.sku)}` : ''}
- **Categoría:** ${category}
${sizeInfo ? `- **Tamaño:** ${cleanTextForYAML(sizeInfo)}` : ''}
- **Disponibilidad:** ${availability === 'available' ? 'Disponible' : 'No disponible'}

${product.link ? `[Ver producto en la tienda oficial](${product.link})` : ''}

${allTags.length > 0 ? `## Características principales

${allTags.map(tag => `- ${cleanTextForYAML(tag)}`).join('\n')}
` : ''}

${objetivos ? `## Objetivos

${objetivos}
` : ''}

${metodosUso ? `## Métodos de uso

${metodosUso}
` : ''}

## Descripción

Este producto forma parte de la línea ${category} de EverGreen Life, reconocida por su calidad y efectividad.

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
