import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveRepoContext } from './env';

const initialProjectsDir = process.env.OPENCLAW_PROJECTS_DIR;

afterEach(() => {
  if (initialProjectsDir === undefined) {
    delete process.env.OPENCLAW_PROJECTS_DIR;
  } else {
    process.env.OPENCLAW_PROJECTS_DIR = initialProjectsDir;
  }
});

describe('resolveRepoContext openclaw projects root', () => {
  it('defaults openclawProjectsDir to repoRoot/openclaw-projects', () => {
    delete process.env.OPENCLAW_PROJECTS_DIR;

    const context = resolveRepoContext();

    expect(context.openclawProjectsDir).toBe(path.join(context.repoRoot, 'openclaw-projects'));
  });

  it('resolves relative OPENCLAW_PROJECTS_DIR from the repo root', () => {
    process.env.OPENCLAW_PROJECTS_DIR = 'local-projects';

    const context = resolveRepoContext();

    expect(context.openclawProjectsDir).toBe(path.join(context.repoRoot, 'local-projects'));
  });

  it('uses absolute OPENCLAW_PROJECTS_DIR unchanged', () => {
    const absolutePath = path.join(path.sep, 'tmp', 'openclaw-projects-test');
    process.env.OPENCLAW_PROJECTS_DIR = absolutePath;

    const context = resolveRepoContext();

    expect(context.openclawProjectsDir).toBe(absolutePath);
  });
});
