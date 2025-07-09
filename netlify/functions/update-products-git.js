const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

exports.handler = async (event, context) => {
  console.log('🚀 Iniciando actualización de productos con Git API...');
  
  try {
    // Verificar autorización
    const authToken = process.env.NETLIFY_FUNCTION_TOKEN;
    const providedToken = event.headers['x-netlify-token'] || event.queryStringParameters?.token;
    
    if (!authToken || providedToken !== authToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Token de autorización inválido' })
      };
    }

    const startTime = Date.now();
    const results = {
      scraping: null,
      fileUpdates: [],
      gitCommit: null,
      errors: []
    };

    // PASO 1: Ejecutar scraping
    console.log('📡 Ejecutando scraper...');
    let productsData;
    try {
      const scrapingOutput = execSync('node scraper.js', { 
        encoding: 'utf8',
        timeout: 120000
      });
      
      // Leer datos generados
      if (fs.existsSync('evergreen_products.json')) {
        productsData = JSON.parse(fs.readFileSync('evergreen_products.json', 'utf8'));
        results.scraping = {
          success: true,
          productsCount: productsData.products?.length || 0,
          timestamp: new Date().toISOString()
        };
      }
      
      console.log('✅ Scraping completado');
    } catch (error) {
      console.error('❌ Error en scraping:', error.message);
      results.errors.push(`Scraping: ${error.message}`);
      results.scraping = { success: false, error: error.message };
    }

    if (!productsData) {
      throw new Error('No se pudieron obtener datos de productos');
    }

    // PASO 2: Generar archivos Markdown en memoria
    console.log('📝 Generando archivos Markdown...');
    const markdownFiles = [];
    
    try {
      // Usar la lógica del generador pero sin escribir archivos
      productsData.products.forEach(product => {
        const slug = createSlug(product.name);
        const content = generateMarkdownContent(product);
        
        markdownFiles.push({
          path: `src/content/products/${slug}.md`,
          content: content
        });
      });
      
      console.log(`✅ ${markdownFiles.length} archivos Markdown generados en memoria`);
    } catch (error) {
      console.error('❌ Error generando Markdown:', error.message);
      results.errors.push(`Markdown: ${error.message}`);
    }

    // PASO 3: Commit archivos via Git API
    if (markdownFiles.length > 0 && process.env.GITHUB_TOKEN) {
      console.log('📤 Committeando archivos via Git API...');
      
      try {
        // Preparar archivos para commit
        const filesToCommit = [
          {
            path: 'evergreen_products.json',
            content: JSON.stringify(productsData, null, 2)
          },
          ...markdownFiles
        ];
        
        const commitResult = await commitFilesToGitHub(filesToCommit);
        
        results.gitCommit = {
          success: true,
          commitSha: commitResult.sha,
          filesCommitted: filesToCommit.length,
          timestamp: new Date().toISOString()
        };
        
        console.log('✅ Archivos committeados exitosamente');
        
      } catch (error) {
        console.error('❌ Error en commit:', error.message);
        results.errors.push(`Git commit: ${error.message}`);
        results.gitCommit = { success: false, error: error.message };
      }
    }

    const endTime = Date.now();
    const response = {
      success: results.errors.length === 0,
      timestamp: new Date().toISOString(),
      duration: `${endTime - startTime}ms`,
      results,
      message: results.errors.length === 0 
        ? `Actualización exitosa: ${results.scraping?.productsCount} productos, ${markdownFiles.length} archivos actualizados`
        : `Errores encontrados: ${results.errors.join(', ')}`
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('💥 Error general:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

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

// Función para generar contenido Markdown
function generateMarkdownContent(product) {
  // Usar la misma lógica que generate_simple.cjs
  const cleanText = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const frontmatter = `---
title: "${cleanText(product.name)}"
description: "${cleanText(product.description || 'Producto EverGreen Life')}"
price: "${product.price || 'Consultar precio'}"
image: "${product.image || ''}"
category: "productos"
brand: "EverGreen Life"
inStock: ${product.availability !== 'No está disponible'}
sku: "${product.sku || ''}"
tags: ${JSON.stringify(product.tags || [])}
---

# ${product.name}

${product.detailedDescription || product.description || 'Descripción no disponible.'}

## Información del Producto

- **Precio**: ${product.price || 'Consultar precio'}
- **SKU**: ${product.sku || 'N/A'}
- **Disponibilidad**: ${product.availability || 'Disponible'}
- **Marca**: EverGreen Life

${product.tags && product.tags.length > 0 ? `\n## Categorías\n\n${product.tags.map(tag => `- ${tag}`).join('\n')}` : ''}
`;

  return frontmatter;
}

// Función para committear archivos a GitHub
async function commitFilesToGitHub(files) {
  const owner = process.env.GITHUB_OWNER || 'tu-usuario';
  const repo = process.env.GITHUB_REPO || 'square-saturn';
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error('GITHUB_TOKEN no configurado');
  }

  // Obtener la referencia del branch main
  const mainRef = await makeGitHubRequest(`/repos/${owner}/${repo}/git/refs/heads/main`, 'GET', token);
  const latestCommitSha = mainRef.object.sha;
  
  // Obtener el tree del último commit
  const latestCommit = await makeGitHubRequest(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, 'GET', token);
  const baseTreeSha = latestCommit.tree.sha;
  
  // Crear tree con los archivos nuevos/modificados
  const tree = files.map(file => ({
    path: file.path,
    mode: '100644',
    type: 'blob',
    content: file.content
  }));
  
  const newTree = await makeGitHubRequest(`/repos/${owner}/${repo}/git/trees`, 'POST', token, {
    base_tree: baseTreeSha,
    tree: tree
  });
  
  // Crear nuevo commit
  const newCommit = await makeGitHubRequest(`/repos/${owner}/${repo}/git/commits`, 'POST', token, {
    message: `🤖 Actualización automática de productos - ${new Date().toISOString()}`,
    tree: newTree.sha,
    parents: [latestCommitSha]
  });
  
  // Actualizar la referencia del branch
  await makeGitHubRequest(`/repos/${owner}/${repo}/git/refs/heads/main`, 'PATCH', token, {
    sha: newCommit.sha
  });
  
  return newCommit;
}

// Función auxiliar para requests a GitHub API
function makeGitHubRequest(endpoint, method, token, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'square-saturn-updater',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}
