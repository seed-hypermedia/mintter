import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";
/**
 * A class that defines a slash command (/<command>).
 *
 * (Not to be confused with ProseMirror commands nor TipTap commands.)
 */
export declare class BaseSlashMenuItem<BSchema extends BlockSchema> extends SuggestionItem {
    readonly name: string;
    readonly execute: (editor: BlockNoteEditor<BSchema>) => void;
    readonly aliases: string[];
    /**
     * Constructs a new slash-command.
     *
     * @param name The name of the command
     * @param execute The callback for creating a new node
     * @param aliases Aliases for this command
     */
    constructor(name: string, execute: (editor: BlockNoteEditor<BSchema>) => void, aliases?: string[]);
}
