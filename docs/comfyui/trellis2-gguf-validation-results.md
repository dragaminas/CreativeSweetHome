# Resultados de Validacion Trellis2 GGUF en ComfyUI

Este documento implementa la salida canonica de las tareas `11.6` a `11.9` y
el cierre operativo de `11.12` del `DevPlan`. Mantiene el corte tecnico
as-built `2026-04-25` y el corte de producto/codigo `2026-05-03`.

## Estado

- estado: `done_phase_closeout`
- decision de corte: `trellis2_gguf_q4_ruta_activa_cerrada`
- fecha de corte tecnico: `2026-04-26`
- fecha de corte operativo: `2026-05-03`
- actualizacion de alcance: `2026-05-03` fija `Trellis2 GGUF` como ruta 3D
  vigente del repo; `Hunyuan3D` queda solo como referencia historica
- objetivo comparativo: archivado; ya no bloquea la ruta activa
- e2e minimo API: `success`
- e2e Q4 texturizado API: `success`

## Lectura correcta del resultado

Este corte demuestra estas cosas concretas:

- el runtime aislado `~/ComfyUI-trellis2-lab` existe
- `ComfyUI-Trellis2` y `ComfyUI-GGUF` estan presentes
- el set minimo `512/Q4_K_M` esta descargado
- el layout ejecutable esperado por `Trellis2LoadModel` esta preparado con
  symlinks hacia los modelos descargados
- el laboratorio arranca y carga los custom nodes sin errores de importacion
- el gate ya distingue modelos descargados de layout ejecutable por workflow
- el workflow minimo por API completo `image -> Trellis2 -> glb` ya genera un
  `.glb` con `backend=sdpa`, `conv_backend=spconv` y `o_voxel` compatible
  `sm_86`
- el workflow Q4 texturizado por API genera un GLB con `PBRMaterial`, UVs y
  texturas embebidas usando `Trellis2TexSlatGenerator` y
  `Trellis2OvoxelExportToGLB`
- el repo publica ya un workflow local versionado
  `ComfyUIWorkflows/local/minimum/uc-3d-02-image-to-asset-trellis2-gguf-q4-v1.json`
  como baseline activo de `UC-3D-02`
- `UC-3D-01`, `UC-3D-03` y `UC-3D-04` se leen ahora como staging o
  reutilizacion por activo del mismo modelador 3D, en vez de reabrir
  `Hunyuan3D` como baseline

Este cierre no reabre como blockers:

- una comparativa formal adicional contra `SF3D` y `Hunyuan3D-2mini-Turbo`
- una segunda promocion de producto basada en `Hunyuan3D`
- crear otra familia de workflows 3D cuando el modelador activo ya es
  `Trellis2 GGUF`

Este cierre tampoco inventa evidencia nueva:

- no añade una importacion nueva en `Blender`; conserva el handoff canonico ya
  existente para `glb`
- no reemplaza la evidencia tecnica `2026-04-25`; la consolida y la usa para
  el corte operativo definitivo

## Que se ejecuto de verdad

Comando ejecutado:

```bash
bash scripts/apps/comfyui-trellis2-gguf-validation.sh
```

Resultado del preflight:

- `status=pass_preflight`
- `run_dir=/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260425T135058Z`

Revalidacion de cierre `11.12` ejecutada el `2026-05-03`:

- `status=pass_preflight`
- `run_dir=/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260503T121426Z`
- `summary=/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260503T121426Z/reports/trellis2_gguf_validation_summary.txt`

Prueba e2e minima por API:

- `prompt_id=88fb4164-deb6-461c-a79f-b3e6a3022241`
- `status=success`
- `tiempo=289.63s`
- `output=/home/eric/ComfyUI-trellis2-lab/output/openclaw/e2e_trellis_spconv_min_00001_.glb`
- `tamano=206133424 bytes`

Prueba e2e Q4 texturizada por API:

- `prompt_id=c2afb541-3890-4df0-9029-ad7c92d5530b`
- `status=success`
- `tiempo=108.72s`
- `output=/home/eric/ComfyUI-trellis2-lab/output/openclaw/e2e_trellis_gguf_q4_textured_ovoxel_00001_.glb`
- `tamano=10035316 bytes`
- `visual=TextureVisuals`
- `material=PBRMaterial`
- `baseColorTexture=1024x1024 RGBA`
- `metallicRoughnessTexture=1024x1024 RGB`
- `uv=(147695, 2)`

Runtime detectado en esta maquina durante el corte:

- `python=3.12.3`
- `comfyui_python=3.12.3`
- `torch=2.9.1+cu128`
- `gpu=NVIDIA GeForce RTX 3090, driver 580.126.09, 24576 MiB`

## Bloqueos observados

Bloqueos concretos publicados por el script:

- ninguno a nivel de preflight

Ya no bloquea en este corte:

