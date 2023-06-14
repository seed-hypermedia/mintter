import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { SuggestionsMenuFactory } from "../../shared/plugins/suggestion/SuggestionsMenuFactoryTypes";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";
export type SlashMenuOptions<BSchema extends BlockSchema> = {
    editor: BlockNoteEditor<BSchema> | undefined;
    commands: BaseSlashMenuItem<BSchema>[] | undefined;
    slashMenuFactory: SuggestionsMenuFactory<any> | undefined;
};
export declare const SlashMenuPluginKey: PluginKey<any>;
export declare const createSlashMenuExtension: <BSchema extends Record<string, import("../Blocks/api/blockTypes").BlockSpec<string, import("../Blocks/api/blockTypes").PropSchema>>>() => Extension<SlashMenuOptions<BSchema>, any>;
