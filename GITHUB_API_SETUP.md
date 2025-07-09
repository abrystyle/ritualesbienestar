# 🔧 Configuración GitHub API - Opción 1

Esta documentación explica cómo configurar la **Opción 1: GitHub API** para automatizar actualizaciones de productos usando commits directos al repositorio.

## 📋 Configuración Requerida

### 1. Crear Personal Access Token en GitHub

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Clic en "Generate new token (classic)"
3. Configura los permisos requeridos:
   - ✅ `repo` (acceso completo a repositorios)
   - ✅ `contents` (leer/escribir contenido del repositorio)
   - ✅ `metadata` (acceso a metadatos del repositorio)
4. Copia el token generado (aparece solo una vez)

### 2. Configurar Variables de Entorno

#### En desarrollo local (`.env`):
```bash
# GitHub API Configuration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=tu-usuario-github
GITHUB_REPO=square-saturn

# Existing variables
NETLIFY_FUNCTION_TOKEN=evergreen_cd11ecdb80db8557d6f57ebb4a389a6d
NETLIFY_BUILD_HOOK=https://api.netlify.com/build_hooks/686e4b99d60224a87a8979e7
```

#### En Netlify (Production):
1. Ve a tu sitio en Netlify Dashboard
2. Site settings → Environment variables
3. Añadir las siguientes variables:
   - `GITHUB_TOKEN`: Tu personal access token
   - `GITHUB_OWNER`: Tu usuario de GitHub
   - `GITHUB_REPO`: `square-saturn`

## 🔄 Cómo Funciona

### Flujo de Trabajo Completo:

1. **Scraping en Memoria** 
   - Extrae productos de https://www.evergreenlife.it/es_es/shop.html
   - Procesa datos sin escribir archivos locales

2. **Generación en Memoria**
   - Crea archivos Markdown para cada producto
   - Mantiene todo en memoria (no archivos temporales)

3. **Commit a GitHub**
   - Obtiene la referencia actual de la rama `main`
   - Crea blobs para `evergreen_products.json` y archivos `.md`
   - Hace commit de todos los cambios de una vez
   - Actualiza la referencia de la rama

4. **Trigger Automático**
   - Si detecta cambios de stock críticos
   - Triggea build automático de Netlify
   - El build deployará los cambios automáticamente

### Archivos Gestionados:

- `evergreen_products.json` - Datos raw de productos
- `evergreen_products_backup.json` - Backup para comparaciones
- `src/content/products/*.md` - Archivos Markdown individuales

## 🧪 Testing

### Prueba Local:
```bash
# Instalar dependencias si es necesario
npm install

# Ejecutar prueba
node test-github-update.js
```

### Prueba en Production:
```bash
# Triggear función manualmente
curl -X POST "https://tu-sitio.netlify.app/.netlify/functions/update-products" \
  -H "x-netlify-token: evergreen_cd11ecdb80db8557d6f57ebb4a389a6d"
```

## 📅 Automatización

### Opción A: Netlify Scheduled Functions
```javascript
// netlify/functions/daily-update.js ya configurada
// Se ejecuta automáticamente cada día
```

### Opción B: GitHub Actions (alternativa)
```yaml
# .github/workflows/update-products.yml
name: Update Products
on:
  schedule:
    - cron: '0 8 * * *'  # Cada día a las 8:00 AM UTC
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Netlify Function
        run: |
          curl -X POST "${{ secrets.NETLIFY_FUNCTION_URL }}" \
            -H "x-netlify-token: ${{ secrets.NETLIFY_FUNCTION_TOKEN }}"
```

## 🔒 Seguridad

### Buenas Prácticas:

1. **Nunca** subas tokens a Git
2. Usa variables de entorno para todos los secretos
3. El token GitHub debe tener permisos mínimos necesarios
4. Revisa logs regularmente para detectar fallos

### Rotación de Tokens:

1. Genera nuevo Personal Access Token cada 90 días
2. Actualiza variable en Netlify
3. Prueba funcionamiento

## 🚨 Troubleshooting

### Error: "GITHUB_TOKEN no configurado"
- Verifica que la variable esté en Netlify Environment Variables
- El token debe empezar con `ghp_` (classic) o `github_pat_` (fine-grained)

### Error: "GitHub API error 403"
- Token expirado o sin permisos
- Verifica permisos del token en GitHub

### Error: "GitHub API error 404"
- Repository no encontrado
- Verifica `GITHUB_OWNER` y `GITHUB_REPO`

### Commits no aparecen
- Verifica que la función termine exitosamente
- Revisa logs de Netlify Functions
- Confirma que el token tenga permisos de `contents`

## 📊 Monitoreo

### Logs Disponibles:

1. **Netlify Function Logs**: Dashboard → Functions → update-products
2. **GitHub Commits**: Repository → Commits (buscar mensajes automáticos)
3. **Netlify Build Logs**: Dashboard → Deploys

### Métricas a Revistar:

- Frecuencia de actualizaciones exitosas
- Número de productos procesados
- Tiempo de ejecución de functions
- Fallos de scraping/commits

## ✅ Validación Final

Una vez configurado todo:

1. ✅ Variables de entorno configuradas en Netlify
2. ✅ Token GitHub con permisos correctos
3. ✅ Función ejecuta sin errores (`test-github-update.js`)
4. ✅ Commits aparecen en GitHub
5. ✅ Builds se triggean automáticamente
6. ✅ Site se actualiza con nueva data

---

**🎉 ¡Listo!** Tu sistema de actualización automática está funcionando con GitHub API.
