const fs = require('fs');

console.log('🔍 Debug script...');

// Leer un producto del JSON
const rawData = fs.readFileSync('evergreen_products.json', 'utf8');
const jsonData = JSON.parse(rawData);

const firstProduct = jsonData.products[0];

console.log('Primer producto:');
console.log('Nombre:', firstProduct.name);
console.log('Tipo de nombre:', typeof firstProduct.name);
console.log('Nombre toLowerCase:', firstProduct.name.toLowerCase());

// Función para categorizar
function getCategory(productName) {
    console.log('getCategory recibió:', productName, typeof productName);
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

const categoria = getCategory(firstProduct.name);
console.log('Categoría resultante:', categoria, typeof categoria);
