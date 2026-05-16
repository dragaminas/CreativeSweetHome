import { describe, expect, it } from 'vitest';

import { buildProductShell } from './product-shell';

describe('buildProductShell', () => {
  it('publishes the route boundaries expected by phase 15', () => {
    const shell = buildProductShell([
      {
        runner_id: 'blender',
        display_label: 'Blender',
        supported_operation_kinds: ['operate'],
        supported_target_kinds: ['use_case'],
        supports_cancel: false,
        supports_progress: false,
        default_evidence_root: '/tmp/assets'
      },
      {
        runner_id: 'comfyui',
        display_label: 'ComfyUI',
        supported_operation_kinds: ['validate_smoke'],
        supported_target_kinds: ['suite'],
        supports_cancel: true,
        supports_progress: true,
        default_evidence_root: '/tmp/validation'
      }
    ]);

    const kimodo = shell.workspaces.find((workspace) => workspace.id === 'kimodo');
    const comfyui = shell.workspaces.find((workspace) => workspace.id === 'comfyui');
    const scene = shell.workspaces.find((workspace) => workspace.id === 'scene');

    expect(shell.workspaces.map((workspace) => workspace.id)).toEqual([
      'scene',
      'assets',
      'kimodo',
      'blender',
      'comfyui',
      'resolve'
    ]);
    expect(kimodo?.embedPath).toBe('/workspaces/kimodo/embed');
    expect(comfyui?.runnerIds).toContain('comfyui');
    expect(comfyui?.boundary).toMatch(/canvas general/i);
    expect(scene?.stateLabel).toBe('Available');
    expect(scene?.stateTone).toBe('positive');
    expect(scene?.notes.join(' ')).toMatch(/scene brief/i);
  });
});
