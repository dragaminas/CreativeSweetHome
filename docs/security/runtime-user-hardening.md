# Hardening del usuario runtime

## Objetivo

Operar OpenClaw con principio de minimo privilegio:

- cuenta admin separada para mantenimiento del host (`sudo`, `adm`, etc.)
- cuenta runtime dedicada para ejecutar OpenClaw y servicios `systemd --user`
  sin grupos sensibles

Este documento cierra la politica de Task `1.2` sin exigir que la cuenta
administrativa pierda privilegios.

## Politica operativa

- `WORK_USER` debe apuntar al usuario runtime (ejemplo: `openclaw`)
- la cuenta admin (ejemplo: `eric`) puede conservar `sudo`
- el usuario runtime no debe pertenecer a `sudo`, `adm`, `wheel` ni `disk`
- cualquier elevacion de privilegios se hace desde la cuenta admin

## Provision recomendada

Desde la cuenta admin:

```bash
sudo useradd --create-home --shell /bin/bash openclaw
sudo passwd openclaw
sudo install -d -m 755 -o openclaw -g openclaw /home/openclaw/Documents
sudo rsync -a --delete /home/eric/Documents/OpenClaw/ /home/openclaw/Documents/OpenClaw/
sudo chown -R openclaw:openclaw /home/openclaw/Documents/OpenClaw
```

Luego iniciar sesion runtime y converger bootstrap:

```bash
sudo -iu openclaw
cd /home/openclaw/Documents/OpenClaw
cp .env.example .env
scripts/bootstrap/show-config.sh
scripts/bootstrap/apply-workstation.sh audit
scripts/bootstrap/apply-workstation.sh apply
```

## Verificacion

Checks minimos:

```bash
scripts/hardening/check-user.sh openclaw
scripts/bootstrap/apply-workstation.sh audit
scripts/doctor/openclaw-status.sh
```

Comprobacion directa de grupos:

```bash
id -nG openclaw
id -nG eric
```

Resultado esperado:

- `openclaw` sin `sudo` ni `adm`
- `eric` puede seguir en `sudo` como cuenta de administracion

## Nota de seguridad

Si algun backend necesita permisos extra (por ejemplo acceso a GPU o audio),
agrega solo los grupos estrictamente necesarios al usuario runtime y vuelve a
ejecutar `scripts/hardening/check-user.sh` para validar que no se introdujeron
grupos sensibles.
