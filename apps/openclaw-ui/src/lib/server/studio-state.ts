import fs from 'node:fs/promises';
import path from 'node:path';

import type { DirectoryStatus, StudioState } from '$lib/types/product';
import { resolveRepoContext } from './env';

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function directoryStatus(
  id: string,
  label: string,
  targetPath: string,
  note: string
): Promise<DirectoryStatus> {
  return {
    id,
    label,
    path: targetPath,
    exists: await pathExists(targetPath),
    note
  };
}

export async function loadStudioState(): Promise<StudioState> {
  const context = resolveRepoContext();

  return {
    repoRoot: context.repoRoot,
    runnerContractPath: path.join(
      context.repoRoot,
      'docs',
      'architecture',
      'runner-interface.md'
    ),
    sceneRootPath: path.join(context.studioDir, 'Scenes'),
    directories: await Promise.all([
      directoryStatus(
        'studio-root',
        'Studio root',
        context.studioDir,
        'Raiz filesystem-first del producto.'
      ),
      directoryStatus(
        'scenes',
        'Scenes',
        path.join(context.studioDir, 'Scenes'),
        'Raiz canonica para briefs, scaffold y manifiestos de escena.'
      ),
      directoryStatus(
        'assets3d',
        'Assets3D',
        context.assets3dDir,
        'Destino canonico para candidatos, cleanup y handoffs 3D.'
      ),
      directoryStatus(
        'exports',
        'Exports',
        context.exportsDir,
        'Salida canonica para renders, tomas y material final.'
      ),
      directoryStatus(
        'blender-projects',
        'BlenderProjects',
        context.blenderProjectsDir,
        'Workspace local permitido para proyectos asistidos en Blender.'
      ),
      directoryStatus(
        'comfyui-workspace',
        'ComfyUI',
        context.comfyWorkspaceDir,
        'Area local reservada para el engine y assets intermedios.'
      ),
      directoryStatus(
        'kimodo-install',
        'Kimodo',
        context.kimodoDir,
        'Instalacion local reutilizada para embed de animacion en phase 24.'
      ),
      directoryStatus(
        'validation-kimodo',
        'Validation/Kimodo',
        path.join(context.studioDir, 'Validation', 'kimodo'),
        'Evidencia canonica prevista para sesiones embebidas y handoff de animacion.'
      ),
      directoryStatus(
        'validation-comfyui',
        'Validation/ComfyUI',
        path.join(context.studioDir, 'Validation', 'comfyui'),
        'Evidencia canonica para operate y validaciones de ComfyUI.'
      )
    ])
  };
}
