import { Extensions } from "@tiptap/core";
import { BlockNoteEditor } from "./BlockNoteEditor";
import * as Y from "yjs";
import { BlockSchema } from "./extensions/Blocks/api/blockTypes";
import { BlockSideMenuFactory } from "./extensions/DraggableBlocks/BlockSideMenuFactoryTypes";
import { FormattingToolbarFactory } from "./extensions/FormattingToolbar/FormattingToolbarFactoryTypes";
import { HyperlinkToolbarFactory } from "./extensions/HyperlinkToolbar/HyperlinkToolbarFactoryTypes";
import { BaseSlashMenuItem } from "./extensions/SlashMenu";
import { SuggestionsMenuFactory } from "./shared/plugins/suggestion/SuggestionsMenuFactoryTypes";
export type UiFactories<BSchema extends BlockSchema> = Partial<{
    formattingToolbarFactory: FormattingToolbarFactory<BSchema>;
    hyperlinkToolbarFactory: HyperlinkToolbarFactory;
    slashMenuFactory: SuggestionsMenuFactory<BaseSlashMenuItem<BSchema>>;
    blockSideMenuFactory: BlockSideMenuFactory<BSchema>;
}>;
/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export declare const getBlockNoteExtensions: <BSchema extends Record<string, import("./extensions/Blocks/api/blockTypes").BlockSpec<string, import("./extensions/Blocks/api/blockTypes").PropSchema>>>(opts: {
    editor: BlockNoteEditor<BSchema>;
    uiFactories: Partial<{
        formattingToolbarFactory: FormattingToolbarFactory<BSchema>;
        hyperlinkToolbarFactory: HyperlinkToolbarFactory;
        slashMenuFactory: SuggestionsMenuFactory<BaseSlashMenuItem<BSchema>>;
        blockSideMenuFactory: BlockSideMenuFactory<BSchema>;
    }>;
    slashCommands: BaseSlashMenuItem<any>[];
    blockSchema: BSchema;
    collaboration?: {
        fragment: Y.XmlFragment;
        user: {
            name: string;
            color: string;
        };
        provider: any;
        renderCursor?: ((user: any) => HTMLElement) | undefined;
    } | undefined;
}) => Extensions;
