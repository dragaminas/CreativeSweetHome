# Bootstrap Operativo

## Flujo recomendado

```bash
cp .env.example .env
editor .env
scripts/bootstrap/show-config.sh
scripts/bootstrap/apply-workstation.sh audit
scripts/bootstrap/apply-workstation.sh apply
```

Cuando cambies `.env`, vuelve a ejecutar:

```bash
scripts/bootstrap/apply-workstation.sh audit
scripts/bootstrap/apply-workstation.sh apply
```

La idea es converger el sistema a partir de la configuracion declarativa, no
mantener una lista larga de pasos manuales.

## Que hace el bootstrap

`scripts/bootstrap/apply-workstation.sh` orquesta:

- precondiciones
- dependencias base del host
- checks de usuario
- discos y montajes
- ajustes de GNOME
- validacion o instalacion de OpenClaw
- hardening base de OpenClaw
- provision opcional de dependencias web del shell `SvelteKit` y navegadores de
  `Playwright`
- preparacion del workspace creativo
- registro del plugin `studio-actions`
- provision de servicios `systemd --user`
- instalacion opcional de accesos directos `.desktop`
- instalacion opcional de dependencias de phase `13` para `Blender` e
  `Instant Meshes`
- instalacion opcional de dependencias y audit de phase `14` para `Rigify`,
  export y previews de rigging en `Blender`
- setup de ComfyUI y del manager integrado de ComfyUI
- instalacion opcional de `Kimodo` para CLI y demo local de motion design
- provision o regeneracion de `comfyui.service`
- diagnostico final

## Modos

- `audit`: solo comprueba y reporta
- `apply`: aplica cambios seguros e idempotentes en la medida de lo posible

## Variables especialmente importantes

- `WORK_USER`
- `WORK_HOME`
- `STUDIO_DIR`
- `OPENCLAW_STATE_DIR`
- `OPENCLAW_INSTALL_METHOD`
- `OPENCLAW_PACKAGE_SPEC`
- `OPENCLAW_ENABLE_NODE_SERVICE`
- `OPENCLAW_DESKTOP_SHORTCUTS_ENABLE`
- `OPENCLAW_STUDIO_ACTIONS_ENABLE`
- `OPENCLAW_STUDIO_ACTIONS_COMMAND_PREFIX`
- `OPENCLAW_UI_INSTALL`
- `OPENCLAW_UI_APP_DIR`
- `OPENCLAW_UI_PLAYWRIGHT_BROWSERS_PATH`
- `ENABLE_OPENCLAW_SERVICES`
- `PRE_RIG_3D_DEPS_INSTALL`
- `RIGGING_3D_DEPS_INSTALL`
- `BLENDER_INSTALL_METHOD`
- `BLENDER_RIGGING_MIN_VERSION`
- `INSTANT_MESHES_REPO_REF`
- `COMFYUI_INSTALL`
- `COMFYUI_REPO_REF`
- `COMFYUI_ENABLE_SERVICE`
- `COMFYUI_MANAGER_INSTALL_METHOD`
- `KIMODO_INSTALL`
- `KIMODO_INSTALL_METHOD`
- `KIMODO_REPO_REF`
- `KIMODO_INSTALL_EXTRAS`
- `KIMODO_TORCH_INSTALL_ARGS`
- `DISABLE_GNOME_AUTOMOUNT`
- `HARDEN_OPENCLAW`

Cuando `OPENCLAW_UI_INSTALL=true`, la ruta canonica de phase `15` es
`scripts/apps/install-ui-web-deps.sh`. En `audit` revisa `node`, `npm`, la
app `SvelteKit`, el estado de `package-lock.json` y la disponibilidad de
Chromium para `Playwright`. En `apply` usa `npm ci` si el lockfile esta al
dia, o `npm install` para crearlo o refrescarlo antes de instalar el browser
e2e.

## Verificacion posterior

```bash
scripts/doctor/openclaw-status.sh
scripts/doctor/workstation-health.sh
scripts/services/user-services.sh status
bash scripts/apps/install-3d-pre-rig-deps.sh audit
bash scripts/apps/install-3d-rigging-deps.sh audit
bash scripts/apps/install-ui-web-deps.sh audit
scripts/apps/blender.sh status
scripts/apps/blender.sh rigging-smoke-test rigging-smoke
scripts/apps/instant-meshes.sh status
scripts/apps/comfyui.sh status
scripts/apps/comfyui.sh service-status
scripts/apps/comfyui.sh restart-service
scripts/apps/install-kimodo.sh audit
openclaw plugins inspect studio-actions --json
```

Si el objetivo es probar WhatsApp, añade:

```bash
scripts/openclaw/test-studio-actions-plugin.sh "studio como esta blender"
```
