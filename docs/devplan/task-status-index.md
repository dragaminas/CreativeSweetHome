# Task Status Index

Indice canonico de estado por tarea hoja en `docs/devplan/tasks/`.
Se mantiene desde los `task files` y no reemplaza su `## Status` local.

Actualizacion canonica: `python3 scripts/devplan/build-task-status-index.py --write`.

## Summary

- Total task files: `76`
- `archived`: `10`
- `blocked`: `1`
- `done`: `28`
- `pending`: `37`

## Tasks

| Task | Phase | Status | File |
| --- | --- | --- | --- |
| `1.2` Hardening del usuario runtime | `1` Hardening del sistema anfitrion | `pending` | [docs/devplan/tasks/1.2-runtime-user-hardening.md](docs/devplan/tasks/1.2-runtime-user-hardening.md) |
| `8.18` Resultados de validacion atomica y compuesta de ComfyUI | `8` Productizacion de workflows ComfyUI para imagen y video | `done` | [docs/devplan/tasks/8.18-comfyui-atomic-composed-validation-results.md](docs/devplan/tasks/8.18-comfyui-atomic-composed-validation-results.md) |
| `9.11.3` Resultados de validacion real de escenas SF3D | `9` MVP 3D en ComfyUI con SF3D y composicion posterior en Blender | `blocked` | [docs/devplan/tasks/9.11.3-scene-validation-results.md](docs/devplan/tasks/9.11.3-scene-validation-results.md) |
| `11.6` Comparativa local de Trellis2 con fixture historico e imagen creativa | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.6-trellis2-comparative-run.md](docs/devplan/tasks/11.6-trellis2-comparative-run.md) |
| `11.7` Import Blender y metricas de outputs Trellis2 | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.7-trellis2-blender-import-metrics.md](docs/devplan/tasks/11.7-trellis2-blender-import-metrics.md) |
| `11.8` Comparativa visual formal entre SF3D, Hunyuan3D y Trellis2 | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.8-trellis2-visual-comparison.md](docs/devplan/tasks/11.8-trellis2-visual-comparison.md) |
| `11.9` Decision go/no-go de Trellis2 GGUF | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.9-trellis2-go-no-go-decision.md](docs/devplan/tasks/11.9-trellis2-go-no-go-decision.md) |
| `11.10.4` Documentacion de instalacion de Trellis2 GGUF | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.10.4-trellis2-installation-docs.md](docs/devplan/tasks/11.10.4-trellis2-installation-docs.md) |
| `11.11.1` Gate minimo de calidad para Trellis2 | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.11.1-trellis2-quality-gate.md](docs/devplan/tasks/11.11.1-trellis2-quality-gate.md) |
| `11.11.2` Gate operativo minimo para Trellis2 | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.11.2-trellis2-operational-gate.md](docs/devplan/tasks/11.11.2-trellis2-operational-gate.md) |
| `11.11.3` Alineacion de Trellis2 como default operativo | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.11.3-trellis2-default-promotion.md](docs/devplan/tasks/11.11.3-trellis2-default-promotion.md) |
| `11.11.4` Fallback automatico de Trellis2 a Hunyuan3D | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.11.4-trellis2-hunyuan-fallback.md](docs/devplan/tasks/11.11.4-trellis2-hunyuan-fallback.md) |
| `11.11.5` Rollback explicito de Trellis2 a Hunyuan3D | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `archived` | [docs/devplan/tasks/11.11.5-trellis2-rollback.md](docs/devplan/tasks/11.11.5-trellis2-rollback.md) |
| `11.12` Cierre de fase 11 y corte Trellis2 como modelador 3D vigente | `11` Reapertura 3D en ComfyUI con Trellis2 GGUF | `done` | [docs/devplan/tasks/11.12-trellis2-phase-closeout.md](docs/devplan/tasks/11.12-trellis2-phase-closeout.md) |
| `12.1` Instalador de Kimodo e integracion al bootstrap | `12` Integracion de Kimodo para diseno de movimiento | `done` | [docs/devplan/tasks/12.1-kimodo-bootstrap-installation.md](docs/devplan/tasks/12.1-kimodo-bootstrap-installation.md) |
| `13.1` Cleanup pre-rigging con Blender e Instant Meshes | `13` Cleanup 3D pre-rigging con Blender e Instant Meshes | `done` | [docs/devplan/tasks/13.1-blender-instant-meshes-pre-rigging-cleanup.md](docs/devplan/tasks/13.1-blender-instant-meshes-pre-rigging-cleanup.md) |
| `13.2` Instalacion de dependencias de Phase 13 | `13` Cleanup 3D pre-rigging con Blender e Instant Meshes | `done` | [docs/devplan/tasks/13.2-phase13-dependency-installation.md](docs/devplan/tasks/13.2-phase13-dependency-installation.md) |
| `13.3` Prueba end-to-end de Phase 13 | `13` Cleanup 3D pre-rigging con Blender e Instant Meshes | `done` | [docs/devplan/tasks/13.3-phase13-e2e-proof.md](docs/devplan/tasks/13.3-phase13-e2e-proof.md) |
| `14.1` Plan de rigging humanoide Linux-first con Blender y Rigify | `14` Rigging humanoide automatizado con Blender y Rigify | `done` | [docs/devplan/tasks/14.1-blender-rigify-humanoid-rigging-plan.md](docs/devplan/tasks/14.1-blender-rigify-humanoid-rigging-plan.md) |
| `14.1.1` Instalacion de dependencias de Phase 14 | `14` Rigging humanoide automatizado con Blender y Rigify | `done` | [docs/devplan/tasks/14.1.1-phase14-dependency-installation.md](docs/devplan/tasks/14.1.1-phase14-dependency-installation.md) |
| `14.1.2` Target canonico `create_rig_humanoid` en runner Blender | `14` Rigging humanoide automatizado con Blender y Rigify | `done` | [docs/devplan/tasks/14.1.2-phase14-create-rig-runner-target.md](docs/devplan/tasks/14.1.2-phase14-create-rig-runner-target.md) |
| `14.2` Prueba end-to-end de Phase 14 | `14` Rigging humanoide automatizado con Blender y Rigify | `done` | [docs/devplan/tasks/14.2-phase14-e2e-proof.md](docs/devplan/tasks/14.2-phase14-e2e-proof.md) |
| `15.1` Shell de producto con SvelteKit y workspaces embebidos | `15` Producto UI web con SvelteKit y workspaces embebidos | `done` | [docs/devplan/tasks/15.1-sveltekit-product-shell-and-embedded-workspaces.md](docs/devplan/tasks/15.1-sveltekit-product-shell-and-embedded-workspaces.md) |
| `15.1.1` Instalacion de dependencias de Phase 15 | `15` Producto UI web con SvelteKit y workspaces embebidos | `done` | [docs/devplan/tasks/15.1.1-phase15-dependency-installation.md](docs/devplan/tasks/15.1.1-phase15-dependency-installation.md) |
| `15.2` Prueba end-to-end de Phase 15 | `15` Producto UI web con SvelteKit y workspaces embebidos | `done` | [docs/devplan/tasks/15.2-phase15-e2e-proof.md](docs/devplan/tasks/15.2-phase15-e2e-proof.md) |
| `16.1` Workspace UI de descripcion de escena | `16` Descripcion de escena en UI | `done` | [docs/devplan/tasks/16.1-ui-scene-description-workspace.md](docs/devplan/tasks/16.1-ui-scene-description-workspace.md) |
| `16.2` Prueba end-to-end de Phase 16 | `16` Descripcion de escena en UI | `done` | [docs/devplan/tasks/16.2-phase16-e2e-proof.md](docs/devplan/tasks/16.2-phase16-e2e-proof.md) |
| `16.3` Contrato UI de navegacion y seams de servicios para maqueta inicial | `16` Descripcion de escena en UI | `done` | [docs/devplan/tasks/16.3-ui-navigation-service-contract-and-mock-seams.md](docs/devplan/tasks/16.3-ui-navigation-service-contract-and-mock-seams.md) |
| `17.1` Scaffolding UI de almacenamiento de escena | `17` Estructura automatizada de almacenamiento de escena | `done` | [docs/devplan/tasks/17.1-ui-scene-storage-scaffolding.md](docs/devplan/tasks/17.1-ui-scene-storage-scaffolding.md) |
| `17.2` Prueba end-to-end de Phase 17 | `17` Estructura automatizada de almacenamiento de escena | `done` | [docs/devplan/tasks/17.2-phase17-e2e-proof.md](docs/devplan/tasks/17.2-phase17-e2e-proof.md) |
| `18.1` Catalogo UI de assets | `18` Catalogacion de assets en UI | `done` | [docs/devplan/tasks/18.1-ui-asset-catalog.md](docs/devplan/tasks/18.1-ui-asset-catalog.md) |
| `18.2` Prueba end-to-end de Phase 18 | `18` Catalogacion de assets en UI | `done` | [docs/devplan/tasks/18.2-phase18-e2e-proof.md](docs/devplan/tasks/18.2-phase18-e2e-proof.md) |
| `19.0` Backend canonico de referencias de assets en ComfyUI | `19` Referencias de assets con ComfyUI encapsulado | `done` | [docs/devplan/tasks/19.0-backend-comfyui-asset-reference-operation.md](docs/devplan/tasks/19.0-backend-comfyui-asset-reference-operation.md) |
| `19.1` Referencias de assets en UI con ComfyUI encapsulado | `19` Referencias de assets con ComfyUI encapsulado | `done` | [docs/devplan/tasks/19.1-ui-asset-reference-images.md](docs/devplan/tasks/19.1-ui-asset-reference-images.md) |
| `19.2` Prueba end-to-end de Phase 19 | `19` Referencias de assets con ComfyUI encapsulado | `done` | [docs/devplan/tasks/19.2-phase19-e2e-proof.md](docs/devplan/tasks/19.2-phase19-e2e-proof.md) |
| `20.0` Backend canonico de asset a 3D | `20` Importacion o modelado 3D de assets en UI | `done` | [docs/devplan/tasks/20.0-backend-asset-3d-operation.md](docs/devplan/tasks/20.0-backend-asset-3d-operation.md) |
| `20.1` Importacion o modelado 3D de assets en UI | `20` Importacion o modelado 3D de assets en UI | `done` | [docs/devplan/tasks/20.1-ui-asset-3d-import-or-modeling.md](docs/devplan/tasks/20.1-ui-asset-3d-import-or-modeling.md) |
| `20.2` Prueba end-to-end de Phase 20 | `20` Importacion o modelado 3D de assets en UI | `done` | [docs/devplan/tasks/20.2-phase20-e2e-proof.md](docs/devplan/tasks/20.2-phase20-e2e-proof.md) |
| `21.1` Integracion UI del cleanup de meshes | `21` Cleanup automatizado de meshes en UI | `done` | [docs/devplan/tasks/21.1-ui-mesh-cleanup-integration.md](docs/devplan/tasks/21.1-ui-mesh-cleanup-integration.md) |
| `21.2` Prueba end-to-end de Phase 21 | `21` Cleanup automatizado de meshes en UI | `done` | [docs/devplan/tasks/21.2-phase21-e2e-proof.md](docs/devplan/tasks/21.2-phase21-e2e-proof.md) |
| `22.1` Integracion UI del rigging automatizado | `22` Rigging automatizado de assets en UI | `pending` | [docs/devplan/tasks/22.1-ui-rigging-integration.md](docs/devplan/tasks/22.1-ui-rigging-integration.md) |
| `22.2` Prueba end-to-end de Phase 22 | `22` Rigging automatizado de assets en UI | `pending` | [docs/devplan/tasks/22.2-phase22-e2e-proof.md](docs/devplan/tasks/22.2-phase22-e2e-proof.md) |
| `23.1` Workspace UI de descripcion de tomas | `23` Descripcion de tomas en UI | `pending` | [docs/devplan/tasks/23.1-ui-shot-description-workspace.md](docs/devplan/tasks/23.1-ui-shot-description-workspace.md) |
| `23.2` Prueba end-to-end de Phase 23 | `23` Descripcion de tomas en UI | `pending` | [docs/devplan/tasks/23.2-phase23-e2e-proof.md](docs/devplan/tasks/23.2-phase23-e2e-proof.md) |
| `24.0` Backend de embed y contexto para Kimodo | `24` Animacion de personajes en Kimodo embebido | `pending` | [docs/devplan/tasks/24.0-backend-kimodo-embedded-context-bridge.md](docs/devplan/tasks/24.0-backend-kimodo-embedded-context-bridge.md) |
| `24.1` Workspace embebido de Kimodo para animacion de tomas | `24` Animacion de personajes en Kimodo embebido | `pending` | [docs/devplan/tasks/24.1-kimodo-embedded-shot-animation-workspace.md](docs/devplan/tasks/24.1-kimodo-embedded-shot-animation-workspace.md) |
| `24.2` Prueba end-to-end de Phase 24 | `24` Animacion de personajes en Kimodo embebido | `pending` | [docs/devplan/tasks/24.2-phase24-e2e-proof.md](docs/devplan/tasks/24.2-phase24-e2e-proof.md) |
| `25.0` Backend canonico de aplicacion de animacion | `25` Aplicacion automatizada de animacion a personajes | `pending` | [docs/devplan/tasks/25.0-backend-animation-apply-bridge.md](docs/devplan/tasks/25.0-backend-animation-apply-bridge.md) |
| `25.1` Aplicacion automatizada de animacion a personajes en UI | `25` Aplicacion automatizada de animacion a personajes | `pending` | [docs/devplan/tasks/25.1-ui-animation-application-to-characters.md](docs/devplan/tasks/25.1-ui-animation-application-to-characters.md) |
| `25.2` Prueba end-to-end de Phase 25 | `25` Aplicacion automatizada de animacion a personajes | `pending` | [docs/devplan/tasks/25.2-phase25-e2e-proof.md](docs/devplan/tasks/25.2-phase25-e2e-proof.md) |
| `26.0` Backend canonico de composicion automatizada en Blender | `26` Composicion automatizada de toma en Blender | `pending` | [docs/devplan/tasks/26.0-backend-blender-shot-composition-operation.md](docs/devplan/tasks/26.0-backend-blender-shot-composition-operation.md) |
| `26.1` Composicion automatizada de toma en Blender desde la UI | `26` Composicion automatizada de toma en Blender | `pending` | [docs/devplan/tasks/26.1-ui-blender-shot-composition.md](docs/devplan/tasks/26.1-ui-blender-shot-composition.md) |
| `26.2` Prueba end-to-end de Phase 26 | `26` Composicion automatizada de toma en Blender | `pending` | [docs/devplan/tasks/26.2-phase26-e2e-proof.md](docs/devplan/tasks/26.2-phase26-e2e-proof.md) |
| `27.0` Backend de sesion y retorno de estado para refine manual en Blender | `27` Refinamiento manual de toma en Blender | `pending` | [docs/devplan/tasks/27.0-backend-blender-refine-session-bridge.md](docs/devplan/tasks/27.0-backend-blender-refine-session-bridge.md) |
| `27.1` Refinamiento manual de toma en Blender asistido por UI | `27` Refinamiento manual de toma en Blender | `pending` | [docs/devplan/tasks/27.1-ui-blender-shot-manual-refinement.md](docs/devplan/tasks/27.1-ui-blender-shot-manual-refinement.md) |
| `27.2` Prueba end-to-end de Phase 27 | `27` Refinamiento manual de toma en Blender | `pending` | [docs/devplan/tasks/27.2-phase27-e2e-proof.md](docs/devplan/tasks/27.2-phase27-e2e-proof.md) |
| `28.0` Backend canonico de export base de video en Blender | `28` Exportacion de videos base de tomas | `pending` | [docs/devplan/tasks/28.0-backend-blender-base-video-export-operation.md](docs/devplan/tasks/28.0-backend-blender-base-video-export-operation.md) |
| `28.1` Exportacion UI de videos base de tomas | `28` Exportacion de videos base de tomas | `pending` | [docs/devplan/tasks/28.1-ui-base-video-export.md](docs/devplan/tasks/28.1-ui-base-video-export.md) |
| `28.1.1` Instalacion de dependencias de Phase 28 | `28` Exportacion de videos base de tomas | `pending` | [docs/devplan/tasks/28.1.1-phase28-dependency-installation.md](docs/devplan/tasks/28.1.1-phase28-dependency-installation.md) |
| `28.2` Prueba end-to-end de Phase 28 | `28` Exportacion de videos base de tomas | `pending` | [docs/devplan/tasks/28.2-phase28-e2e-proof.md](docs/devplan/tasks/28.2-phase28-e2e-proof.md) |
| `29.0` Backend canonico de imagen inicial en ComfyUI | `29` Imagen inicial desde video base y referencias | `pending` | [docs/devplan/tasks/29.0-backend-comfyui-initial-image-operation.md](docs/devplan/tasks/29.0-backend-comfyui-initial-image-operation.md) |
| `29.1` Imagen inicial desde video base y referencias en UI | `29` Imagen inicial desde video base y referencias | `pending` | [docs/devplan/tasks/29.1-ui-initial-image-from-base-video.md](docs/devplan/tasks/29.1-ui-initial-image-from-base-video.md) |
| `29.2` Prueba end-to-end de Phase 29 | `29` Imagen inicial desde video base y referencias | `pending` | [docs/devplan/tasks/29.2-phase29-e2e-proof.md](docs/devplan/tasks/29.2-phase29-e2e-proof.md) |
| `30.0` Backend canonico de generacion de tomas en ComfyUI | `30` Generacion de tomas con ComfyUI como engine | `pending` | [docs/devplan/tasks/30.0-backend-comfyui-shot-generation-operation.md](docs/devplan/tasks/30.0-backend-comfyui-shot-generation-operation.md) |
| `30.1` Generacion de tomas en UI con ComfyUI como engine | `30` Generacion de tomas con ComfyUI como engine | `pending` | [docs/devplan/tasks/30.1-ui-shot-generation-with-comfyui-engine.md](docs/devplan/tasks/30.1-ui-shot-generation-with-comfyui-engine.md) |
| `30.2` Prueba end-to-end de Phase 30 | `30` Generacion de tomas con ComfyUI como engine | `pending` | [docs/devplan/tasks/30.2-phase30-e2e-proof.md](docs/devplan/tasks/30.2-phase30-e2e-proof.md) |
| `31.0` Backend canonico de assembly en DaVinci Resolve | `31` Montaje automatizado de tomas en DaVinci Resolve | `pending` | [docs/devplan/tasks/31.0-backend-davinci-resolve-assembly-bridge.md](docs/devplan/tasks/31.0-backend-davinci-resolve-assembly-bridge.md) |
| `31.1` Montaje automatizado en DaVinci Resolve desde la UI | `31` Montaje automatizado de tomas en DaVinci Resolve | `pending` | [docs/devplan/tasks/31.1-ui-davinci-resolve-automated-assembly.md](docs/devplan/tasks/31.1-ui-davinci-resolve-automated-assembly.md) |
| `31.1.1` Instalacion de dependencias de Phase 31 | `31` Montaje automatizado de tomas en DaVinci Resolve | `pending` | [docs/devplan/tasks/31.1.1-phase31-dependency-installation.md](docs/devplan/tasks/31.1.1-phase31-dependency-installation.md) |
| `31.2` Prueba end-to-end de Phase 31 | `31` Montaje automatizado de tomas en DaVinci Resolve | `pending` | [docs/devplan/tasks/31.2-phase31-e2e-proof.md](docs/devplan/tasks/31.2-phase31-e2e-proof.md) |
| `32.0` Backend de sesion y retorno de estado para refine manual en DaVinci Resolve | `32` Refinamiento manual de escena en DaVinci Resolve | `pending` | [docs/devplan/tasks/32.0-backend-davinci-resolve-refine-session-bridge.md](docs/devplan/tasks/32.0-backend-davinci-resolve-refine-session-bridge.md) |
| `32.1` Refinamiento manual de escena en DaVinci Resolve asistido por UI | `32` Refinamiento manual de escena en DaVinci Resolve | `pending` | [docs/devplan/tasks/32.1-ui-davinci-resolve-manual-scene-refinement.md](docs/devplan/tasks/32.1-ui-davinci-resolve-manual-scene-refinement.md) |
| `32.2` Prueba end-to-end de Phase 32 | `32` Refinamiento manual de escena en DaVinci Resolve | `pending` | [docs/devplan/tasks/32.2-phase32-e2e-proof.md](docs/devplan/tasks/32.2-phase32-e2e-proof.md) |
| `33.0` Backend canonico de export final en DaVinci Resolve | `33` Exportacion final de escena | `pending` | [docs/devplan/tasks/33.0-backend-davinci-resolve-final-export-operation.md](docs/devplan/tasks/33.0-backend-davinci-resolve-final-export-operation.md) |
| `33.1` Exportacion final de escena desde la UI | `33` Exportacion final de escena | `pending` | [docs/devplan/tasks/33.1-ui-final-scene-export.md](docs/devplan/tasks/33.1-ui-final-scene-export.md) |
| `33.2` Prueba end-to-end de Phase 33 | `33` Exportacion final de escena | `pending` | [docs/devplan/tasks/33.2-phase33-e2e-proof.md](docs/devplan/tasks/33.2-phase33-e2e-proof.md) |
