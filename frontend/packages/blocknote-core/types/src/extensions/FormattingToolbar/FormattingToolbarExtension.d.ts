import { Extension } from "@tiptap/core";
import { BlockNoteEditor, BlockSchema } from "../..";
import { FormattingToolbarFactory } from "./FormattingToolbarFactoryTypes";
export type FormattingToolbarOptions<BSchema extends BlockSchema> = {
    formattingToolbarFactory: FormattingToolbarFactory<BSchema>;
    editor: BlockNoteEditor<BSchema>;
};
/**
 * The menu that is displayed when selecting a piece of text.
 */
export declare const createFormattingToolbarExtension: <BSchema extends Record<string, import("../..").BlockSpec<string, import("../..").PropSchema>>>() => Extension<FormattingToolbarOptions<BSchema>, any>;
