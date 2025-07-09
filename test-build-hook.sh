#!/bin/bash

# Test del Build Hook de Netlify
echo "🧪 PROBANDO NETLIFY BUILD HOOK"
echo "=============================="

# Cargar variables de entorno
if [ -f .env ]; then
    echo "📄 Cargando variables desde .env..."
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas"
else
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Verificar que la variable existe
if [ -z "$NETLIFY_BUILD_HOOK" ]; then
    echo "❌ NETLIFY_BUILD_HOOK no está configurada"
    exit 1
fi

echo "🔗 Build Hook URL: ${NETLIFY_BUILD_HOOK}"

# Hacer la petición POST al build hook
echo "🚀 Triggeando build..."

response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"trigger":"manual-test","timestamp":"'$(date -Iseconds)'"}' \
    "$NETLIFY_BUILD_HOOK")

# Extraer el código de estado HTTP
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

echo "📥 Respuesta HTTP: $http_code"

if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo "✅ Build triggeado exitosamente!"
    echo "📋 Respuesta: $body"
    echo ""
    echo "🔍 Puedes verificar el build en:"
    echo "   https://app.netlify.com/sites/[tu-sitio]/deploys"
else
    echo "❌ Error triggeando build"
    echo "📋 Respuesta: $body"
    exit 1
fi

echo ""
echo "🎉 Test completado!"
echo "💡 Si el build se inicia, el webhook está funcionando correctamente."
