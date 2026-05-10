# Cleanup 3D Pre-Rig

## Estado actual

`OpenClaw` ya expone una ruta canonica para preparar humanoides 3D antes del
rigging mediante el runner `blender`:

```text
source model -> Blender cleanup -> Instant Meshes -> cleaned/remeshed handoff
```

La misma ruta sirve para CLI hoy y queda lista para futuras UIs sin crear un
segundo orquestador.

## Instalacion de dependencias

La fase `13` ya no depende de un checklist manual oculto. Sus dependencias de
host se auditan o instalan desde el repo con:

```bash
bash scripts/apps/install-3d-pre-rig-deps.sh audit
bash scripts/apps/install-3d-pre-rig-deps.sh apply
```

El bootstrap central tambien puede orquestarlo cuando `.env` habilita:

```text
PRE_RIG_3D_DEPS_INSTALL=true
```

Variables utiles:

- `BLENDER_INSTALL_METHOD`
- `BLENDER_BIN`
- `INSTANT_MESHES_INSTALL_METHOD`
- `INSTANT_MESHES_DIR`
- `INSTANT_MESHES_REPO_URL`
- `INSTANT_MESHES_REPO_REF`
- `INSTANT_MESHES_BUILD_DIR`
- `INSTANT_MESHES_BUILD_JOBS`
- `INSTANT_MESHES_BIN`

## Entry Point Canonico

```bash
scripts/actions/runner-action.sh describe blender
scripts/actions/runner-action.sh list-targets blender operate
```

Target operativo actual:

- `cleanup_pre_rig_humanoid`

## Inputs y modos

El comando `start` acepta `inputs` y `options` estructurados por JSON en el
mismo entrypoint canonico.

Ejemplo en modo `auto`:

```bash
OPENCLAW_RUNNER_INPUTS_JSON='{"source_model_path":"/home/eric/Studio/Assets3D/demo/hero/input/hero.glb","project_id":"demo","entity_id":"hero"}' \
OPENCLAW_RUNNER_OPTIONS_JSON='{"mode":"auto"}' \
scripts/actions/runner-action.sh start blender operate cleanup_pre_rig_humanoid
```

Ejemplo en modo `debug`:

```bash
scripts/actions/runner-action.sh start blender operate cleanup_pre_rig_humanoid \
  --inputs-json '{"source_model_path":"/home/eric/Studio/Assets3D/demo/hero/input/hero.glb","project_id":"demo","entity_id":"hero"}' \
  --options-json '{"mode":"debug","instant_meshes_faces":8000}'
```

Inputs utiles:

- `source_model_path`: modelo fuente `.glb`, `.gltf`, `.fbx`, `.obj`, `.ply` o `.stl`
- `project_id`: carpeta de proyecto bajo `Assets3D/`
- `entity_id`: id estable del personaje

Options utiles:

- `mode`: `auto` o `debug`
- `instant_meshes_faces`
- `join_mesh_parts`
- `remove_small_floaters`
- `allow_decimate`
- `target_face_count`
- `decimate_face_threshold`

## Lo que hace el cleanup

En `auto`, el helper de Blender intenta:

- aplicar escala y rotacion
- centrar el personaje
- apoyar el punto mas bajo en `Z=0`
- recalcular normales
- borrar loose geometry
- remover componentes flotantes muy pequenos cuando sea seguro
- unir piezas solo si detecta overlap conservador
- decimar solo por encima de un umbral conservador
- exportar `cleaned obj` y `cleaned glb`

Despues, `Instant Meshes` intenta publicar un `obj` remesheado en batch mode.

En `debug`, la misma ruta deja mas diagnostico y desactiva por defecto las
operaciones mas agresivas como `remove_small_floaters` y `decimate`.

## Evidencia publicada

Cada corrida publica en:

```text
$STUDIO_DIR/Assets3D/<project>/<entity_id>/cleanup/<run_id>/
├── input/
├── blender/
├── output/
├── manifests/
├── logs/
└── cleanup-report.md
```

Archivos clave:

- `manifests/run.json`
- `manifests/summary.json`
- `manifests/blender-cleanup.json`
- `logs/blender.stdout.log`
- `logs/blender.stderr.log`
- `logs/instant-meshes.stdout.log`
- `logs/instant-meshes.stderr.log`
- `output/<entity_id>__cleaned__v001.obj`
- `output/<entity_id>__cleaned__v001.glb`
- `output/<entity_id>__remeshed__v001.obj` cuando `Instant Meshes` termina bien
- `cleanup-report.md`

## Status esperados

- `pass`: cleanup y remesh publicados
- `soft_pass_with_fallback`: Blender publico cleaned export, pero `Instant Meshes` no produjo salida utilizable
- `blocked_missing_asset`: falta `source_model_path` o el archivo no existe
- `fail_runtime`: fallo real del backend o falta un output esperado

## Wrappers de soporte

Comprobacion de runtimes:

```bash
bash scripts/apps/install-3d-pre-rig-deps.sh audit
scripts/apps/blender.sh status
scripts/apps/instant-meshes.sh status
```

El runner usa internamente:

- `scripts/apps/blender.sh pre-rig-cleanup <config.json>`
- `scripts/apps/instant-meshes.sh remesh <input_mesh> <output_mesh> ...`

## Nota operativa

Segun el README oficial de `wjakob/instant-meshes`, en Linux el binario
depende de `zenity`, y el batch mode usa `-o` para escribir `PLY/OBJ` sin
interfaz manual. Si `Instant Meshes` no esta disponible, la corrida puede
cerrar como `soft_pass_with_fallback` con el cleaned export publicado.
