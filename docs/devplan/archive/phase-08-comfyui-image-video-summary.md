# Phase 08 Summary

## Purpose

Resumir la productizacion de `ComfyUI` para imagen y video, incluyendo
workflows locales, biblioteca visible en la UI, smoke validation y runner
canonico reutilizable.

## Final Status

`active`

La fase produjo la infraestructura principal, pero sigue abierta por el gap de
ejecucion y evidencia formal de `8.18`.

## Stable Artifacts

- [`../../comfyui/interface.md`](../../comfyui/interface.md)
- [`../../comfyui/workflow-audit.md`](../../comfyui/workflow-audit.md)
- [`../../comfyui/general-video-render-workflow.md`](../../comfyui/general-video-render-workflow.md)
- [`../../architecture/runner-interface.md`](../../architecture/runner-interface.md)
- [`../../../src/openclaw_studio/runners/comfyui.py`](../../../src/openclaw_studio/runners/comfyui.py)
- [`../../../scripts/apps/comfyui-smoke-validation.sh`](../../../scripts/apps/comfyui-smoke-validation.sh)

## Important Decisions

- `ComfyUI` sigue siendo la ruta principal para imagen y video
- la biblioteca visible `openclaw-workflows` publica workflows derivados del
  repo, no JSON editados directamente en el runtime
- el runner canonico de `ComfyUI` debe servir a CLI, WhatsApp y futuras UIs
- `8.18` debe reutilizar la misma infraestructura de runner, manifiestos,
  estados y evidencia creada para smoke

## Reusable Infrastructure Produced

- runner `comfyui`
- `scripts/actions/runner-action.sh`
- smoke validation por `case_id`
- biblioteca de workflows publicada en la UI de `ComfyUI`
- puente seguro de WhatsApp para `ComfyUI`

## Known Gaps

- [`../tasks/8.18-comfyui-atomic-composed-validation-results.md`](../tasks/8.18-comfyui-atomic-composed-validation-results.md): ejecutar la validacion atomica/compuesta real y publicar resultados canonicos
