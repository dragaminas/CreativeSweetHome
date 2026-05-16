import type { AssetKind } from "../../project";
import type { Navigator } from "./navigation";

export interface AssetsNavigation {
    charactersNavigation: AssetNavigation[];
    objectsNavigation: AssetNavigation[];
    locationsNavigation: AssetNavigation[];
}

export interface AssetNavigation extends Navigator {
    assetKind: AssetKind;
}
