# Ejemplos de Uso - Funciones de Netlify

## 🚀 Comandos curl para probar las funciones

Reemplaza `TU_SITIO` con tu dominio de Netlify y `TU_TOKEN` con tu token secreto.

### 1. Actualizar productos solamente
```bash
curl -X POST "https://TU_SITIO.netlify.app/api/products" \
  -H "x-netlify-token: TU_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\\nStatus: %{http_code}\\nTime: %{time_total}s\\n"
```

### 2. Triggear build solamente
```bash
curl -X POST "https://TU_SITIO.netlify.app/api/build" \
  -H "x-netlify-token: TU_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\\nStatus: %{http_code}\\nTime: %{time_total}s\\n"
```

### 3. Proceso completo (scraping + generación + build)
```bash
curl -X POST "https://TU_SITIO.netlify.app/api/daily" \
  -H "x-netlify-token: TU_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\\nStatus: %{http_code}\\nTime: %{time_total}s\\n"
```

## 📝 Scripts de prueba locales

### Verificar configuración antes del deploy
```bash
./test-setup.sh
```

### Verificar estructura de funciones
```bash
node test-functions.cjs syntax
```

## 🔧 Variables de entorno requeridas en Netlify

```bash
# Token de seguridad (genera uno aleatorio y seguro)
NETLIFY_FUNCTION_TOKEN=your-secret-token-here-123456

# Build hook (obtén desde Site Settings → Build & deploy → Build hooks)
NETLIFY_BUILD_HOOK=https://api.netlify.com/build_hooks/YOUR-HOOK-ID
```

## ⏰ Programación automática

La función está configurada para ejecutarse diariamente a las **6:00 AM UTC**.

Para diferentes zonas horarias:
- **España (invierno)**: 7:00 AM
- **España (verano)**: 8:00 AM  
- **México (CDMX)**: 12:00 AM (medianoche)
- **Argentina**: 3:00 AM
- **Colombia**: 1:00 AM

Para cambiar el horario, edita el cron en `netlify.toml`:
```toml
[[functions]]
  path = "/.netlify/functions/daily-update"
  schedule = "0 6 * * *"  # formato: min hora día mes día-semana
```

## 📊 Respuestas esperadas

### ✅ Éxito
```json
{
  "success": true,
  "timestamp": "2024-07-02T06:00:00.000Z",
  "duration": "45s",
  "message": "Actualización exitosa: 2 nuevos, 3 actualizados, 45 total",
  "dailyResults": {
    "scraping": { "success": true },
    "generation": { "success": true },
    "buildTrigger": { "success": true },
    "summary": {
      "totalErrors": 0,
      "productsProcessed": 45,
      "newProducts": 2,
      "updatedProducts": 3
    }
  }
}
```

### ❌ Error de autorización
```json
{
  "error": "Token de autorización inválido"
}
```

### ⚠️ Error parcial
```json
{
  "success": false,
  "message": "Proceso con errores críticos (2 errores)",
  "dailyResults": {
    "scraping": { "success": false, "error": "Timeout" },
    "generation": { "success": true },
    "buildTrigger": { "skipped": true }
  }
}
```

## 🔍 Monitoreo y logs

### Ver logs en Netlify Dashboard
1. Ir a tu sitio en Netlify
2. **Functions** → Seleccionar función
3. Ver logs en tiempo real

### Logs típicos exitosos
```
🌅 Iniciando proceso diario de actualización de productos...
📡 PASO 1: Ejecutando scraping...
✅ Scraping completado exitosamente
📝 PASO 2: Generando archivos Markdown...
✅ Generación de archivos completada
🔍 PASO 3: Analizando cambios...
📊 Productos procesados: 45
🆕 Productos nuevos: 2
🔄 Productos actualizados: 3
🚀 PASO 4: Iniciando rebuild del sitio...
✅ Build iniciado correctamente
🎯 Proceso diario completado: Actualización exitosa
```

## 🚨 Troubleshooting común

### Error: "Function timeout"
- **Causa**: El scraping tarda más de 10 minutos
- **Solución**: Optimizar selectores en `scraper.js`

### Error: "Build hook failed"
- **Causa**: URL del build hook incorrecta
- **Solución**: Verificar `NETLIFY_BUILD_HOOK` en variables de entorno

### Error: "Token inválido"
- **Causa**: Token no configurado o incorrecto
- **Solución**: Verificar `NETLIFY_FUNCTION_TOKEN` en variables de entorno

### Build no se ejecuta automáticamente
- **Causa**: Función programada deshabilitada
- **Solución**: Verificar en Netlify → Functions → Scheduled functions

## 📁 Archivos importantes

```
netlify.toml                    # Configuración principal
netlify/functions/
  ├── daily-update.js          # Función principal programada
  ├── update-products.js       # Solo scraping + generación  
  └── trigger-build.js         # Solo build
scraper.js                     # Script de scraping
generate_simple.cjs            # Generador de archivos MD
evergreen_products.json        # Datos de productos (generado)
test-setup.sh                  # Script de verificación
test-functions.cjs             # Test de funciones
NETLIFY_SETUP.md              # Documentación completa
```

## 🔄 Flujo de trabajo completo

1. **6:00 AM UTC diariamente**: Se ejecuta `daily-update`
2. **Scraping**: Extrae productos de EverGreen Life
3. **Análisis**: Compara con datos anteriores
4. **Generación**: Crea archivos Markdown nuevos/actualizados
5. **Build**: Si hay cambios, inicia rebuild del sitio
6. **Deploy**: Netlify publica la nueva versión automáticamente

## ✅ Checklist de verificación

- [ ] Proyecto desplegado en Netlify
- [ ] Variables `NETLIFY_FUNCTION_TOKEN` y `NETLIFY_BUILD_HOOK` configuradas
- [ ] Primera prueba manual exitosa con curl
- [ ] Función programada activada
- [ ] Logs de primera ejecución automática verificados
- [ ] Productos aparecen correctamente en el sitio
