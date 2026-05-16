import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface RepoContext {
  appRoot: string;
  repoRoot: string;
  pythonPath: string;
  openclawProjectsDir: string;
  studioDir: string;
  openclawStateDir: string;
  assets3dDir: string;
  exportsDir: string;
  blenderProjectsDir: string;
  comfyWorkspaceDir: string;
  kimodoDir: string;
}

function isRepoRoot(candidate: string): boolean {
  return (
    fs.existsSync(path.join(candidate, 'pyproject.toml')) &&
    fs.existsSync(path.join(candidate, 'src', 'openclaw_studio')) &&
    fs.existsSync(path.join(candidate, 'docs', 'architecture', 'runner-interface.md'))
  );
}

function findRepoRoot(startDir: string): string {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (isRepoRoot(currentDir)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  throw new Error(`No se encontro la raiz del repo OpenClaw desde ${startDir}.`);
}

function resolveRepoPath(repoRoot: string, value: string | undefined, fallbackName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return path.join(repoRoot, fallbackName);
  }

  return path.isAbsolute(trimmed) ? trimmed : path.join(repoRoot, trimmed);
}

export function resolveRepoContext(startDir = process.cwd()): RepoContext {
  const appRoot = path.resolve(startDir);
  const repoRoot = findRepoRoot(appRoot);
  const workHome = process.env.WORK_HOME || os.homedir();
  const studioDir = process.env.STUDIO_DIR || path.join(workHome, 'Studio');

  return {
    appRoot,
    repoRoot,
    pythonPath: path.join(repoRoot, 'src'),
    openclawProjectsDir: resolveRepoPath(
      repoRoot,
      process.env.OPENCLAW_PROJECTS_DIR,
      'openclaw-projects'
    ),
    studioDir,
    openclawStateDir: process.env.OPENCLAW_STATE_DIR || path.join(workHome, '.openclaw'),
    assets3dDir:
      process.env.OPENCLAW_ALLOWED_3D_ASSETS_DIR || path.join(studioDir, 'Assets3D'),
    exportsDir: path.join(studioDir, 'Exports'),
    blenderProjectsDir:
      process.env.OPENCLAW_ALLOWED_BLENDER_PROJECTS_DIR ||
      path.join(studioDir, 'BlenderProjects'),
    comfyWorkspaceDir: path.join(studioDir, 'ComfyUI'),
    kimodoDir: process.env.KIMODO_DIR || path.join(workHome, 'Kimodo')
  };
}
