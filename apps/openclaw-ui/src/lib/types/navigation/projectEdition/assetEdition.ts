import type { AssetKind } from "../../project";
import type { Editor } from "./editor";

export interface AssetEditor extends Editor {
    literalDescription: AssetLiteralDescription;    
    literalDescriptionEditor: LiteralDescriptionEditor;
    assetVisualization: AssetVisualization;
    assetEdition: AssetEdition;
}

export interface AssetLiteralDescription{
    assetName: string;
    assetType: AssetKind;
    assetSystemPath: string;
    assetDescription: AssetDescription;
}

export interface LiteralDescriptionEditor{
    editAssetName: (name: string) => void;
    editAssetType: (type: AssetKind) => void;
    editAssetDescription: (description: string) => AssetDescription;
}

export interface AssetDescription {
    /**
     * A human-readable description of the asset, 
     * which may include details such as its appearance, 
     * behavior, and any other relevant information that can help artists and animators understand how to use it in their work.    
    * Extend this interface as needed to include additional metadata or properties relevant to the asset.
    * Consider extend AssetDescription by assetType to include type-specific details, such as character traits for characters or material properties for objects. 
     */
    description: string;
    assetType: AssetKind;
}

export interface AssetVisualization{

    /**
     * A file representing a preview image of the asset, which can be used in the UI to provide artists and animators with a visual reference of the asset they are working with.
     */
    assetImagePreview: AssetPreview;

    asset3DMetrics?: SingleAsset3DMetrics;
}

export interface AssetPreview {
    /**
     * Shows an image, 3D model, or 3D model basic animation, depending on what is available for the asset, to provide artists and animators with a visual reference of the asset they are working with.
     * @param assetId 
     * @returns 
     */
    showAssetPreview: (assetId: string) => void;
}

export interface SingleAsset3DMetrics { 
    /**
     * Interesting meaningful user friendly metrics about the 3D model of the asset, such as polygon count, texture resolution, rigging complexity, or any other relevant information that can help artists and animators understand the technical aspects of the model and make informed decisions when working with it in their projects.
     */
    polygonCount: number;
    textureResolution: string;
    riggingComplexity: string;
    otherMetrics: string;
}

export interface AssetEdition{
    generateImage: (assetDescription: AssetDescription, targetResolution?: string, ) => File;
    uploadImage: (imageFile: File) => void;
    /**
     * Generates a 3D model of the asset based on its description and an optional reference image, 
     * which can be used by artists and animators as a starting point for further refinement and customization to better fit the specific needs of their projects.
     * @param subassets For complex assets like locations, which may be composed of multiple sub-assets (e.g., buildings, props, vegetation), 
     * this parameter allows for the inclusion of additional files that represent these sub-assets, providing a more comprehensive and detailed 3D model generation.
     * 
     */
    generateModel: (assetDescription: AssetDescription, imageFile: File, subassets?: File[]) => File;
    uploadModel: (modelFile: File) => void;
    openInBlender: (modelFile: File) => void;
}

export interface SingleAssetEdition extends AssetEdition{
    improveMesh: (modelFile: File, improvementDetails: ImprovementDetails) => File;
    improveRigging: (modelFile: File, riggingImprovementDetails: ImprovementDetails) => File;
}


export interface ImprovementDetails {
    /**
     * Details about the specific improvements needed for the 3D model, 
     * such as areas that require higher resolution, issues with topology, or specific features that need enhancement. 
     * This information can guide artists and animators in refining the model to better meet the project's requirements.
     */
    riggingIssues?: string;
    topologyIssues?: string;
    otherDetails?: string;
}
