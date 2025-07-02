import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

// Función para extraer información detallada de cada producto
async function scrapeProductDetails(productUrl) {
    try {
        console.log(`  📄 Analizando: ${productUrl}`);
        const response = await axios.get(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        const details = {
            tags: [],
            description: '',
            features: [],
            ingredients: []
        };
        
        // Extraer tags/etiquetas más específicos
        const specificTagSelectors = [
            '.product-specifications .spec-value',
            '.product-benefits li',
            '.product-features li',
            '.product-advantages li',
            '.objetivos p',
            '.beneficios li',
            '.caracteristicas li'
        ];
        
        // Buscar tags en descripciones estructuradas
        const descriptionText = $('.product-description, .description, .tab-content').text();
        
        // Extraer beneficios y características de la descripción
        const benefitKeywords = [
            'energía', 'vitalidad', 'bienestar', 'antioxidante', 'natural',
            'vitaminas', 'minerales', 'suplemento', 'salud', 'nutrición',
            'inmunológico', 'digestivo', 'colágeno', 'antiedad', 'hidratante',
            'drenante', 'detox', 'metabolismo', 'proteína', 'aminoácidos'
        ];
        
        benefitKeywords.forEach(keyword => {
            if (descriptionText.toLowerCase().includes(keyword.toLowerCase())) {
                details.tags.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
            }
        });
        
        // Extraer de selectores específicos
        specificTagSelectors.forEach(selector => {
            $(selector).each((i, el) => {
                const tagText = $(el).text().trim();
                if (tagText && tagText.length > 2 && tagText.length < 30) {
                    details.tags.push(tagText);
                }
            });
        });
        
        // Extraer tags del nombre del producto
        const productName = $('.product-item-name, .page-title, h1').first().text().trim();
        if (productName) {
            if (productName.toLowerCase().includes('collagen')) details.tags.push('Colágeno');
            if (productName.toLowerCase().includes('protein')) details.tags.push('Proteína');
            if (productName.toLowerCase().includes('golden')) details.tags.push('Premium');
            if (productName.toLowerCase().includes('detox')) details.tags.push('Detox');
            if (productName.toLowerCase().includes('drenante')) details.tags.push('Drenante');
            if (productName.toLowerCase().includes('anticellulite')) details.tags.push('Anticelulítico');
            if (productName.toLowerCase().includes('brucia grassi')) details.tags.push('Quema grasas');
            if (productName.toLowerCase().includes('crema')) details.tags.push('Cosmético');
            if (productName.toLowerCase().includes('gel')) details.tags.push('Cosmético');
            if (productName.toLowerCase().includes('siero')) details.tags.push('Serum');
        }
        
        // Extraer descripción mejorada
        const descriptionSelectors = [
            '.product-description',
            '.description',
            '.product-details',
            '.product-info',
            '.product-content',
            '[class*="description"]'
        ];
        
        for (const selector of descriptionSelectors) {
            const desc = $(selector).first().text().trim();
            if (desc && desc.length > details.description.length) {
                details.description = desc;
            }
        }
        
        // Extraer características/beneficios
        $('.benefits li, .features li, .characteristics li').each((i, el) => {
            const feature = $(el).text().trim();
            if (feature && feature.length > 0 && feature.length < 100) {
                details.features.push(feature);
            }
        });
        
        // Limpiar y deduplicar tags
        details.tags = [...new Set(details.tags.filter(tag => 
            tag.length > 2 && 
            tag.length < 30 &&
            !tag.includes('€') && 
            !tag.includes('img') &&
            !tag.includes('ml') &&
            !tag.includes('Package') &&
            !tag.includes('Search') &&
            !tag.includes('Lenguaje') &&
            !tag.includes('Cantidad') &&
            !tag.includes('Inscríbase') &&
            !tag.includes('boletín') &&
            !tag.toLowerCase().includes('añadir') &&
            !tag.toLowerCase().includes('comprar') &&
            !tag.toLowerCase().includes('método') &&
            !tag.toLowerCase().includes('ingrediente')
        ))].slice(0, 8); // Limitar a 8 tags máximo
        
        return details;
        
    } catch (error) {
        console.log(`    ❌ Error al analizar ${productUrl}: ${error.message}`);
        return { tags: [], description: '', features: [], ingredients: [] };
    }
}

async function scrapeEvergreenProducts() {
    try {
        console.log('Iniciando scraping de https://www.evergreenlife.it/es_es/shop.html...');
        
        // Realizar petición HTTP a la página
        const response = await axios.get('https://www.evergreenlife.it/es_es/shop.html', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // Cargar el HTML con cheerio
        const $ = cheerio.load(response.data);
        
        const products = [];
        const seenProducts = new Set(); // Para evitar duplicados
        
        console.log('Analizando estructura de la página...');
        
        // Selectores más específicos para productos de Magento/ecommerce
        const productSelectors = [
            '.product-item-info',
            '.product-item',
            '.item.product',
            '.products-grid .item',
            '[data-product-sku]',
            '.product-image-container'
        ];
        
        let foundProducts = false;
        
        // Intentar con selectores específicos primero
        for (const selector of productSelectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`Encontrados ${elements.length} elementos con selector: ${selector}`);
                foundProducts = true;
                
                elements.each((index, element) => {
                    const $product = $(element);
                    
                    // Extraer información del producto
                    const name = $product.find('h1, h2, h3, h4, .product-item-name, .product-name, [class*="name"], [class*="title"]').first().text().trim() || 
                                $product.find('a').first().attr('title') || null;
                    
                    const priceElement = $product.find('.price, .cost, [class*="price"], [data-price-type="basePrice"]').first();
                    const price = priceElement.text().trim() || priceElement.attr('data-price-amount') || null;
                    
                    const imageElement = $product.find('img').first();
                    let image = imageElement.attr('src') || imageElement.attr('data-src') || imageElement.attr('data-lazy') || null;
                    
                    // Resolver URLs relativas
                    if (image && image.startsWith('/')) {
                        image = 'https://www.evergreenlife.it' + image;
                    }
                    
                    const linkElement = $product.find('a').first();
                    let link = linkElement.attr('href') || null;
                    if (link && link.startsWith('/')) {
                        link = 'https://www.evergreenlife.it' + link;
                    }
                    
                    const product = {
                        id: products.length + 1,
                        name: name,
                        price: price,
                        originalPrice: $product.find('.old-price, [class*="old-price"], [data-price-type="oldPrice"]').first().text().trim() || null,
                        description: $product.find('.description, .desc, [class*="description"]').first().text().trim() || null,
                        image: image,
                        link: link,
                        availability: $product.find('.availability, .stock, [class*="availability"], [class*="stock"]').first().text().trim() || null,
                        rating: $product.find('.rating, .stars, [class*="rating"], [class*="stars"]').first().text().trim() || null,
                        category: $product.find('.category, [class*="category"]').first().text().trim() || null,
                        brand: 'EverGreen Life',
                        sku: $product.attr('data-product-sku') || $product.find('[data-product-sku]').attr('data-product-sku') || null,
                        discount: $product.find('.discount, .sale, [class*="discount"], [class*="sale"]').first().text().trim() || null,
                        selector: selector,
                        tags: []
                    };
                    
                    // Extraer tags/etiquetas
                    $product.find('.tag, .label, .badge, [class*="tag"], [class*="label"], [class*="badge"]').each((i, tag) => {
                        const tagText = $(tag).text().trim();
                        if (tagText && tagText.length < 50) { // Evitar textos muy largos
                            product.tags.push(tagText);
                        }
                    });
                    
                    // Filtrar productos válidos y evitar duplicados
                    if (product.name && product.name.length > 1 && 
                        !seenProducts.has(product.name + product.link) &&
                        !product.name.toLowerCase().includes('search') &&
                        !product.name.toLowerCase().includes('lenguaje')) {
                        
                        seenProducts.add(product.name + product.link);
                        products.push(product);
                    }
                });
                
                break; // Si encuentra productos, no necesita probar otros selectores
            }
        }
        
        // Si no encuentra productos con selectores específicos, usar método genérico
        if (!foundProducts || products.length === 0) {
            console.log('No se encontraron productos con selectores específicos. Usando método genérico...');
            
            // Buscar elementos que contengan precios
            $('*:contains("€")').each((index, element) => {
                const $element = $(element);
                const text = $element.text();
                
                // Verificar que contenga un precio válido
                if (/\d+[,.]?\d*\s*€/.test(text) && text.length < 100) {
                    const $container = $element.closest('div, li, article, section');
                    
                    if ($container.length) {
                        const name = $container.find('h1, h2, h3, h4, h5, h6, a[title]').first().text().trim() || 
                                   $container.find('a').first().attr('title') || null;
                        
                        if (name && name.length > 1 && !seenProducts.has(name)) {
                            const product = {
                                id: products.length + 1,
                                name: name,
                                price: text.match(/\d+[,.]?\d*\s*€/)[0],
                                description: $container.find('p').first().text().trim() || null,
                                image: $container.find('img').first().attr('src') || null,
                                link: $container.find('a').first().attr('href') || null,
                                brand: 'EverGreen Life',
                                selector: 'generic-price-search'
                            };
                            
                            // Resolver URLs
                            if (product.image && product.image.startsWith('/')) {
                                product.image = 'https://www.evergreenlife.it' + product.image;
                            }
                            if (product.link && product.link.startsWith('/')) {
                                product.link = 'https://www.evergreenlife.it' + product.link;
                            }
                            
                            seenProducts.add(name);
                            products.push(product);
                        }
                    }
                }
            });
        }
        
        console.log(`Se encontraron ${products.length} productos`);
        
        // Enriquecer cada producto con información detallada
        console.log('\n🔍 Analizando páginas individuales de productos...');
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            if (product.link) {
                console.log(`\n${i + 1}/${products.length} - ${product.name}`);
                const details = await scrapeProductDetails(product.link);
                
                // Agregar información detallada al producto
                products[i].tags = details.tags;
                products[i].detailedDescription = details.description;
                products[i].features = details.features;
                
                // Pequeña pausa para no sobrecargar el servidor
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Guardar en archivo JSON
        const jsonData = {
            url: 'https://www.evergreenlife.it/es_es/shop.html',
            scrapedAt: new Date().toISOString(),
            totalProducts: products.length,
            products: products
        };
        
        fs.writeFileSync('evergreen_products.json', JSON.stringify(jsonData, null, 2));
        console.log('Datos guardados en evergreen_products.json');
        
        // Mostrar primeros productos como preview
        console.log('\n--- PREVIEW DE PRODUCTOS ---');
        products.slice(0, 3).forEach((product, index) => {
            console.log(`\nProducto ${index + 1}:`);
            console.log(`Nombre: ${product.name}`);
            console.log(`Precio: ${product.price}`);
            console.log(`Descripción: ${product.description ? product.description.substring(0, 100) + '...' : 'N/A'}`);
        });
        
        return jsonData;
        
    } catch (error) {
        console.error('Error durante el scraping:', error.message);
        return null;
    }
}

// Ejecutar el scraper
scrapeEvergreenProducts();
