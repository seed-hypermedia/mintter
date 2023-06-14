import { Editor } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { BlockSideMenu, BlockSideMenuDynamicParams, BlockSideMenuFactory, BlockSideMenuStaticParams } from "./BlockSideMenuFactoryTypes";
import { DraggableBlocksOptions } from "./DraggableBlocksExtension";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";
export type BlockMenuViewProps<BSchema extends BlockSchema> = {
    tiptapEditor: Editor;
    editor: BlockNoteEditor<BSchema>;
    blockMenuFactory: BlockSideMenuFactory<BSchema>;
    horizontalPosAnchoredAtRoot: boolean;
};
export declare class BlockMenuView<BSchema extends BlockSchema> {
    editor: BlockNoteEditor<BSchema>;
    private ttEditor;
    horizontalPosAnchoredAtRoot: boolean;
    horizontalPosAnchor: number;
    blockMenu: BlockSideMenu<BSchema>;
    hoveredBlock: HTMLElement | undefined;
    isDragging: boolean;
    menuOpen: boolean;
    menuFrozen: boolean;
    constructor({ tiptapEditor, editor, blockMenuFactory, horizontalPosAnchoredAtRoot, }: BlockMenuViewProps<BSchema>);
    /**
     * Sets isDragging when dragging text.
     */
    onDragStart: () => void;
    /**
     * If the event is outside the editor contents,
     * we dispatch a fake event, so that we can still drop the content
     * when dragging / dropping to the side of the editor
     */
    onDrop: (event: DragEvent) => void;
    /**
     * If the event is outside of the editor contents,
     * we dispatch a fake event, so that we can still drop the content
     * when dragging / dropping to the side of the editor
     */
    onDragOver: (event: DragEvent) => void;
    onKeyDown: (_event: KeyboardEvent) => void;
    onMouseDown: (event: MouseEvent) => void;
    onMouseMove: (event: MouseEvent) => void;
    onScroll: () => void;
    destroy(): void;
    addBlock(): void;
    getStaticParams(): BlockSideMenuStaticParams<BSchema>;
    getDynamicParams(): BlockSideMenuDynamicParams<BSchema>;
}
export declare const createDraggableBlocksPlugin: <BSchema extends Record<string, import("../Blocks/api/blockTypes").BlockSpec<string, import("../Blocks/api/blockTypes").PropSchema>>>(options: DraggableBlocksOptions<BSchema>) => Plugin<any>;
