import { Editor, Range } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { SuggestionsMenuFactory } from "./SuggestionsMenuFactoryTypes";
import { SuggestionItem } from "./SuggestionItem";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { BlockSchema } from "../../../extensions/Blocks/api/blockTypes";
export type SuggestionPluginOptions<T extends SuggestionItem, BSchema extends BlockSchema> = {
    /**
     * The name of the plugin.
     *
     * Used for ensuring that the plugin key is unique when more than one instance of the SuggestionPlugin is used.
     */
    pluginKey: PluginKey;
    /**
     * The BlockNote editor.
     */
    editor: BlockNoteEditor<BSchema>;
    /**
     * The character that should trigger the suggestion menu to pop up (e.g. a '/' for commands), when typed by the user.
     */
    defaultTriggerCharacter: string;
    suggestionsMenuFactory: SuggestionsMenuFactory<T>;
    /**
     * The callback that gets executed when an item is selected by the user.
     *
     * **NOTE:** The command text is not removed automatically from the editor by this plugin,
     * this should be done manually. The `editor` and `range` properties passed
     * to the callback function might come in handy when doing this.
     */
    onSelectItem?: (props: {
        item: T;
        editor: BlockNoteEditor<BSchema>;
    }) => void;
    /**
     * A function that should supply the plugin with items to suggest, based on a certain query string.
     */
    items?: (query: string) => T[];
    allow?: (props: {
        editor: Editor;
        range: Range;
    }) => boolean;
};
type SuggestionPluginState<T extends SuggestionItem> = {
    active: boolean;
    triggerCharacter: string | undefined;
    queryStartPos: number | undefined;
    items: T[];
    keyboardHoveredItemIndex: number | undefined;
    notFoundCount: number | undefined;
    decorationId: string | undefined;
};
/**
 * A ProseMirror plugin for suggestions, designed to make '/'-commands possible as well as mentions.
 *
 * This is basically a simplified version of TipTap's [Suggestions](https://github.com/ueberdosis/tiptap/tree/db92a9b313c5993b723c85cd30256f1d4a0b65e1/packages/suggestion) plugin.
 *
 * This version is adapted from the aforementioned version in the following ways:
 * - This version supports generic items instead of only strings (to allow for more advanced filtering for example)
 * - This version hides some unnecessary complexity from the user of the plugin.
 * - This version handles key events differently
 *
 * @param options options for configuring the plugin
 * @returns the prosemirror plugin
 */
export declare function createSuggestionPlugin<T extends SuggestionItem, BSchema extends BlockSchema>({ pluginKey, editor, defaultTriggerCharacter, suggestionsMenuFactory, onSelectItem: selectItemCallback, items, }: SuggestionPluginOptions<T, BSchema>): Plugin<SuggestionPluginState<T>>;
export {};
