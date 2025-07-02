#!/bin/bash

# Validador específico para netlify.toml
echo "🔍 Validando sintaxis de netlify.toml..."

# Verificar caracteres problemáticos
if grep -q $'\r' netlify.toml; then
    echo "❌ Detectados caracteres de retorno de carro (\\r) - usar LF solamente"
    exit 1
fi

# Verificar que no hay tabs mezclados con espacios en indentación
if grep -q $'\t' netlify.toml; then
    echo "⚠️ Detectados caracteres tab - recomendado usar solo espacios"
fi

# Verificar secciones requeridas
sections=("[build]" "[functions]" "[[redirects]]" "[[headers]]")
for section in "${sections[@]}"; do
    if grep -q "$section" netlify.toml; then
        echo "✅ Sección $section encontrada"
    else
        echo "❌ Sección $section faltante"
    fi
done

# Verificar configuraciones críticas
configs=("command = " "publish = " "directory = " "schedule = ")
for config in "${configs[@]}"; do
    if grep -q "$config" netlify.toml; then
        echo "✅ Configuración '$config' encontrada"
    else
        echo "❌ Configuración '$config' faltante"
    fi
done

# Verificar que las comillas están balanceadas
quote_count=$(grep -o '"' netlify.toml | wc -l)
if [ $((quote_count % 2)) -eq 0 ]; then
    echo "✅ Comillas balanceadas ($quote_count total)"
else
    echo "❌ Comillas desbalanceadas ($quote_count total)"
    exit 1
fi

# Verificar que los corchetes están balanceados
open_brackets=$(grep -o '\[' netlify.toml | wc -l)
close_brackets=$(grep -o '\]' netlify.toml | wc -l)
if [ "$open_brackets" -eq "$close_brackets" ]; then
    echo "✅ Corchetes balanceados ($open_brackets pares)"
else
    echo "❌ Corchetes desbalanceados (abiertos: $open_brackets, cerrados: $close_brackets)"
    exit 1
fi

# Verificar líneas problemáticas
line_num=0
while IFS= read -r line; do
    line_num=$((line_num + 1))
    
    # Verificar líneas que terminan con espacios en blanco
    if [[ "$line" =~ [[:space:]]$ ]]; then
        echo "⚠️ Línea $line_num termina con espacios en blanco"
    fi
    
done < netlify.toml

echo ""
echo "🎯 Validación de netlify.toml completada"
echo "📄 Total de líneas: $line_num"
echo ""
echo "✅ El archivo netlify.toml parece tener sintaxis correcta"
echo "🚀 Listo para desplegar en Netlify"