- runtime aislado
- custom nodes `ComfyUI-Trellis2` y `ComfyUI-GGUF`
- set minimo `512/Q4_K_M` (`7/7`)
- layout `models/microsoft/TRELLIS.2-4B` y
  `models/microsoft/TRELLIS-image-large`
- carga DINOv3 con config local `hidden_size=1024`
- ausencia de `flash_attn` para la atencion principal, usando `sdpa`
- `flex_gemm` incompatible con RTX 3090, usando `spconv`
- `o_voxel` sin kernel compatible, usando el wheel Linux `Torch270/cp312`
  que expone `sm_86`
- `nvdiffrast` sin kernel/ABI compatible para rasterizar texturas, compilado
  desde fuente contra `torch=2.9.1+cu128`
- `flex_gemm` sin kernel compatible en el tramo `grid_sample_3d` del export
  texturizado, usando el wheel Linux `Torch270/cp312` que expone `sm_86`

No bloqueante en este corte:

- `ComfyUI` principal no estaba escuchando en `127.0.0.1:8188`
- el laboratorio se probo aparte en `127.0.0.1:8190` y llego a
  `Starting server` con los nodos cargados

## Evidencia producida

Artefactos canonicos generados:

- `/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260425T125859Z/reports/trellis2_gguf_validation_summary.txt`
- `/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260425T125859Z/reports/trellis2_gguf_validation_summary.json`
- `/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260425T125859Z/reports/installed_nodes.txt`
- `/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260425T125859Z/reports/minimum_models_check.txt`
- `/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260425T125859Z/reports/workflow_model_layout_check.txt`
- `/home/eric/Studio/Assets3D/benchmarks/trellis2-gguf/openclaw_object_ref/20260425T135058Z/reports/o_voxel_cuda_check.txt`
- `/home/eric/ComfyUI-trellis2-lab/output/openclaw/e2e_trellis_spconv_min_00001_.glb`
- `/home/eric/ComfyUI-trellis2-lab/output/openclaw/e2e_trellis_gguf_q4_remap_00001_.glb`
- `/home/eric/ComfyUI-trellis2-lab/output/openclaw/e2e_trellis_gguf_q4_textured_ovoxel_00001_.glb`

Contexto de baseline ya existente para comparacion futura:

- outputs `SF3D` detectados en `ComfyUI/output/openclaw/uc-3d-01/` y `ComfyUI/output/openclaw/uc-3d-02/`
- output `Hunyuan3D` detectado como `mesh_shape_v2mini.glb` en
  `ComfyUI/output/openclaw/uc-3d-02/`

## Tabla de cierre por tarea

| Tarea | Estado de corte | Lectura |
| --- | --- | --- |
| `11.2` entorno aislado | `done` | existe `~/ComfyUI-trellis2-lab` y arranca en puerto de laboratorio |
| `11.3` auditoria de dependencias | `done` | checklist y reporte reproducible de nodos/runtime/modelos |
| `11.4` descarga set minimo | `done` | set minimo presente (`7/7`) en `models/trellis2_gguf_minimum/` |
| `11.5` workflow minimo `UC-3D-02` | `done` | workflow Q4 texturizado comprobado por API y GLB con PBRMaterial |
| `11.6` comparativa local | `archived` | absorbida por la decision de producto ya tomada a favor de Trellis |
| `11.7` import Blender y metrica mesh | `archived` | el handoff a `Blender` sigue siendo contrato activo, pero no bloquea el cierre de fase |
| `11.8` comparativa visual honesta | `archived` | absorbida por el corte operativo y por la evidencia cualitativa ya aceptada |
| `11.9` decision go/no-go | `archived` | sustituida por el corte definitivo `trellis2_gguf_q4_ruta_activa_cerrada` |
| `11.12` cierre de fase y corte de catalogo | `done` | el catalogo y la biblioteca local ya apuntan a `Trellis2 GGUF` como modelador 3D vigente |

## Decision consolidada de este corte

Decision: **`trellis2_gguf_q4_ruta_activa_cerrada`**

Motivo:

- el usuario confirma que Trellis es claramente superior a los candidatos
  previos probados
- ya existe un GLB Q4 texturizado con material PBR, texturas y UVs
- el repo ya no trata `Hunyuan3D` ni `SF3D` como baseline activo
- el catalogo de flujos y la biblioteca `openclaw-workflows` ya quedan
  alineados con el modelador 3D correcto

Implicacion operativa:

- Trellis2 GGUF Q4 pasa a ruta 3D vigente del repo
- `Hunyuan3D` queda solo como referencia historica fuera del alcance activo
- `SF3D` queda como benchmark historico
- `UC-3D-*` deja de publicitar rutas activas apoyadas en `Hunyuan3D`

## Lectura final

La fase 11 deja una linea 3D activa util y cerrable sin crear un runner nuevo:
el modelador vigente es `Trellis2 GGUF` dentro del runtime `ComfyUI` aislado,
con instalacion y preflight reutilizables, workflow local versionado y handoff
canonico a `Blender`.
