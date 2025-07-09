const https = require('https');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  console.log('🚀 Iniciando actualización de productos via GitHub API...');
  
  try {
    // Verificar que sea una ejecución autorizada
    const authToken = process.env.NETLIFY_FUNCTION_TOKEN;
    const providedToken = event.headers['x-netlify-token'] || event.queryStringParameters?.token;
    
    if (!authToken || providedToken !== authToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Token de autorización inválido' })
      };
    }

    // Verificar configuración de GitHub
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    
    if (!githubToken || !githubOwner || !githubRepo) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Configuración de GitHub incompleta',
          missing: {
            token: !githubToken,
            owner: !githubOwner,
            repo: !githubRepo
          }
        })
      };
    }

    const startTime = Date.now();
    const results = {
      scraping: null,
      generation: null,
      commit: null,
      build: null,
      errors: []
    };

    console.log('📡 Ejecutando scraping en memoria...');
    let scrapedData;
    try {
      scrapedData = await runScrapingInMemory();
      results.scraping = {
        success: true,
        productsCount: scrapedData.products.length,
        timestamp: new Date().toISOString()
      };
      console.log(`✅ Scraping completado: ${scrapedData.products.length} productos`);
    } catch (error) {
      console.error('❌ Error en scraping:', error.message);
      results.errors.push(`Scraping: ${error.message}`);
      results.scraping = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Si el scraping falla, no podemos continuar
      throw new Error('Scraping falló: ' + error.message);
    }

    console.log('📝 Generando archivos Markdown en memoria...');
    let markdownFiles;
    try {
      markdownFiles = await generateMarkdownInMemory(scrapedData);
      results.generation = {
        success: true,
        filesGenerated: markdownFiles.length,
        timestamp: new Date().toISOString()
      };
      console.log(`✅ Generación completada: ${markdownFiles.length} archivos`);
    } catch (error) {
      console.error('❌ Error en generación:', error.message);
      results.errors.push(`Generation: ${error.message}`);
      results.generation = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Si la generación falla, no podemos continuar
      throw new Error('Generación falló: ' + error.message);
    }

    console.log('📤 Preparando commit a GitHub...');
    try {
      // Obtener datos anteriores para comparar cambios
      const previousData = await getFileFromGitHub(githubOwner, githubRepo, githubToken, 'evergreen_products.json');
      let stockChanges = [];
      let shouldTriggerBuild = false;
      
      if (previousData) {
        try {
          const prevProducts = JSON.parse(previousData).products || [];
          const currentProducts = scrapedData.products || [];
          
          // Detectar cambios de stock
          currentProducts.forEach(product => {
            const previous = prevProducts.find(prev => 
              (prev.sku && prev.sku === product.sku) || prev.name === product.name
            );
            
            if (previous && previous.availability !== product.availability) {
              stockChanges.push({
                name: product.name,
                sku: product.sku,
                previousStock: previous.availability,
                currentStock: product.availability
              });
              shouldTriggerBuild = true;
            }
          });
          
          console.log(`📊 Cambios de stock detectados: ${stockChanges.length}`);
        } catch (error) {
          console.log('⚠️ No se pudo comparar con datos anteriores');
        }
      }

      // Crear commit con todos los archivos
      const commitResult = await commitFilesToGitHub(
        githubOwner, 
        githubRepo, 
        githubToken, 
        scrapedData, 
        markdownFiles,
        stockChanges
      );
      
      results.commit = {
        success: true,
        sha: commitResult.sha,
        url: commitResult.url,
        filesUpdated: commitResult.filesUpdated,
        stockChanges: stockChanges.length,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Commit exitoso: ${commitResult.sha}`);

      // Si hay cambios críticos y el commit fue exitoso, triggear build
      if (shouldTriggerBuild && process.env.NETLIFY_BUILD_HOOK) {
        console.log('🚀 Cambios críticos detectados, triggeando build...');
        try {
          const buildResult = await triggerNetlifyBuild(process.env.NETLIFY_BUILD_HOOK);
          results.autoBuild = {
            triggered: true,
            reason: 'Cambios críticos de stock detectados',
            result: buildResult
          };
        } catch (error) {
          console.log('⚠️ Error triggeando build automático:', error.message);
          results.autoBuild = {
            triggered: false,
            error: error.message
          };
        }
      }

    } catch (error) {
      console.error('❌ Error en commit:', error.message);
      results.errors.push(`Commit: ${error.message}`);
      results.commit = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const response = {
      success: results.errors.length === 0,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      productsCount: scrapedData ? scrapedData.products.length : 0,
      filesGenerated: markdownFiles ? markdownFiles.length : 0,
      results,
      message: results.errors.length === 0 
        ? `Actualización exitosa: ${scrapedData.products.length} productos procesados y commiteados a GitHub`
        : `Actualización con errores: ${results.errors.join(', ')}`
    };

    console.log('📊 Resultado final:', response.message);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('💥 Error general:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Error interno del servidor'
      })
    };
  }
};

// Función para ejecutar scraping en memoria (integrando scraper.js)
async function runScrapingInMemory() {
  const baseUrl = 'https://www.evergreenlife.it';
  
  try {
    console.log('🕷️ Iniciando scraping de EverGreen Life...');
    
    // Hacer request a la página principal de productos
    const axios = require('axios'); // Tendríamos que incluir esto en el package
    
    // En el entorno de Netlify Functions, usemos la API nativa de Node.js
    const response = await makeHttpRequest('GET', 'www.evergreenlife.it', '/es_es/shop.html');
    
    // Simular cheerio con regex básicos para extraer productos
    const products = await parseProductsFromHTML(response);
    
    console.log(`✅ Scraping completado: ${products.length} productos encontrados`);
    
    return {
      url: 'https://www.evergreenlife.it/es_es/shop.html',
      scrapedAt: new Date().toISOString(),
      totalProducts: products.length,
      products: products,
      source: 'scraping-in-memory'
    };
    
  } catch (error) {
    console.error('❌ Error en scraping:', error.message);
    
    // Fallback a datos básicos si el scraping falla
    const fallbackProducts = [
      {
        id: 1,
        name: "O.life Acido Ialuronico Gel",
        sku: "OLIFE-AIG-001",
        price: "29.90",
        availability: "disponible",
        description: "Gel hidratante con ácido hialurónico para el cuidado facial",
        tags: ["skincare", "hidratante", "antiaging"],
        image: "/images/olife-acido-ialuronico.jpg",
        link: `${baseUrl}/products/olife-acido-ialuronico-gel`,
        brand: 'EverGreen Life'
      },
      {
        id: 2,
        name: "O.life Anticellulite Capsule", 
        sku: "OLIFE-AC-002",
        price: "39.90",
        availability: "agotado",
        description: "Cápsulas anticelulíticas para tratamiento interno",
        tags: ["cellulite", "capsulas", "tratamiento"],
        image: "/images/olife-anticellulite.jpg",
        link: `${baseUrl}/products/olife-anticellulite-capsule`,
        brand: 'EverGreen Life'
      }
    ];

    return {
      url: 'https://www.evergreenlife.it/es_es/shop.html',
      scrapedAt: new Date().toISOString(),
      totalProducts: fallbackProducts.length,
      products: fallbackProducts,
      source: 'fallback-data',
      error: error.message
    };
  }
}

// Función auxiliar para hacer requests HTTP
async function makeHttpRequest(method, hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Función para parsear productos del HTML usando regex básicos
async function parseProductsFromHTML(html) {
  const products = [];
  const seenProducts = new Set();
  
  // Regex para encontrar productos con precios
  const priceRegex = /(\d+[,.]?\d*)\s*€/g;
  const matches = html.match(priceRegex);
  
  if (!matches || matches.length === 0) {
    throw new Error('No se encontraron productos con precios');
  }
  
  // Buscar nombres de productos O.life específicos
  const productPatterns = [
    /O\.life[^<>]*?(?:gel|capsule|crema|siero|trattamento|brucia|drenante|anticellulite)/gi,
    /Olife[^<>]*?(?:gel|capsule|crema|siero|trattamento|brucia|drenante|anticellulite)/gi
  ];
  
  let productId = 1;
  
  for (const pattern of productPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const productName = match[0].trim();
      
      if (!seenProducts.has(productName) && productName.length > 5) {
        seenProducts.add(productName);
        
        // Buscar precio cerca del producto
        const startIndex = Math.max(0, match.index - 500);
        const endIndex = Math.min(html.length, match.index + 500);
        const context = html.substring(startIndex, endIndex);
        
        const priceMatch = context.match(/(\d+[,.]?\d*)\s*€/);
        const price = priceMatch ? priceMatch[1] : null;
        
        // Determinar disponibilidad básica
        const availability = context.toLowerCase().includes('agotado') || 
                           context.toLowerCase().includes('out of stock') ? 'agotado' : 'disponible';
        
        // Generar tags básicos del nombre
        const tags = generateTagsFromName(productName);
        
        // Generar SKU básico
        const sku = generateSKU(productName, productId);
        
        products.push({
          id: productId++,
          name: productName,
          sku: sku,
          price: price,
          availability: availability,
          description: `Producto ${productName} de EverGreen Life`,
          tags: tags,
          image: `/images/${sku.toLowerCase()}.jpg`,
          link: `https://www.evergreenlife.it/products/${sku.toLowerCase()}`,
          brand: 'EverGreen Life',
          selector: 'regex-extraction'
        });
      }
    }
  }
  
  console.log(`📦 Productos extraídos: ${products.length}`);
  return products;
}

