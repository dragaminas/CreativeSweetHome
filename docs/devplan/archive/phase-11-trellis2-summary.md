# Phase 11 Summary

## Purpose

Cerrar la reapertura 3D en `ComfyUI` dejando `Trellis2 GGUF` como modelador
3D vigente del repo, con runtime aislado, preflight reutilizable y workflow
local versionado.

## Final Status

`done`

La fase queda cerrada con corte operativo `2026-05-03`.

## Stable Artifacts

- [`../../comfyui/trellis2-gguf-interface.md`](../../comfyui/trellis2-gguf-interface.md)
- [`../../comfyui/trellis2-gguf-validation-results.md`](../../comfyui/trellis2-gguf-validation-results.md)
- [`../../../scripts/apps/install-trellis2-gguf.sh`](../../../scripts/apps/install-trellis2-gguf.sh)
- [`../../../scripts/apps/comfyui-trellis2-gguf-prepare-layout.sh`](../../../scripts/apps/comfyui-trellis2-gguf-prepare-layout.sh)
- [`../../../scripts/apps/comfyui-trellis2-gguf-validation.sh`](../../../scripts/apps/comfyui-trellis2-gguf-validation.sh)
- [`../../../ComfyUIWorkflows/local/minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json`](../../../ComfyUIWorkflows/local/minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json)

## Important Decisions

- `Trellis2 GGUF Q4` es la ruta 3D activa del repo
- `UC-3D-02` define el baseline local `image -> asset 3D`
- `UC-3D-01`, `UC-3D-03` y `UC-3D-04` reutilizan ese mismo modelador por
  staging, crop o activo en vez de abrir rutas 3D paralelas
- `Hunyuan3D` y `SF3D` quedan retenidos solo como referencias historicas
- el handoff a `Blender` sigue siendo la etapa normal de producto; no se crea
  un runner 3D nuevo separado de `ComfyUI`

## Reusable Infrastructure Produced

- runtime aislado `~/ComfyUI-trellis2-lab`
- instalador `install-trellis2-gguf.sh`
- `prepare-layout` y preflight reutilizables
- baseline local versionado para `openclaw-workflows`
- evidencia canonica consolidada en un unico documento de resultados

## Known Historical Notes

- la comparativa formal con `SF3D` y `Hunyuan3D` ya no bloquea producto
- el runner `hunyuan3d` permanece solo como legado tecnico
- la linea `SF3D` se conserva en fase 9 como benchmark historico
