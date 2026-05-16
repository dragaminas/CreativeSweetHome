import type { ShotNavigation } from "./shotNavigation";
import type { Navigator } from "./navigation";

export interface SceneNavigation extends Navigator {
    shotsNavigation: ShotNavigation[];
}
