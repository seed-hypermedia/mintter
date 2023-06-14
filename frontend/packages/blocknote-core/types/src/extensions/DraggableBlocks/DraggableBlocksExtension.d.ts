import { Editor, Extension } from "@tiptap/core";
import { BlockSideMenuFactory } from "./BlockSideMenuFactoryTypes";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";
export type DraggableBlocksOptions<BSchema extends BlockSchema> = {
    tiptapEditor: Editor;
    editor: BlockNoteEditor<BSchema>;
    blockSideMenuFactory: BlockSideMenuFactory<BSchema>;
};
/**
 * This extension adds a menu to the side of blocks which features various BlockNote functions such as adding and
 * removing blocks. More importantly, it adds a drag handle which allows the user to drag and drop blocks.
 *
 * code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799
 */
export declare const createDraggableBlocksExtension: <BSchema extends Record<string, import("../Blocks/api/blockTypes").BlockSpec<string, import("../Blocks/api/blockTypes").PropSchema>>>() => Extension<DraggableBlocksOptions<BSchema>, any>;
