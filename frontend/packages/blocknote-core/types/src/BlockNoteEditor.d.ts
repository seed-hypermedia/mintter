import { Node } from "prosemirror-model";
import { Editor as TiptapEditor } from "@tiptap/core/dist/packages/core/src/Editor";
import * as Y from "yjs";
import { UiFactories } from "./BlockNoteExtensions";
import { Block, BlockIdentifier, BlockSchema, PartialBlock } from "./extensions/Blocks/api/blockTypes";
import { TextCursorPosition } from "./extensions/Blocks/api/cursorPositionTypes";
import { DefaultBlockSchema } from "./extensions/Blocks/api/defaultBlocks";
import { Styles } from "./extensions/Blocks/api/inlineContentTypes";
import { Selection } from "./extensions/Blocks/api/selectionTypes";
import { BaseSlashMenuItem } from "./extensions/SlashMenu";
export type BlockNoteEditorOptions<BSchema extends BlockSchema> = {
    enableBlockNoteExtensions: boolean;
    /**
     * UI element factories for creating a custom UI, including custom positioning
     * & rendering.
     */
    uiFactories: UiFactories<BSchema>;
    /**
     * TODO: why is this called slashCommands and not slashMenuItems?
     *
     * (couldn't fix any type, see https://github.com/TypeCellOS/BlockNote/pull/191#discussion_r1210708771)
     *
     * @default defaultSlashMenuItems from `./extensions/SlashMenu`
     */
    slashCommands: BaseSlashMenuItem<any>[];
    /**
     * The HTML element that should be used as the parent element for the editor.
     *
     * @default: undefined, the editor is not attached to the DOM
     */
    parentElement: HTMLElement;
    /**
     * An object containing attributes that should be added to the editor's HTML element.
     *
     * @example { class: "my-editor-class" }
     */
    editorDOMAttributes: Record<string, string>;
    /**
     *  A callback function that runs when the editor is ready to be used.
     */
    onEditorReady: (editor: BlockNoteEditor<BSchema>) => void;
    /**
     * A callback function that runs whenever the editor's contents change.
     */
    onEditorContentChange: (editor: BlockNoteEditor<BSchema>) => void;
    /**
     * A callback function that runs whenever the text cursor position changes.
     */
    onTextCursorPositionChange: (editor: BlockNoteEditor<BSchema>) => void;
    /**
     * Locks the editor from being editable by the user if set to `false`.
     */
    editable: boolean;
    /**
     * The content that should be in the editor when it's created, represented as an array of partial block objects.
     */
    initialContent: PartialBlock<BSchema>[];
    /**
     * Use default BlockNote font and reset the styles of <p> <li> <h1> elements etc., that are used in BlockNote.
     *
     * @default true
     */
    defaultStyles: boolean;
    /**
     * Whether to use the light or dark theme.
     *
     * @default "light"
     */
    theme: "light" | "dark";
    /**
     * A list of block types that should be available in the editor.
     */
    blockSchema: BSchema;
    /**
     * When enabled, allows for collaboration between multiple users.
     */
    collaboration: {
        /**
         * The Yjs XML fragment that's used for collaboration.
         */
        fragment: Y.XmlFragment;
        /**
         * The user info for the current user that's shown to other collaborators.
         */
        user: {
            name: string;
            color: string;
        };
        /**
         * A Yjs provider (used for awareness / cursor information)
         */
        provider: any;
        /**
         * Optional function to customize how cursors of users are rendered
         */
        renderCursor?: (user: any) => HTMLElement;
    };
    _tiptapOptions: any;
};
export declare class BlockNoteEditor<BSchema extends BlockSchema = DefaultBlockSchema> {
    private readonly options;
    readonly _tiptapEditor: TiptapEditor & {
        contentComponent: any;
    };
    blockCache: WeakMap<Node, Block<BSchema>>;
    readonly schema: BSchema;
    get domElement(): HTMLDivElement;
    focus(): void;
    constructor(options?: Partial<BlockNoteEditorOptions<BSchema>>);
    /**
     * Gets a snapshot of all top-level (non-nested) blocks in the editor.
     * @returns A snapshot of all top-level (non-nested) blocks in the editor.
     */
    get topLevelBlocks(): Block<BSchema>[];
    /**
     * Gets a snapshot of an existing block from the editor.
     * @param blockIdentifier The identifier of an existing block that should be retrieved.
     * @returns The block that matches the identifier, or `undefined` if no matching block was found.
     */
    getBlock(blockIdentifier: BlockIdentifier): Block<BSchema> | undefined;
    /**
     * Traverses all blocks in the editor depth-first, and executes a callback for each.
     * @param callback The callback to execute for each block. Returning `false` stops the traversal.
     * @param reverse Whether the blocks should be traversed in reverse order.
     */
    forEachBlock(callback: (block: Block<BSchema>) => boolean, reverse?: boolean): void;
    /**
     * Executes a callback whenever the editor's contents change.
     * @param callback The callback to execute.
     */
    onEditorContentChange(callback: () => void): void;
    /**
     * Gets a snapshot of the current text cursor position.
     * @returns A snapshot of the current text cursor position.
     */
    getTextCursorPosition(): TextCursorPosition<BSchema>;
    /**
     * Sets the text cursor position to the start or end of an existing block. Throws an error if the target block could
     * not be found.
     * @param targetBlock The identifier of an existing block that the text cursor should be moved to.
     * @param placement Whether the text cursor should be placed at the start or end of the block.
     */
    setTextCursorPosition(targetBlock: BlockIdentifier, placement?: "start" | "end"): void;
    /**
     * Gets a snapshot of the current selection.
     */
    getSelection(): Selection<BSchema> | undefined;
    /**
     * Checks if the editor is currently editable, or if it's locked.
     * @returns True if the editor is editable, false otherwise.
     */
    get isEditable(): boolean;
    /**
     * Makes the editor editable or locks it, depending on the argument passed.
     * @param editable True to make the editor editable, or false to lock it.
     */
    set isEditable(editable: boolean);
    /**
     * Inserts new blocks into the editor. If a block's `id` is undefined, BlockNote generates one automatically. Throws an
     * error if the reference block could not be found.
     * @param blocksToInsert An array of partial blocks that should be inserted.
     * @param referenceBlock An identifier for an existing block, at which the new blocks should be inserted.
     * @param placement Whether the blocks should be inserted just before, just after, or nested inside the
     * `referenceBlock`. Inserts the blocks at the start of the existing block's children if "nested" is used.
     */
    insertBlocks(blocksToInsert: PartialBlock<BSchema>[], referenceBlock: BlockIdentifier, placement?: "before" | "after" | "nested"): void;
    /**
     * Updates an existing block in the editor. Since updatedBlock is a PartialBlock object, some fields might not be
     * defined. These undefined fields are kept as-is from the existing block. Throws an error if the block to update could
     * not be found.
     * @param blockToUpdate The block that should be updated.
     * @param update A partial block which defines how the existing block should be changed.
     */
    updateBlock(blockToUpdate: BlockIdentifier, update: PartialBlock<BSchema>): void;
    /**
     * Removes existing blocks from the editor. Throws an error if any of the blocks could not be found.
     * @param blocksToRemove An array of identifiers for existing blocks that should be removed.
     */
    removeBlocks(blocksToRemove: BlockIdentifier[]): void;
    /**
     * Replaces existing blocks in the editor with new blocks. If the blocks that should be removed are not adjacent or
     * are at different nesting levels, `blocksToInsert` will be inserted at the position of the first block in
     * `blocksToRemove`. Throws an error if any of the blocks to remove could not be found.
     * @param blocksToRemove An array of blocks that should be replaced.
     * @param blocksToInsert An array of partial blocks to replace the old ones with.
     */
    replaceBlocks(blocksToRemove: BlockIdentifier[], blocksToInsert: PartialBlock<BSchema>[]): void;
    /**
     * Gets the active text styles at the text cursor position or at the end of the current selection if it's active.
     */
    getActiveStyles(): Styles;
    /**
     * Adds styles to the currently selected content.
     * @param styles The styles to add.
     */
    addStyles(styles: Styles): void;
    /**
     * Removes styles from the currently selected content.
     * @param styles The styles to remove.
     */
    removeStyles(styles: Styles): void;
    /**
     * Toggles styles on the currently selected content.
     * @param styles The styles to toggle.
     */
    toggleStyles(styles: Styles): void;
    /**
     * Gets the currently selected text.
     */
    getSelectedText(): string;
    /**
     * Gets the URL of the last link in the current selection, or `undefined` if there are no links in the selection.
     */
    getSelectedLinkUrl(): string | undefined;
    /**
     * Creates a new link to replace the selected content.
     * @param url The link URL.
     * @param text The text to display the link with.
     */
    createLink(url: string, text?: string): void;
    /**
     * Checks if the block containing the text cursor can be nested.
     */
    canNestBlock(): boolean;
    /**
     * Nests the block containing the text cursor into the block above it.
     */
    nestBlock(): void;
    /**
     * Checks if the block containing the text cursor is nested.
     */
    canUnnestBlock(): boolean;
    /**
     * Lifts the block containing the text cursor out of its parent.
     */
    unnestBlock(): void;
    /**
     * Serializes blocks into an HTML string. To better conform to HTML standards, children of blocks which aren't list
     * items are un-nested in the output HTML.
     * @param blocks An array of blocks that should be serialized into HTML.
     * @returns The blocks, serialized as an HTML string.
     */
    blocksToHTML(blocks: Block<BSchema>[]): Promise<string>;
    /**
     * Parses blocks from an HTML string. Tries to create `Block` objects out of any HTML block-level elements, and
     * `InlineNode` objects from any HTML inline elements, though not all element types are recognized. If BlockNote
     * doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.
     * @param html The HTML string to parse blocks from.
     * @returns The blocks parsed from the HTML string.
     */
    HTMLToBlocks(html: string): Promise<Block<BSchema>[]>;
    /**
     * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
     * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
     * @param blocks An array of blocks that should be serialized into Markdown.
     * @returns The blocks, serialized as a Markdown string.
     */
    blocksToMarkdown(blocks: Block<BSchema>[]): Promise<string>;
    /**
     * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
     * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
     * as text.
     * @param markdown The Markdown string to parse blocks from.
     * @returns The blocks parsed from the Markdown string.
     */
    markdownToBlocks(markdown: string): Promise<Block<BSchema>[]>;
    /**
     * Updates the user info for the current user that's shown to other collaborators.
     */
    updateCollaborationUserInfo(user: {
        name: string;
        color: string;
    }): void;
}