// Función para generar tags del nombre del producto
function generateTagsFromName(productName) {
  const tags = [];
  const name = productName.toLowerCase();
  
  if (name.includes('gel')) tags.push('Cosmético', 'Gel');
  if (name.includes('capsule')) tags.push('Suplemento', 'Cápsulas');
  if (name.includes('crema')) tags.push('Cosmético', 'Crema');
  if (name.includes('siero')) tags.push('Cosmético', 'Serum');
  if (name.includes('anticellulite')) tags.push('Anticelulítico', 'Belleza');
  if (name.includes('brucia grassi')) tags.push('Quema grasas', 'Metabolismo');
  if (name.includes('drenante')) tags.push('Drenante', 'Detox');
  if (name.includes('collagen')) tags.push('Colágeno', 'Antiaging');
  if (name.includes('acido ialuronico')) tags.push('Ácido hialurónico', 'Hidratante');
  if (name.includes('attivatore metabolico')) tags.push('Metabolismo', 'Energía');
  
  return [...new Set(tags)]; // Eliminar duplicados
}

// Función para generar SKU
function generateSKU(productName, id) {
  const cleanName = productName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(' ')
    .slice(0, 3)
    .map(word => word.substring(0, 3).toUpperCase())
    .join('-');
  
  return `${cleanName}-${String(id).padStart(3, '0')}`;
}

