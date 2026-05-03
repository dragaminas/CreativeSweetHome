# Foundation Summary

## Purpose

Resumir el trabajo base de las fases `0` a `7`: estructura del repo,
hardening, bootstrap, integracion de aplicaciones, capa segura, UX sin consola,
backup y aceptacion operativa.

## Final Status

- fases `0`, `2`, `3`, `4`, `5`, `6` y `7`: `done`
- fase `1`: `active` solo por el gap documental/operativo de `1.2`

## Stable Artifacts

- [`../../../.env.example`](../../../.env.example)
- [`../../../scripts/bootstrap/apply-workstation.sh`](../../../scripts/bootstrap/apply-workstation.sh)
- [`../../../scripts/hardening/check-user.sh`](../../../scripts/hardening/check-user.sh)
- [`../../../scripts/hardening/check-mounts.sh`](../../../scripts/hardening/check-mounts.sh)
- [`../../../scripts/openclaw/install-openclaw.sh`](../../../scripts/openclaw/install-openclaw.sh)
- [`../../../plugins/studio-actions/index.js`](../../../plugins/studio-actions/index.js)
- [`../../operations/acceptance.md`](../../operations/acceptance.md)

## Important Decisions

- el sistema se configura desde `.env`
- el runtime normal no debe usar `root`
- GNOME no debe automontar unidades
- WhatsApp entra siempre por una capa segura con wake word
- Blender y `ComfyUI` se exponen por wrappers controlados

## Reusable Infrastructure Produced

- libreria comun de scripts y codigos de salida
- bootstrap declarativo del host y de `OpenClaw`
- wrappers de Blender y `ComfyUI`
- plugin `studio-actions`
- servicios `systemd --user`
- backup, restore y update del stack

## Known Gaps

- [`../tasks/1.2-runtime-user-hardening.md`](../tasks/1.2-runtime-user-hardening.md): cerrar la remocion del usuario runtime de grupos sensibles y documentar la evidencia real
