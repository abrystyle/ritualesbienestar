# Configuración de Automatización con Netlify

Este proyecto está configurado para automatizar el proceso de scraping, generación de contenido y rebuild del sitio usando Netlify Functions.

## 🚀 Funciones Disponibles

### 1. Actualización de Productos (`/api/products`)
- **Función**: `netlify/functions/update-products.js`
- **Propósito**: Ejecuta scraping y generación de archivos Markdown
- **Método**: POST
- **Autorización**: Token requerido

### 2. Trigger de Build (`/api/build`)
- **Función**: `netlify/functions/trigger-build.js`
- **Propósito**: Inicia un rebuild del sitio
- **Método**: POST
- **Autorización**: Token requerido

### 3. Actualización Diaria (`/api/daily`)
- **Función**: `netlify/functions/daily-update.js`
- **Propósito**: Proceso completo automatizado
- **Programación**: Diariamente a las 6:00 AM UTC
- **Autorización**: Token requerido

## ⚙️ Variables de Entorno Requeridas

Configura estas variables en tu panel de Netlify:

```bash
# Token de seguridad para las funciones
NETLIFY_FUNCTION_TOKEN=tu_token_secreto_aqui

# URL del Build Hook de Netlify
NETLIFY_BUILD_HOOK=https://api.netlify.com/build_hooks/XXXXX
```

### Cómo obtener el Build Hook:
1. Ve a tu proyecto en Netlify
2. Site settings → Build & deploy
3. Build hooks → Add build hook
4. Nombra el hook (ej: "daily-products-update")
5. Copia la URL generada

## 🔧 Configuración Inicial

### 1. En Netlify Dashboard

1. **Variables de entorno**:
   ```
   Site Settings → Environment variables → Add variable
   ```

2. **Verificar configuración de build**:
   ```
   Build command: pnpm build
   Publish directory: dist
   Functions directory: netlify/functions
   ```

### 2. Verificar archivos locales

Asegúrate de que tienes estos archivos:
- ✅ `netlify.toml` - Configuración principal
- ✅ `netlify/functions/update-products.js` - Función de actualización
- ✅ `netlify/functions/trigger-build.js` - Función de build
- ✅ `netlify/functions/daily-update.js` - Función programada
- ✅ `scraper.js` - Script de scraping
- ✅ `generate_simple.cjs` - Generador de archivos

## 🛠️ Uso Manual

### Actualizar productos manualmente:
```bash
curl -X POST "https://tu-sitio.netlify.app/api/products" \
  -H "x-netlify-token: tu_token_secreto"
```

### Triggear build manualmente:
```bash
curl -X POST "https://tu-sitio.netlify.app/api/build" \
  -H "x-netlify-token: tu_token_secreto"
```

### Ejecutar proceso completo:
```bash
curl -X POST "https://tu-sitio.netlify.app/api/daily" \
  -H "x-netlify-token: tu_token_secreto"
```

## 📅 Programación Automática

La función `daily-update` está configurada para ejecutarse automáticamente:
- **Horario**: 6:00 AM UTC (8:00 AM España en invierno, 7:00 AM en verano)
- **Frecuencia**: Diaria
- **Proceso**:
  1. Ejecuta scraping de productos
  2. Genera archivos Markdown
  3. Detecta cambios
  4. Triggerea rebuild si hay cambios

## 🔍 Monitoreo

### Logs de las funciones:
1. Ve a tu sitio en Netlify
2. Functions → [nombre de la función]
3. Ver logs de ejecución

### Verificar ejecución programada:
- Los logs aparecerán en la función `daily-update`
- También puedes ver el historial en la sección "Functions"

## 📊 Respuestas de las API

### Éxito:
```json
{
  "success": true,
  "timestamp": "2024-01-15T06:00:00.000Z",
  "duration": "45s",
  "message": "Actualización exitosa: 2 nuevos, 3 actualizados, 45 total"
}
```

### Error:
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-15T06:00:00.000Z"
}
```

## 🔒 Seguridad

- Todas las funciones requieren token de autorización
- Headers de seguridad configurados en `netlify.toml`
- Timeouts configurados para evitar ejecuciones largas
- Logs controlados para no exponer información sensible

## 🚨 Troubleshooting

### Error común: "Token de autorización inválido"
- Verifica que `NETLIFY_FUNCTION_TOKEN` esté configurado
- Asegúrate de enviar el token en el header `x-netlify-token`

### Error: "NETLIFY_BUILD_HOOK no configurado"
- Crea un build hook en Netlify
- Configura la variable `NETLIFY_BUILD_HOOK`

### Build no se ejecuta automáticamente:
- Verifica que la programación esté activa en Netlify
- Revisa los logs de la función `daily-update`

## 📁 Estructura de Archivos

```
netlify/
├── functions/
│   ├── daily-update.js      # Proceso diario completo
│   ├── trigger-build.js     # Solo rebuild
│   └── update-products.js   # Solo scraping + generación
netlify.toml                 # Configuración principal
scraper.js                   # Script de scraping
generate_simple.cjs          # Generador de archivos MD
evergreen_products.json      # Datos de productos (generado)
src/content/products/        # Archivos MD generados
```

## ✅ Checklist de Despliegue

- [ ] Proyecto desplegado en Netlify
- [ ] Variables de entorno configuradas
- [ ] Build hook creado y configurado
- [ ] Primera ejecución manual exitosa
- [ ] Verificar logs de función programada
- [ ] Comprobar que los productos se actualizan correctamente
