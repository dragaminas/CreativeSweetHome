# Blender

## Estado actual

Blender ya esta integrado como primer backend creativo local.

El repo permite:

- detectar Blender
- crear proyectos nuevos
- abrir proyectos existentes
- ejecutar una smoke test real
- ejecutar cleanup pre-rig humanoide via runner canonico
- auditar la base de rigging humanoide con `Rigify`, export y preview render
- invocar estas acciones desde el plugin seguro de WhatsApp

## Prueba local rapida

```bash
bash scripts/apps/install-3d-pre-rig-deps.sh audit
bash scripts/apps/install-3d-rigging-deps.sh audit
scripts/apps/blender.sh status
scripts/apps/blender.sh smoke-test blender-smoke
scripts/apps/blender.sh rigging-smoke-test rigging-smoke
```

Eso debe generar:

- un proyecto `.blend`
- un render `.png`

Por defecto quedan en:

```text
$STUDIO_DIR/BlenderProjects/<nombre>/
```

## Cleanup pre-rig humanoide

La ruta canonica para preparar un personaje antes del rigging vive en el
runner `blender`, no en una CLI paralela:

```bash
scripts/actions/runner-action.sh describe blender
scripts/actions/runner-action.sh list-targets blender operate
scripts/actions/runner-action.sh start blender operate cleanup_pre_rig_humanoid
```

Si ejecutas `start` sin `inputs`, el runner responde con
`blocked_missing_asset` y publica la estructura de evidencia esperada.

Para correr de verdad:

```bash
OPENCLAW_RUNNER_INPUTS_JSON='{"source_model_path":"/home/eric/Studio/Assets3D/demo/hero/input/hero.glb","project_id":"demo","entity_id":"hero"}' \
OPENCLAW_RUNNER_OPTIONS_JSON='{"mode":"auto"}' \
scripts/actions/runner-action.sh start blender operate cleanup_pre_rig_humanoid
```

La documentacion operativa completa del flujo esta en
[3d-pre-rig-cleanup.md](3d-pre-rig-cleanup.md).

## Create rig humanoide

El runner canonico `blender` ya expone `create_rig_humanoid` bajo
`operation_kind=operate`, reutilizando la misma capa `runner-action.sh`:

```bash
scripts/actions/runner-action.sh list-targets blender operate
scripts/actions/runner-action.sh start blender operate create_rig_humanoid
```

Si ejecutas `start` sin `inputs`, el target responde
`blocked_missing_asset` y deja evidencia canonica bajo
`$STUDIO_DIR/Assets3D/.../rigging/<run_id>/`.

Para ejecutar el flujo real:

```bash
OPENCLAW_RUNNER_INPUTS_JSON='{"prepared_model_path":"/home/eric/Studio/Assets3D/demo/hero/cleanup/<run_id>/output/hero__remeshed__v001.obj","project_id":"demo","entity_id":"hero"}' \
scripts/actions/runner-action.sh start blender operate create_rig_humanoid
```

Happy path esperado:

- `Rigify` + `automatic weights` en background
- pose-suite `basic_humanoid_v1` (`arms`, `elbows`, `knees`, `head`, `torso`)
- evidencia en `Assets3D/<project>/<entity_id>/rigging/<run_id>/` con:
  - `manifests/run.json` y `manifests/summary.json`
  - `logs/blender.stdout.log` y `logs/blender.stderr.log`
  - `output/<entity_id>__rigged__v001.glb`
  - `output/<entity_id>__rigged__v001.fbx`
  - `validation/*.png`
  - `rigging-report.md`

Si la maquina todavia no tiene las dependencias del flujo, usa:

```bash
bash scripts/apps/install-3d-pre-rig-deps.sh audit
bash scripts/apps/install-3d-pre-rig-deps.sh apply
bash scripts/apps/install-3d-rigging-deps.sh audit
bash scripts/apps/install-3d-rigging-deps.sh apply
```

## Smoke de rigging humanoide

La fase `14` reutiliza `Blender` como backend y audita en background:

- disponibilidad de `Rigify`
- export `glTF/FBX`
- preview render de una escena minima de rigging

Ruta manual recomendada:

```bash
bash scripts/apps/install-3d-rigging-deps.sh audit
scripts/apps/blender.sh rigging-smoke-test rigging-smoke
```

Por defecto esto publica en:

```text
$STUDIO_DIR/BlenderProjects/rigging-smoke/
```

Archivos esperados:

- `rigging-smoke.blend`
- `rigging-smoke.glb`
- `rigging-smoke.fbx`
- `rigging-smoke.png`
- `rigging-smoke-report.json`

## Abrir un proyecto existente

```bash
scripts/apps/blender.sh open-project /ruta/al/proyecto.blend
```

Si no hay sesion grafica disponible, el script no intenta abrir la ventana.

## Probar el wrapper seguro

```bash
scripts/actions/blender-action.sh status
scripts/actions/blender-action.sh new castillo
scripts/actions/blender-action.sh open castillo
scripts/actions/blender-action.sh smoke-test prueba-blender
```

## Probar el puente local sin WhatsApp

```bash
scripts/openclaw/test-studio-actions-plugin.sh "studio como esta blender"
scripts/openclaw/test-studio-actions-plugin.sh "studio crea proyecto whatsapp-demo"
```

Esto usa el mismo plugin que intercepta mensajes en WhatsApp, pero sin depender
del chat real.

## Uso esperado desde WhatsApp

Escribe a la cuenta enlazada con OpenClaw, normalmente en el chat contigo mismo:

- `studio abre blender`
- `studio como esta blender`
- `studio crea proyecto castillo`
- `studio abre proyecto castillo`
- `studio haz una prueba de blender`

Si no escribes la wake word `studio`, no deberia haber respuesta.

## Verificacion minima recomendada

1. Ejecutar `scripts/apps/blender.sh status`
2. Ejecutar `scripts/apps/blender.sh smoke-test blender-smoke`
3. Ejecutar `scripts/apps/blender.sh rigging-smoke-test rigging-smoke`
4. Ejecutar `scripts/actions/runner-action.sh describe blender`
5. Ejecutar `scripts/actions/runner-action.sh list-targets blender operate`
6. Ejecutar `scripts/openclaw/test-studio-actions-plugin.sh "studio como esta blender"`
7. Confirmar que existen el `.blend`, el `.png`, el `.glb` y el `.fbx`