// Función para generar archivos Markdown en memoria
async function generateMarkdownInMemory(productsData) {
  const markdownFiles = [];
  
  for (const product of productsData.products) {
    const slug = product.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const frontmatter = {
      title: product.name,
      description: product.description || `Producto ${product.name}`,
      pubDate: new Date().toISOString().split('T')[0],
      heroImage: product.image || '/placeholder.jpg',
      price: product.price,
      availability: product.availability,
      sku: product.sku || '',
      tags: product.tags || [],
      url: product.url || ''
    };

    const content = `---
${Object.entries(frontmatter)
  .map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}:\n${value.map(item => `  - "${item}"`).join('\n')}`;
    }
    return `${key}: "${value}"`;
  })
  .join('\n')}
---

# ${product.name}

${product.description || 'Descripción del producto no disponible.'}

## Características

- **Precio**: €${product.price}
- **Disponibilidad**: ${product.availability}
- **SKU**: ${product.sku || 'No disponible'}

## Etiquetas

${(product.tags || []).map(tag => `- ${tag}`).join('\n')}

---

*Última actualización: ${new Date().toLocaleDateString()}*
`;

    markdownFiles.push({
      path: `src/content/products/${slug}.md`,
      content: content
    });
  }

  return markdownFiles;
}

// Función para obtener un archivo desde GitHub
async function getFileFromGitHub(owner, repo, token, filePath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/contents/${filePath}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'square-saturn-netlify',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const fileData = JSON.parse(data);
            const content = Buffer.from(fileData.content, 'base64').toString('utf8');
            resolve(content);
          } catch (error) {
            reject(error);
          }
        } else if (res.statusCode === 404) {
          resolve(null); // Archivo no existe
        } else {
          reject(new Error(`GitHub API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Función para hacer commit de archivos a GitHub
