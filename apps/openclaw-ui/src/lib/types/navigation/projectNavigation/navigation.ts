import type { SceneNavigation} from "./sceneNavigation";
import type { AssetsNavigation } from "./assetNavigation";
export type { Projects } from "../projectEdition/editor";

/**
 * Navigation panel is located on a layout's sidebar and provides quick access to different editors on the right side editor panel.
 */
export interface NavigationPanel {
    projectNavigation: ProjectNavigation[];
}
export interface Navigator {
    /** 
     * Click on the element name should open the corresponding editor on the editor panel.
    */
    elementName: string;
    elementUrl: string;
}

export interface ProjectsNavigation {
    projectNavigation: ProjectNavigation[];
}

export interface ProjectNavigation extends Navigator {
    scenesNavigation: SceneNavigation[];
    assetsNavigation: AssetsNavigation;
}
