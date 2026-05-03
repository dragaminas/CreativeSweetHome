# Workflows Derivados Locales

Este directorio implementa la tarea `8.11` del `DevPlan`.
Contiene variantes versionadas para producto sin sobrescribir los JSON
originales descargados.

## Regla de trazabilidad

Cada JSON derivado incluye metadatos en `extra.openclaw` con:

- `derived_from`
- `use_case_id`
- `hardware_profile`
- `role`

## Inventario actual

| Archivo | Procedencia | Rol |
| --- | --- | --- |
| `minimum/uc-img-02-z-image-turbo-cn-rtx3060-v1.json` | `260303_MICKMUMPITZ_Z-IMAGE_TURBO_CN_1-1.json` | baseline candidato para `UC-IMG-02` |
| `minimum/uc-img-03-z-image-style-exploration-rtx3060-v1.json` | `260303_MICKMUMPITZ_Z-IMAGE_TURBO_CN_1-1.json` | exploracion de estilo para `UC-IMG-03` |
| `minimum/uc-vid-01-ai-renderer-preprocess-rtx3060-v1.json` | `260225_MICKMUMPITZ_AI-RENDERER-PREPROCESS_1-0.json` | preprocess baseline con adaptacion a `DepthAnything_V2` |
| `minimum/uc-vid-02-ai-renderer-video-rtx3060-v1.json` | `260225_MICKMUMPITZ_AI-RENDERER_SMPL_2-0.json` | render de video baseline candidato |
| `maximum/uc-vid-02-ai-renderer-video-high-vram-reference-v1.json` | `260225_MICKMUMPITZ_AI-RENDERER_SMPL_2-0_Runpod.json` | referencia de alto VRAM |
| `adaptable/uc-img-01-text-to-image-z-image-template-v1.json` | `Text to Image (Z-Image-Turbo).json` | semilla template para `UC-IMG-01` |
| `adaptable/uc-vid-03-image-to-video-wan22-template-v1.json` | `Image to Video (Wan 2.2).json` | semilla template para `UC-VID-03` |
| `adaptable/uc-vid-04-video-upscale-ganx4-template-v1.json` | `Video Upscale(GAN x4).json` | referencia simple para `UC-VID-04` |
| `minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json` | `ComfyUIWorkflows/Trellis2_High_Quality_GGUF.json` | baseline activo `image -> asset 3D` con `Trellis2 GGUF Q4`, reutilizado por `UC-3D-*` |

## Archivo historico

Las variantes previas de `SF3D`, `Hunyuan 3D` y `PartCrafter` se conservan
solo como anexo historico de validacion tecnica. No forman parte del baseline
vigente del producto ni deben publicarse como workflows activos del `MVP`.

Referencias historicas en este arbol:

- `adaptable/uc-3d-01-text-to-asset-sf3d-bridge-v1.json`
- `minimum/uc-3d-02-image-to-asset-sf3d-single-image-v1.json`
- `adaptable/uc-3d-03-text-to-scene-sf3d-asset-pack-bridge-v1.json`
- `adaptable/uc-3d-04-image-to-scene-sf3d-asset-pack-v1.json`
- `historical/hunyuan-3d-validacion-de-hipotesis/`

## Que se ha normalizado aqui

- nombres de entrada y salida mas previsibles
- rutas de asset mas alineadas con el entorno local
- metadatos de procedencia
- versionado propio sin tocar la biblioteca original

## Que no debe hacerse

- editar directamente los JSON originales de `ComfyUIWorkflows/`
- declarar operativa una variante solo por existir este archivo
- borrar la referencia al workflow base del que nacio
