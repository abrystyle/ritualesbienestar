#!/bin/bash

# Script de prueba para verificar el funcionamiento local
# antes del despliegue en Netlify

echo "🧪 Iniciando pruebas del sistema de automatización..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar resultado
show_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Test 1: Verificar dependencias
echo -e "\n${YELLOW}📦 Test 1: Verificando dependencias...${NC}"
node --version
npm --version

if command -v pnpm &> /dev/null; then
    pnpm --version
    show_result 0 "pnpm está instalado"
else
    show_result 1 "pnpm no está instalado"
fi

# Test 2: Verificar archivos necesarios
echo -e "\n${YELLOW}📁 Test 2: Verificando archivos del proyecto...${NC}"

files=("scraper.js" "generate_simple.cjs" "netlify.toml" "package.json")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        show_result 0 "Archivo $file existe"
    else
        show_result 1 "Archivo $file NO existe"
    fi
done

# Test 3: Verificar funciones de Netlify
echo -e "\n${YELLOW}⚡ Test 3: Verificando funciones de Netlify...${NC}"

functions=("netlify/functions/update-products.js" "netlify/functions/trigger-build.js" "netlify/functions/daily-update.js")
for func in "${functions[@]}"; do
    if [ -f "$func" ]; then
        show_result 0 "Función $func existe"
    else
        show_result 1 "Función $func NO existe"
    fi
done

# Test 4: Verificar sintaxis de archivos JavaScript
echo -e "\n${YELLOW}🔍 Test 4: Verificando sintaxis...${NC}"

# Verificar scraper.js
if node -c scraper.js 2>/dev/null; then
    show_result 0 "scraper.js - sintaxis correcta"
else
    show_result 1 "scraper.js - error de sintaxis"
fi

# Verificar generate_simple.cjs
if node -c generate_simple.cjs 2>/dev/null; then
    show_result 0 "generate_simple.cjs - sintaxis correcta"
else
    show_result 1 "generate_simple.cjs - error de sintaxis"
fi

# Verificar funciones de Netlify
for func in "${functions[@]}"; do
    if node -c "$func" 2>/dev/null; then
        show_result 0 "$(basename $func) - sintaxis correcta"
    else
        show_result 1 "$(basename $func) - error de sintaxis"
    fi
done

# Test 5: Verificar configuración de netlify.toml
echo -e "\n${YELLOW}⚙️ Test 5: Verificando configuración netlify.toml...${NC}"

if grep -q "command = \"pnpm build\"" netlify.toml; then
    show_result 0 "Build command configurado correctamente"
else
    show_result 1 "Build command no configurado"
fi

if grep -q "publish = \"dist\"" netlify.toml; then
    show_result 0 "Publish directory configurado correctamente"
else
    show_result 1 "Publish directory no configurado"
fi

if grep -q "functions = \"netlify/functions\"" netlify.toml; then
    show_result 0 "Functions directory configurado correctamente"
else
    show_result 1 "Functions directory no configurado"
fi

# Test 6: Prueba de ejecución del scraper (opcional, comentado por defecto)
echo -e "\n${YELLOW}🕷️ Test 6: Prueba básica del scraper...${NC}"
echo "   (Esta prueba está deshabilitada por defecto para evitar requests innecesarios)"
echo "   Para habilitarla, descomenta las líneas en el script de prueba"

# Descomenta estas líneas para probar el scraper:
# echo "   Ejecutando scraper de prueba..."
# if timeout 30s node scraper.js &>/dev/null; then
#     show_result 0 "Scraper ejecutado exitosamente"
# else
#     show_result 1 "Error ejecutando scraper"
# fi

# Test 7: Verificar estructura de directorios
echo -e "\n${YELLOW}📂 Test 7: Verificando estructura de directorios...${NC}"

directories=("src/content/products" "netlify/functions" "public")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        show_result 0 "Directorio $dir existe"
    else
        show_result 1 "Directorio $dir NO existe"
    fi
done

# Test 8: Verificar package.json
echo -e "\n${YELLOW}📋 Test 8: Verificando package.json...${NC}"

if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
    show_result 0 "package.json es un JSON válido"
    
    # Verificar dependencias críticas
    if node -e "const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8')); process.exit(pkg.dependencies && pkg.dependencies.axios ? 0 : 1)" 2>/dev/null; then
        show_result 0 "Dependencia axios presente"
    else
        show_result 1 "Dependencia axios faltante"
    fi
    
    if node -e "const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8')); process.exit(pkg.dependencies && pkg.dependencies.cheerio ? 0 : 1)" 2>/dev/null; then
        show_result 0 "Dependencia cheerio presente"
    else
        show_result 1 "Dependencia cheerio faltante"
    fi
else
    show_result 1 "package.json no es un JSON válido"
fi

echo -e "\n${YELLOW}🏁 Resumen de pruebas completado${NC}"
echo "   Revisa los resultados arriba antes de desplegar en Netlify"
echo ""
echo "Próximos pasos:"
echo "1. Corregir cualquier error encontrado"
echo "2. Instalar dependencias: pnpm install"
echo "3. Desplegar en Netlify"
echo "4. Configurar variables de entorno en Netlify"
echo "5. Crear build hook en Netlify"
echo "6. Probar las funciones manualmente"
echo ""
echo "Ver NETLIFY_SETUP.md para instrucciones detalladas."
