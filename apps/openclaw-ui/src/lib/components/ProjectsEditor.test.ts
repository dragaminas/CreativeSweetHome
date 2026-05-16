import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import ProjectsEditor from './ProjectsEditor.svelte';
import type { Projects } from '$lib/types/navigation/projectNavigation/navigation';

describe('ProjectsEditor', () => {
  it('renders the projects list and add-project action from the Projects contract', () => {
    const projects: Projects = {
      editorUrl: '/projects',
      projectsList: ['Pilot Project', 'Second Unit'],
      addProject: () => undefined
    };

    const { body } = render(ProjectsEditor, {
      props: {
        projects
      }
    });

    expect(body).toContain('Pilot Project');
    expect(body).toContain('Second Unit');
    expect(body).toContain('Add Project');
  });
});
