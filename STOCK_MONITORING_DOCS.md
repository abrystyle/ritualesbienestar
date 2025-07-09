# 📦 SISTEMA DE MONITOREO DE STOCK - EVERGREEN LIFE

## 🎯 Resumen de Implementación

El sistema ahora incluye **monitoreo completo de cambios de stock** que detecta automáticamente modificaciones en:

- ✅ **Campo `availability`** (stock/disponibilidad)
- ✅ **Cambios de precio** (`price`)
- ✅ **Modificaciones de tags** (`tags`)
- ✅ **Actualizaciones de imagen** (`image`)
- ✅ **Cambios en descripción** (`description`)

## 🔧 Funciones Implementadas

### 1. **`stock-monitor.js`** - Monitor Específico de Stock
**Endpoint:** `/api/stock`

**Características:**
- Detecta cambios específicos en `availability`
- Categoriza productos como "recién disponibles" o "recién agotados"
- Trigger automático de rebuild en cambios críticos
- Backup automático para comparaciones futuras
- Logging detallado de todos los cambios

**Respuesta típica:**
```json
{
  "timestamp": "2025-07-09T...",
  "stockChangesDetected": 2,
  "newlyAvailable": 1,
  "newlyUnavailable": 1,
  "changes": [
    {
      "name": "OLife® Producto X",
      "sku": "SKU123",
      "previousStock": "No está disponible",
      "currentStock": null,
      "price": "29,99 €"
    }
  ],
  "summary": {
    "shouldTriggerUpdate": true,
    "criticalChanges": true
  }
}
```

### 2. **`update-products.js`** - Actualización con Monitoreo
**Endpoint:** `/api/products`

**Mejoras implementadas:**
- Comparación automática con backup anterior
- Detección de cambios en stock y precios
- Trigger automático de rebuild si hay cambios críticos
- Backup automático después de cada actualización
- Logging detallado de productos modificados

### 3. **`daily-update.js`** - Proceso Diario Mejorado
**Endpoint:** `/api/daily`

**Nuevas características:**
- Análisis completo de cambios incluyendo stock
- Logging detallado por tipo de cambio
- Estadísticas mejoradas en el resumen final
- Trigger condicional basado en tipos de cambios

## 🔄 Lógica de Detección de Cambios

### Estados de Stock Reconocidos:
- `null` o `undefined` = **Disponible**
- `"No está disponible"` = **Agotado**
- Cualquier otro string = **Estado específico**

### Cambios Críticos que Triggean Rebuild:
1. **Productos que vuelven a estar disponibles** (`"No está disponible"` → `null`)
2. **Productos que se agotan** (`null` → `"No está disponible"`)
3. **Cambios de precio significativos**
4. **Productos completamente nuevos**

## 📋 Endpoints Disponibles

| Endpoint | Función | Propósito |
|----------|---------|-----------|
| `/api/stock` | stock-monitor.js | Monitor específico de stock |
| `/api/products` | update-products.js | Actualización completa con monitoreo |
| `/api/daily` | daily-update.js | Proceso diario automatizado |
| `/api/build` | trigger-build.js | Trigger manual de rebuild |

## 🔧 Configuración Requerida en Netlify

### Variables de Entorno:
```
NETLIFY_FUNCTION_TOKEN=tu_token_secreto_aqui
NETLIFY_BUILD_HOOK=https://api.netlify.com/build_hooks/tu_hook_id
NODE_VERSION=18
```

### netlify.toml Actualizado:
```toml
[build]
  command = "pnpm build"
  functions = "netlify/functions"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/stock"
  to = "/.netlify/functions/stock-monitor"
  status = 200
  
# ... otros redirects existentes
```

## 🧪 Testing y Validación

### Scripts de Test Incluidos:
- `test-simple-stock.cjs` - Test básico de detección
- `test-stock-monitoring.cjs` - Test completo del sistema
- `netlify-diagnostic.cjs` - Diagnóstico general

### Ejecutar Tests:
```bash
node test-simple-stock.cjs
node netlify-diagnostic.cjs
```

## 📊 Ejemplo de Flujo Completo

1. **Scraping automático** detecta cambios en productos
2. **Sistema compara** con backup anterior
3. **Identifica cambios** en stock, precios, etc.
4. **Logs detallados** de qué cambió exactamente
5. **Trigger automático** de rebuild si hay cambios críticos
6. **Backup actualizado** para próxima comparación

## 🚨 Escenarios de Trigger Automático

### ✅ SÍ triggea rebuild:
- Producto agotado vuelve a estar disponible
- Producto disponible se agota
- Cambio significativo de precio
- Nuevos productos agregados

### ❌ NO triggea rebuild:
- Solo cambios menores en descripción
- Modificaciones de imagen únicamente
- Cambios de tags sin impacto en stock/precio

## 🔍 Monitoreo y Logs

### En los logs de Netlify verás:
```
📦 Iniciando monitoreo de cambios de stock...
📊 Análisis completado: 2 cambios de stock detectados
✅ Productos ahora disponibles: OLife® Producto X
❌ Productos ahora agotados: OLife® Producto Y
🚀 Cambios críticos detectados, iniciando rebuild...
✅ Rebuild iniciado por cambios de stock
```

## 🎉 Resultado Final

El sistema ahora es **completamente automático** y **sensible a cambios de stock**, asegurando que:

1. **Los cambios de availability se detectan inmediatamente**
2. **Los rebuilds se triggean automáticamente cuando es necesario**
3. **Hay logging completo para debugging**
4. **Se mantiene backup para comparaciones futuras**
5. **Todo está integrado en el flujo existente de Netlify**

¡El proveedor ya no debería tener problemas con el parsing del TOML, y el sistema monitoreará automáticamente todos los cambios de stock! 🚀
