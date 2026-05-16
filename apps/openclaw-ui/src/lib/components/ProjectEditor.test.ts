import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ProjectEditor from './ProjectEditor.svelte';
import type { ProjectEdition } from '$lib/types/navigation/projectEdition/editor';

describe('ProjectEditor', () => {
  it('renders the selected project contract', () => {
    const project: ProjectEdition = {
      editorUrl: '/?editor=project&projectId=pilot-project',
      name: 'Pilot Project',
      projectDescription: 'Filesystem-backed pilot project.',
      addScene: () => undefined,
      addAsset: () => undefined
    };

    const { body } = render(ProjectEditor, {
      props: { project }
    });

    expect(body).toContain('Pilot Project');
    expect(body).toContain('Filesystem-backed pilot project.');
    expect(body).toContain('Add Scene');
    expect(body).toContain('Add Asset');
  });
});
