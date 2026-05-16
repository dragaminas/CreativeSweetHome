
/**
 * Routes showed in the editor panel.
 */
export interface Editor {
    /**
     * A URL pointing to the editor route for the specific entity (scene, shot, asset, etc.), which provides an interface for artists and animators to create and modify content related to that entity.
     * This URL should lead to a dedicated editing environment where users can access tools and features relevant to the entity they are working on, such as asset creation, scene layout, or shot composition.
     */
    editorUrl: string;
}

export interface Projects extends Editor{
    projectsList: string[];
    addProject: () => void;
}


export interface ProjectEdition extends Editor{
    name: string;
    projectDescription: string;
    addScene: () => void;
    addAsset: () => void;
}