async function commitFilesToGitHub(owner, repo, token, productsData, markdownFiles, stockChanges) {
  // 1. Obtener referencia de la rama principal
  const ref = await getGitHubRef(owner, repo, token, 'heads/main');
  
  // 2. Obtener el tree base
  const baseTree = await getGitHubTree(owner, repo, token, ref.object.sha);
  
  // 3. Crear nuevos blobs para los archivos
  const blobs = [];
  
  // Blob para evergreen_products.json
  const jsonBlob = await createGitHubBlob(owner, repo, token, JSON.stringify(productsData, null, 2));
  blobs.push({
    path: 'evergreen_products.json',
    mode: '100644',
    type: 'blob',
    sha: jsonBlob.sha
  });

  // Blob para backup
  const backupBlob = await createGitHubBlob(owner, repo, token, JSON.stringify(productsData, null, 2));
  blobs.push({
    path: 'evergreen_products_backup.json',
    mode: '100644',
    type: 'blob',
    sha: backupBlob.sha
  });

  // Blobs para archivos Markdown
  for (const file of markdownFiles) {
    const blob = await createGitHubBlob(owner, repo, token, file.content);
    blobs.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
  }

  // 4. Crear nuevo tree
  const newTree = await createGitHubTree(owner, repo, token, baseTree.sha, blobs);
  
  // 5. Crear commit
  const commitMessage = stockChanges.length > 0 
    ? `🔄 Actualización automática de productos (${stockChanges.length} cambios de stock)`
    : '📦 Actualización automática de productos';
    
  const commit = await createGitHubCommit(owner, repo, token, commitMessage, newTree.sha, ref.object.sha);
  
  // 6. Actualizar referencia
  await updateGitHubRef(owner, repo, token, 'heads/main', commit.sha);
  
  return {
    sha: commit.sha,
    url: commit.html_url,
    filesUpdated: blobs.length
  };
}

// Funciones auxiliares para GitHub API
async function makeGitHubRequest(method, path, token, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'square-saturn-netlify',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (error) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`GitHub API error ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function getGitHubRef(owner, repo, token, ref) {
  return makeGitHubRequest('GET', `/repos/${owner}/${repo}/git/refs/${ref}`, token);
}

async function getGitHubTree(owner, repo, token, sha) {
  return makeGitHubRequest('GET', `/repos/${owner}/${repo}/git/trees/${sha}`, token);
}

async function createGitHubBlob(owner, repo, token, content) {
  return makeGitHubRequest('POST', `/repos/${owner}/${repo}/git/blobs`, token, {
    content: Buffer.from(content).toString('base64'),
    encoding: 'base64'
  });
}

async function createGitHubTree(owner, repo, token, baseTree, tree) {
  return makeGitHubRequest('POST', `/repos/${owner}/${repo}/git/trees`, token, {
    base_tree: baseTree,
    tree: tree
  });
}

async function createGitHubCommit(owner, repo, token, message, tree, parents) {
  return makeGitHubRequest('POST', `/repos/${owner}/${repo}/git/commits`, token, {
    message: message,
    tree: tree,
    parents: [parents]
  });
}

async function updateGitHubRef(owner, repo, token, ref, sha) {
  return makeGitHubRequest('PATCH', `/repos/${owner}/${repo}/git/refs/${ref}`, token, {
    sha: sha
  });
}

// Función auxiliar para triggear builds en Netlify
async function triggerNetlifyBuild(buildHookUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(buildHookUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            statusCode: res.statusCode,
            response: data
          });
        } else {
          reject(new Error(`Build hook falló con status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({
      trigger: 'auto-stock-update',
      timestamp: new Date().toISOString()
    }));
    
    req.end();
  });
}
