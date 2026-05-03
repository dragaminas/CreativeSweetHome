# Mapa de Casos de Uso 3D

Este documento implementa la tarea `9.8` del `DevPlan`.
Conecta los `UC-3D-*` con alias, workflows, presets y lectura de producto.

## Mapa principal

| ID | Alias | Entrada | Entrega preferida | Workflow V1 | Preset |
| --- | --- | --- | --- | --- | --- |
| `UC-3D-01` | `texto-a-3d` | texto | `asset` aislado | `ComfyUIWorkflows/local/minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json` despues de imagen semilla staged | reutiliza baseline `UC-3D-02` |
| `UC-3D-02` | `imagen-a-3d` | imagen | `asset` aislado | `ComfyUIWorkflows/local/minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json` | `uc-3d-02-image-to-asset-trellis2-gguf-q4` |
| `UC-3D-03` | `texto-a-escena-3d` | texto | `set`, `blockout` o `envolvente` | `ComfyUIWorkflows/local/minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json` por activo o shell | reutiliza baseline `UC-3D-02` |
| `UC-3D-04` | `imagen-a-escena-3d` | imagen | `set`, `blockout` o `envolvente` | `ComfyUIWorkflows/local/minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json` por crop, activo o envolvente | reutiliza baseline `UC-3D-02` |

## Variantes destacadas

La linea activa reutiliza un mismo bloque `Trellis2 GGUF Q4`:

- `UC-3D-01` lo usa despues de generar una imagen semilla
- `UC-3D-02` lo usa de forma directa sobre la imagen del objeto
- `UC-3D-03` y `UC-3D-04` lo reutilizan por pieza, crop o envolvente

## Reglas de routing

- si el input ya es una imagen de objeto o personaje, priorizar `UC-3D-02`
- si el usuario pide una escena pero en realidad quiere piezas separadas,
  redirigir a `UC-3D-04`
- si el caso es `texto`, la `V1` debe tratarlo como puente a imagen semilla
- si la referencia visual es demasiado ambiciosa para una escena completa,
  la salida correcta es `asset_set`, `envolvente` o `blockout`

## Relacion con Blender

Todos los casos `UC-3D-*` deben leer `Blender` como etapa normal de producto:

- inspeccion
- cleanup
- escala
- pivot
- catalogacion
- composicion

## Estado de madurez

Con corte `2026-05-03`:

- los casos `UC-3D-*` ya quedan modelados en el catalogo Python
- el baseline activo del repo apunta a `Trellis2 GGUF` dentro de `ComfyUI`
- `SF3D` y `Hunyuan3D` quedan como referencia historica
- el workflow local activo reutilizable es `uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json`
