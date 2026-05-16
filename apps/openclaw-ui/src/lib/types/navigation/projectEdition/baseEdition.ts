import type { Editor } from "./editor";

export interface UiEventPointer<TCommand, TService extends string> {
    /**
     * Fully-qualified application service operation consumed by this UI event.
     * Example: `SceneApplicationService.renameScene`.
     */
    target: TService;
    dispatch: (command: TCommand) => void | Promise<void>;
}

export interface EntityEditionView extends Editor {
    id: string;
    projectId: string;
    name: string;
    description?: string;
}

export interface RenameEntityCommand {
    entityId: string;
    name: string;
}

export interface UpdateEntityDescriptionCommand {
    entityId: string;
    description: string;
}

export interface CommonEditionEvents<
    TRenameService extends string,
    TDescriptionService extends string,
> {
    rename: UiEventPointer<RenameEntityCommand, TRenameService>;
    updateDescription: UiEventPointer<UpdateEntityDescriptionCommand, TDescriptionService>;
}
